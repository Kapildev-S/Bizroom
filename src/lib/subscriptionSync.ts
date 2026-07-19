import { razorpay } from '@/lib/razorpay';
import { getAdminDb } from '@/lib/firebase-admin';

export type SyncSource = 'webhook' | 'reconciliation' | 'verify-endpoint';

const PREMIUM_STATUSES = new Set(['authenticated', 'active']);

// Maps a Razorpay plan id (env-configured) to the plan "type" we show in the UI/admin analytics.
function resolvePlanType(planId: string | undefined): string {
    if (!planId) return 'unknown';
    if (planId === process.env.RAZORPAY_PLAN_ID_MONTHLY) return 'Monthly';
    if (planId === process.env.RAZORPAY_PLAN_ID_QUARTERLY) return '3 Months';
    if (planId === process.env.RAZORPAY_PLAN_ID_YEARLY) return 'Yearly';
    return 'unknown';
}

export interface SyncResult {
    userId: string | null;
    razorpaySubscriptionId: string;
    status: string;
    isPremium: boolean;
    changed: boolean;
}

/**
 * The single place that decides what a subscription's premium state is.
 * Always re-fetches the subscription from Razorpay's API - never trusts a webhook
 * payload or client-supplied data for the actual decision. Every caller (webhook,
 * verify-payment endpoint, reconciliation cron) funnels through here so there is
 * exactly one code path that writes subscription state to Firestore.
 */
export async function syncSubscriptionFromRazorpay(
    razorpaySubscriptionId: string,
    source: SyncSource
): Promise<SyncResult> {
    const db = getAdminDb();

    const subscription = await razorpay.subscriptions.fetch(razorpaySubscriptionId);
    const userId = (subscription.notes?.userId as string | undefined) ?? null;

    const status = subscription.status;
    const currentEnd = subscription.current_end ? new Date(subscription.current_end * 1000) : null;
    const currentStart = subscription.current_start ? new Date(subscription.current_start * 1000) : null;
    const isPremium = PREMIUM_STATUSES.has(status) && (!currentEnd || currentEnd.getTime() > Date.now());

    const subRef = db.doc(`premium_subscriptions/${razorpaySubscriptionId}`);
    const existingSnap = await subRef.get();
    const existing = existingSnap.exists ? existingSnap.data() : null;
    const changed = !existing || existing.status !== status || existing.premiumExpiry !== (currentEnd?.toISOString() ?? null);

    const subscriptionRecord: Record<string, unknown> = {
        userId,
        subscriptionId: razorpaySubscriptionId,
        status,
        isPremium,
        planId: subscription.plan_id ?? '',
        planType: resolvePlanType(subscription.plan_id),
        currentPeriodStart: currentStart ? currentStart.toISOString() : null,
        currentPeriodEnd: currentEnd ? currentEnd.toISOString() : null,
        premiumExpiry: currentEnd ? currentEnd.toISOString() : null,
        lastVerifiedAt: new Date().toISOString(),
        lastSyncSource: source,
        updatedAt: new Date().toISOString(),
    };
    if (!existing) {
        subscriptionRecord.createdAt = new Date().toISOString();
    }

    await subRef.set(subscriptionRecord, { merge: true });

    if (userId) {
        const userSettingsRef = db.doc(`users/${userId}/settings/appSettings`);
        await userSettingsRef.set(
            {
                subscriptionStatus: isPremium ? 'premium' : 'basic',
                premiumExpiry: currentEnd ? currentEnd.toISOString() : new Date().toISOString(),
                subscriptionId: razorpaySubscriptionId,
                lastSyncedAt: new Date().toISOString(),
            },
            { merge: true }
        );
    }

    return { userId, razorpaySubscriptionId, status, isPremium, changed };
}

/** Creates the initial Firestore stub for a subscription right after it's created via our API - before any payment has happened. Gives reconciliation something to check even if the very first webhook is never delivered. */
export async function createPendingSubscriptionStub(params: {
    razorpaySubscriptionId: string;
    userId: string;
    planId: string;
    planType: string;
}): Promise<void> {
    const db = getAdminDb();
    const subRef = db.doc(`premium_subscriptions/${params.razorpaySubscriptionId}`);
    await subRef.set(
        {
            userId: params.userId,
            subscriptionId: params.razorpaySubscriptionId,
            status: 'created',
            isPremium: false,
            planId: params.planId,
            planType: params.planType,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastSyncSource: 'subscription-create',
        },
        { merge: true }
    );
}
