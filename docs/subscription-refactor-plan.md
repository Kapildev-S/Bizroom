# BizRoom Subscription System — Failure Modes & Refactor Plan

_Written 2026-09-03. No code changed yet — this is the plan of record._

## TL;DR

The subscription system is hard to maintain because there is **no single source of truth**
and the "is this user premium?" decision is re-implemented in six places with slightly
different logic. Razorpay integration itself is fine. The fix is to collapse to one stored
fact per user, one function that reads it, and one function that writes it.

---

## Part 1 — Current architecture (as built)

### Data stores

| Location | Written by | Read by | Purpose |
|---|---|---|---|
| `premium_subscriptions/{razorpaySubId}` | `syncSubscriptionFromRazorpay`, manual scripts, `adminGrantPremium` | reconciliation cron, analytics | Per-subscription mirror of Razorpay state |
| `premium_subscriptions/manual_{uid}` | `adminGrantPremium`, 2 of the root scripts | same | Manual grants (no Razorpay object) |
| `users/{uid}/settings/appSettings` | `syncSubscriptionFromRazorpay`, all 4 root scripts, `adminGrantPremium`/`adminRevokePremium`, **and the user's own client** (for non-billing prefs) | `useSubscription`, `SidebarNav`, `SubscriptionGate`, `AdminDashboard`, `adminDashboardActions` | Mixes user preferences + billing entitlement in one doc |
| `razorpay_webhook_events/{dedupeKey}` | webhook route | webhook route (dedupe) | Idempotency ledger |
| `subscription_reconciliation_runs/{iso}` | reconciliation cron | nobody | Run log |

### Write paths (5 ways a user becomes premium)

1. `POST /api/razorpay/webhook` → `syncSubscriptionFromRazorpay(subId, 'webhook')`
2. `POST /api/razorpay/verify-payment` → `syncSubscriptionFromRazorpay(subId, 'verify-endpoint')` (fast-path UX)
3. `GET/POST /api/cron/reconcile-subscriptions` → `syncSubscriptionFromRazorpay(subId, 'reconciliation')`
4. `adminGrantPremium` / `adminRevokePremium` server actions (admin UI)
5. Root scripts: `make_premium.js`, `make-user-premium.ts`, `upgrade-user-admin.js`

Paths 1–3 funnel through `syncSubscriptionFromRazorpay` (good). Paths 4–5 do not and
write a different field set.

### Read paths (6 re-derivations of "isPremium")

| Where | Logic |
|---|---|
| `src/lib/hooks/useSubscription.ts:11-17` | `subscriptionStatus === 'premium' && !(expiry && now > expiry)` |
| `src/components/layout/SidebarNav.tsx:330-336` | re-derives inline; `isExpired` only set when `isPremiumStatus` is true |
| `src/components/layout/SubscriptionGate.tsx` | uses the hook — **but this component is imported nowhere (dead code)** |
| `src/lib/subscriptionSync.ts:6,44` | `PREMIUM_STATUSES = {authenticated, active}` + expiry check (server truth) |
| `src/app/admin/legacy/AdminDashboard.tsx:835-836` | `subscriptionStatus === 'premium'`, `premiumExpiry < now` |
| `src/app/actions/adminSubscriptionAnalytics.ts:40` | `status === 'active' && planId === 'premium'` |

---

## Part 2 — Failure modes (why it breaks)

### F1 — Two stores kept in sync by hand-written fan-in
`syncSubscriptionFromRazorpay` (`src/lib/subscriptionSync.ts:71-112`) must collapse
_N_ `premium_subscriptions` docs + manual grants into the single `appSettings`
entitlement. The "don't demote a premium user if another sub / manual grant is still
active" branch (`:77-101`, added in commit `7e04ccab`) is a patch on top of that
collapse. Each new scenario (refund, plan switch, dispute) needs another special case
in this one function. There is no place that just says "this user's access expires on
date X".

### F2 — Six read derivations drift
Any change to the premium rule (e.g. a grace period) must be edited in 6 places.
Today they already disagree:
- `SidebarNav.tsx:332` — `isExpired` is `isPremiumStatus && expiryDate && now > expiryDate`, so a non-premium user is never "expired", while `useSubscription.ts:15` computes `isExpired` independent of status.
- `AdminDashboard.tsx:852` renders an "expired & premium" state that the hook would just call "not premium".

