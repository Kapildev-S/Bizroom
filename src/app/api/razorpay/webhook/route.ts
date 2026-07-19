import { NextResponse } from 'next/server';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { getAdminDb } from '@/lib/firebase-admin';
import { syncSubscriptionFromRazorpay } from '@/lib/subscriptionSync';

const db = getAdminDb();
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

const SUBSCRIPTION_EVENTS = new Set([
    'subscription.authenticated',
    'subscription.activated',
    'subscription.charged',
    'subscription.completed',
    'subscription.updated',
    'subscription.pending',
    'subscription.halted',
    'subscription.cancelled',
    'subscription.paused',
    'subscription.resumed',
]);

// Razorpay's webhook payload has no single global event id. Build a dedupe key from
// the most specific unique thing available so redeliveries of the same event are
// no-ops, while genuinely new events (a later renewal, a later state change) still process.
function buildDedupeKey(payload: any): string {
    const event = payload.event;
    const paymentId = payload.payload?.payment?.entity?.id;
    if (paymentId) return `payment_${paymentId}`;

    const subscription = payload.payload?.subscription?.entity;
    if (subscription?.id) {
        return `${event}_${subscription.id}_${subscription.status}_${payload.created_at}`;
    }

    const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
    return `${event}_${payload.created_at}_${hash}`;
}

export async function POST(req: Request) {
    try {
        const body = await req.text();
        const signature = req.headers.get('x-razorpay-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        if (!WEBHOOK_SECRET) {
            console.error('RAZORPAY_WEBHOOK_SECRET is not configured');
            return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
        }

        const isValid = Razorpay.validateWebhookSignature(body, signature, WEBHOOK_SECRET);
        if (!isValid) {
            console.error('Webhook signature verification failed');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const payload = JSON.parse(body);
        const event = payload.event;
        const dedupeKey = buildDedupeKey(payload);

        const ledgerRef = db.doc(`razorpay_webhook_events/${dedupeKey}`);
        const ledgerSnap = await ledgerRef.get();
        if (ledgerSnap.exists && ledgerSnap.data()?.status === 'processed') {
            console.log(`Skipping already-processed webhook event: ${dedupeKey}`);
            return NextResponse.json({ status: 'ok', deduped: true });
        }

        await ledgerRef.set(
            {
                event,
                status: 'received',
                receivedAt: new Date().toISOString(),
                payload,
            },
            { merge: true }
        );

        console.log('Razorpay Webhook Event:', event);

        if (SUBSCRIPTION_EVENTS.has(event)) {
            const subscription = payload.payload?.subscription?.entity;

            if (subscription?.id) {
                const result = await syncSubscriptionFromRazorpay(subscription.id, 'webhook');
                console.log(
                    `Synced subscription ${subscription.id} from event ${event}: status=${result.status}, isPremium=${result.isPremium}, user=${result.userId}`
                );
            } else {
                console.warn(`No subscription entity found in payload for event: ${event}`);
            }
        } else {
            console.log(`Unhandled event type (logged only): ${event}`);
        }

        await ledgerRef.set(
            { status: 'processed', processedAt: new Date().toISOString() },
            { merge: true }
        );

        return NextResponse.json({ status: 'ok' });
    } catch (error: any) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
