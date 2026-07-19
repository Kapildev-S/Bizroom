import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { getAdminDb } from "@/lib/firebase-admin";
import { syncSubscriptionFromRazorpay } from "@/lib/subscriptionSync";

const CRON_SECRET = process.env.CRON_SECRET || "";

// Admin-granted subscriptions have no corresponding Razorpay object - nothing to reconcile.
function isManualGrant(id: string): boolean {
    return id.startsWith("manual_");
}

/**
 * The reconciliation job. Firestore should never permanently drift from Razorpay's
 * actual state, even if a webhook delivery is lost entirely. Two passes:
 *
 * Pass A repairs subscriptions Firestore already knows about (webhook fired but the
 * write failed, a cancellation was missed, a renewal charge was missed, etc).
 *
 * Pass B discovers subscriptions Firestore has NO record of at all - the worst case,
 * where the very first webhook for a new subscription never arrived - by paging
 * through Razorpay's full subscription list for the account.
 */
export async function POST(req: Request) {
    return handleReconcile(req);
}

export async function GET(req: Request) {
    return handleReconcile(req);
}

async function handleReconcile(req: Request) {
    const providedSecret = req.headers.get("x-cron-secret");
    if (!CRON_SECRET || providedSecret !== CRON_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getAdminDb();
    const runId = new Date().toISOString();
    let checked = 0;
    let corrected = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Pass A - repair subscriptions Firestore already knows about.
    const knownSnap = await db.collection("premium_subscriptions").get();
    const knownIds = new Set<string>();

    for (const doc of knownSnap.docs) {
        knownIds.add(doc.id);
        if (isManualGrant(doc.id)) continue;

        checked++;
        try {
            const result = await syncSubscriptionFromRazorpay(doc.id, "reconciliation");
            if (result.changed) corrected++;
        } catch (error: any) {
            console.error(`Reconciliation failed for subscription ${doc.id}:`, error);
            errors.push({ id: doc.id, error: error.message || String(error) });
        }
    }

    // Pass B - discover subscriptions Firestore has no record of at all, by paging
    // through the full account subscription list.
    let skip = 0;
    const pageSize = 100;
    let hasMore = true;

    while (hasMore) {
        const page = await razorpay.subscriptions.all({ count: pageSize, skip });
        const items = page.items || [];

        for (const subscription of items) {
            if (knownIds.has(subscription.id)) continue;
            if (!subscription.notes?.userId) continue; // not one of ours

            checked++;
            try {
                const result = await syncSubscriptionFromRazorpay(subscription.id, "reconciliation");
                corrected++;
                knownIds.add(subscription.id);
                console.log(`Discovered previously-unknown subscription ${subscription.id} for user ${result.userId}`);
            } catch (error: any) {
                console.error(`Reconciliation failed for discovered subscription ${subscription.id}:`, error);
                errors.push({ id: subscription.id, error: error.message || String(error) });
            }
        }

        hasMore = items.length === pageSize;
        skip += pageSize;
    }

    await db.doc(`subscription_reconciliation_runs/${runId}`).set({
        runId,
        checked,
        corrected,
        errorCount: errors.length,
        errors: errors.slice(0, 50),
        completedAt: new Date().toISOString(),
    });

    return NextResponse.json({ runId, checked, corrected, errorCount: errors.length });
}