### F3 — No server-side enforcement
`firestore.rules:32-36`: any authenticated user has full read/write on their own
`users/{uid}/**`. Premium gating is entirely the sidebar hiding a link and showing a
toast (`SidebarNav.tsx:237-259`). A non-premium user reaches every premium feature by
typing the URL or calling Firestore directly. **Maintaining the subscription system
currently provides zero access control** — it is cosmetic UX only.

### F4 — Billing data lives in a public, user-writable doc
`appSettings` holds both prefs and billing. Consequences:
- `firestore.rules:22` — `allow read: if true`. Subscription status, expiry, payment IDs are world-readable.
- The `touchesBillingFields()` denylist (`firestore.rules:10-15`) is the only thing stopping a user from setting their own `subscriptionStatus: 'premium'`. It's a hardcoded field-name list that must be kept in sync with every writer. Miss a field name → privilege escalation.

### F5 — Manual-grant sprawl
`make_premium.js` (30-day, no `premium_subscriptions` doc, writes `premiumSince`),
`make-user-premium.ts` (1-year, client SDK, **checked-in API key**, writes the sub doc),
`upgrade-user-admin.js` (1-year, admin SDK, writes the sub doc + `premiumSince`),
`adminGrantPremium` (365-day default, writes `lastPaymentId: manual_admin_*`).
Four+ different shapes for the same operation. All three scripts hardcode UID
`lPPYtQ7ghnXYON6Saqox0kri7DG3`. All three are currently modified in the working tree.

### F6 — Reconciliation does not scale
`src/app/api/cron/reconcile-subscriptions/route.ts`:
- Pass A: one `razorpay.subscriptions.fetch()` + one `premium_subscriptions` collection query **per known subscription**, every 15 minutes (`.github/workflows/reconcile-subscriptions.yml`).
- Pass B: pages the **entire Razorpay account** (`subscriptions.all`) every run.
- At ~10 subs this is invisible; at a few hundred it will hit Razorpay rate limits and the GitHub Action's time budget.
- `route.ts:79` — `corrected++` is unconditional in Pass B, so the "corrected" metric is always inflated by the number of discovered subs.

### F7 — Plan-type resolution is fragile
`resolvePlanType` (`src/lib/subscriptionSync.ts:9-15`) compares `plan_id` against
`RAZORPAY_PLAN_ID_MONTHLY/QUARTERLY/YEARLY` env vars. If those don't exactly match the
dashboard (per environment), every subscription stores `planType: 'unknown'`.

### F8 — Analytics reads a value that is never written
`adminSubscriptionAnalytics.ts:40` sums revenue only when `planId === 'premium'`.
No code ever writes `planId: 'premium'` (real values are Razorpay plan IDs or
`manual_admin_grant` / `manual_yearly`). So **Monthly Income, Renewals, and Refunds on
the Subscription Management page are always 0 / near-garbage.**

### F9 — Subscriptions silently end after `total_count`
`src/app/api/razorpay/subscription/route.ts:23-33` sets `total_count` to "5 years" of
cycles. When it's reached the subscription completes and the user drops to basic with
no renewal handling and no operator alert. `subscription.completed` is in
`SUBSCRIPTION_EVENTS` but only triggers a re-sync, which will correctly mark them
not-premium — quietly.

### F10 — Module-load side effects
`src/app/api/razorpay/webhook/route.ts:7` — `const db = getAdminDb()` at module top
level. If admin credentials are missing/malformed this throws at import time (whole
route 500s) instead of per-request with a clear error. Same pattern differs across
files: `billing-router.ts` guards with `admin.apps.length ? ... : null`.

### F11 — Admin identity hardcoded ~20 places
UID `3l2SpTceF9Qany7x5IRHdHBPU9J3` is inlined in `firestore.rules` and a dozen server
actions; `firebase-admin.ts` exports `ADMIN_UID`; some files define a local `ADMIN_ID`
constant instead. Not subscription-specific, but it's the same "no single definition"
disease and it touches `adminGrantPremium`/`adminRevokePremium`/`adminSubscriptionAnalytics`.

---

## Part 3 — Target architecture

### One stored fact per user

New doc `users/{uid}/billing/current` — **server-write-only**:

```
{
  tier: 'free' | 'premium',
  validUntil: string | null,      // ISO; null = no expiry (lifetime manual grant)
  source: 'razorpay' | 'manual',
  activeSubscriptionId: string | null,  // razorpay sub id or manual_{uid}
  updatedAt: string,
  updatedBy: 'webhook' | 'verify-endpoint' | 'reconciliation' | 'admin'
}
```

`premium_subscriptions/{id}` stays exactly as-is — it's the raw per-subscription
Razorpay mirror and the audit trail. It just stops being something the UI reads.
`appSettings` goes back to being preferences only.

### One reader

`src/lib/entitlements.ts`:

```ts
export type Entitlement = { tier: 'free' | 'premium'; isPremium: boolean; isExpired: boolean; validUntil: Date | null };
export function resolveEntitlement(billing: BillingDoc | null): Entitlement { /* the only copy of this logic */ }
```

Consumed by: `useSubscription` (thin wrapper over a `users/{uid}/billing/current`
subscription), `SidebarNav`, `AdminDashboard`, and server code. Delete the other five
derivations. Decide `SubscriptionGate`: wire it into the authenticated layout as the
real gate, or delete it.

### One writer

`src/lib/billing/applyBillingState.ts`:

```ts
applyBillingState({ uid, tier, validUntil, source, activeSubscriptionId, updatedBy })
```

- `syncSubscriptionFromRazorpay` computes tier/validUntil from the Razorpay fetch, then calls it.
- `adminGrantPremium` / `adminRevokePremium` call it directly.
- Root scripts are deleted; grants happen from the admin UI.

### Rules

```
match /users/{uid}/billing/{doc} {
  allow read: if request.auth.uid == uid;
  allow write: if false;   // Admin SDK only
}
```

Then remove `touchesBillingFields()` and the billing keys from `appSettings`, and
change `appSettings` read from `if true` to `if request.auth.uid == userId`.

**Optional real enforcement** — gate premium collections on the billing doc:

```
function isPremium(uid) {
  let b = get(/databases/$(database)/documents/users/$(uid)/billing/current).data;
  return b.tier == 'premium' && (b.validUntil == null || request.time < timestamp.value(b.validUntil));
}
```

Costs 1 document read per rule evaluation on gated paths. Only worth it if you want
the subscription to actually restrict access rather than just hide UI.

### Reconciliation

- Pass A (repair known subs): keep at 15 min.
- Pass B (full account scan): move to a weekly cron **or** an admin-triggered button. It's a safety net for a lost first-webhook, not a per-cycle need.
- Fix the `corrected` metric: only increment when `result.changed`.

### Analytics

Either compute revenue from real `planType` values + a price map, or delete the
Monthly Income / Renewals / Refunds cards until there's a payments ledger to back them.

---

## Part 4 — Migration steps (ordered by risk, lowest first)

### Step 0 — Safety net
- [ ] Export `premium_subscriptions` and every `users/*/settings/appSettings` to a dated backup (script or Firestore export).
- [ ] Confirm the reconciliation cron is green so Razorpay → Firestore repair works before and after.

### Step 1 — Reader consolidation (no data change, no payment-path change)
- [ ] Add `src/lib/entitlements.ts` with `resolveEntitlement()`, matching today's `useSubscription` logic exactly.
- [ ] Rewrite `useSubscription` to call it.
- [ ] Replace the inline derivation in `SidebarNav.tsx:330-336` with the hook / `resolveEntitlement`.
- [ ] Replace the derivation in `AdminDashboard.tsx:835-836`.
- [ ] Delete `SubscriptionGate.tsx` **or** mount it in the authenticated layout. Decide now.
- [ ] Manual test: premium user, expired user, free user, admin view — all unchanged.

### Step 2 — Kill the script sprawl (no data change)
- [ ] Verify `adminGrantPremium` / `adminRevokePremium` cover every case the scripts were used for (duration options, revoke).
- [ ] Add duration presets to the admin grant UI if missing (30d / 1y / lifetime).
- [ ] `git rm make_premium.js make-user-premium.ts upgrade-user-admin.js make-premium.ts`.
- [ ] Rotate the Firebase web API key that was checked into `make-user-premium.ts` if it's still live.

### Step 3 — Fix the visible bugs (small, isolated)
- [ ] `reconcile-subscriptions/route.ts` — only `corrected++` when `result.changed` in Pass B.
- [ ] `adminSubscriptionAnalytics.ts` — compute income from `planType` + price map, or hide the fake cards.
- [ ] `resolvePlanType` — log a warning when it falls through to `'unknown'` so env drift is visible.
- [ ] `webhook/route.ts` — move `getAdminDb()` inside the handler.

### Step 4 — Introduce the new billing doc (additive, dual-write)
- [ ] Add `applyBillingState()`. Have `syncSubscriptionFromRazorpay` and the admin actions write **both** the old `appSettings` fields **and** `users/{uid}/billing/current`.
- [ ] Backfill script: for every user, derive `{tier, validUntil, source, activeSubscriptionId}` from existing `premium_subscriptions` + `appSettings` and write `billing/current`.
- [ ] Add `users/{uid}/billing` rules (read-owner / write-false).
- [ ] Leave readers on the old fields for now. Deploy. Let it bake for one renewal cycle.

### Step 5 — Cut readers over
- [ ] Point `resolveEntitlement` / `useSubscription` at `users/{uid}/billing/current`.
- [ ] Point `AdminDashboard` and `adminDashboardActions` at it.
- [ ] Manual + spot-check against Razorpay dashboard for a sample of live users.

### Step 6 — Stop dual-writing, tighten rules
- [ ] Remove billing-field writes to `appSettings` from all writers.
- [ ] Remove `touchesBillingFields()` from `firestore.rules`.
- [ ] Change `appSettings` read rule from `if true` to owner-only.
- [ ] (Optional) add `isPremium(uid)` rule enforcement to premium collections.
- [ ] Deploy. Old `appSettings` billing fields can be left as dead data or cleaned in a later pass.

### Step 7 — Reconciliation + lifecycle
- [ ] Split Pass B to weekly / admin button.
- [ ] Add an operator alert (email / admin notification) on `subscription.halted`, `subscription.cancelled`, and when a sub nears `total_count`.
- [ ] Consider dropping `total_count` to let subscriptions run indefinitely (Razorpay supports omitting it for some plan types) — removes F9 entirely.

---

## Part 5 — What NOT to do

- Don't rewrite the Razorpay webhook/verify/reconcile trio — the funnel-through-one-sync-function design is correct.
- Don't move to a third-party billing service for a single ₹299 plan; the surface area isn't the problem, the duplication is.
- Don't add enforcement rules (Step 6 optional) until readers are stable on the new doc — a bad rule locks out paying users.
- Don't skip the dual-write bake period (Step 4→5). A direct cutover has no rollback.

---

## Appendix — File reference

| Concern | File |
|---|---|
| Core sync logic | `src/lib/subscriptionSync.ts` |
| Webhook | `src/app/api/razorpay/webhook/route.ts` |
| Fast-path verify | `src/app/api/razorpay/verify-payment/route.ts` |
| Subscription create | `src/app/api/razorpay/subscription/route.ts` |
| Reconciliation cron | `src/app/api/cron/reconcile-subscriptions/route.ts` |
| Cron schedule | `.github/workflows/reconcile-subscriptions.yml` |
| Client hook | `src/lib/hooks/useSubscription.ts` |
| Settings fetch | `src/lib/hooks/useData.ts` (`useSettings`) |
| Dead gate component | `src/components/layout/SubscriptionGate.tsx` |
| Sidebar lock UX | `src/components/layout/SidebarNav.tsx` |
| Admin grant/revoke | `src/app/actions/adminSubscriptionActions.ts` |
| Admin analytics (broken) | `src/app/actions/adminSubscriptionAnalytics.ts` |
| Admin dashboard UI | `src/app/admin/legacy/AdminDashboard.tsx` |
| Firestore rules | `firestore.rules` |
| Manual scripts (to delete) | `make_premium.js`, `make-user-premium.ts`, `upgrade-user-admin.js` |
