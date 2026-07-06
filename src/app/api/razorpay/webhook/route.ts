import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb } from '@/lib/firebase-admin';

const db = getAdminDb();
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'your_webhook_secret_here';

export async function POST(req: Request) {
    try {
        const body = await req.text();
        const signature = req.headers.get('x-razorpay-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        // Verify webhook signature
        const expectedSignature = crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(body)
            .digest('hex');

        if (signature !== expectedSignature) {
            console.error('Webhook signature verification failed');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const payload = JSON.parse(body);
        const event = payload.event;

        console.log('Razorpay Webhook Event:', event);

        // Handle specific events
        if (event === 'subscription.activated' || event === 'subscription.charged') {
            const subscription = payload.payload.subscription.entity;
            const userId = subscription.notes?.userId;

            if (userId) {
                const eventType = event === 'subscription.activated' ? 'initial subscription' : 'renewal';
                console.log(`Processing ${eventType} for user: ${userId}`);

                const userSettingsRef = db.doc(`users/${userId}/settings/appSettings`);

                // Calculate new expiry (30 days from now)
                const newExpiry = new Date();
                newExpiry.setDate(newExpiry.getDate() + 30);

                const updateData: any = {
                    subscriptionStatus: 'premium',
                    premiumExpiry: newExpiry.toISOString(),
                    lastPaymentAt: new Date().toISOString(),
                };

                // Add payment ID if available
                if (payload.payload.payment?.entity?.id) {
                    updateData.lastPaymentId = payload.payload.payment.entity.id;
                }

                // Add subscription ID
                if (subscription.id) {
                    updateData.subscriptionId = subscription.id;
                }

                await userSettingsRef.set(updateData, { merge: true });

                // Update global premium subscriptions collection
                if (subscription.id) {
                    const globalSubRef = db.doc(`premium_subscriptions/${subscription.id}`);
                    await globalSubRef.set({
                        userId: userId,
                        subscriptionId: subscription.id,
                        status: 'active',
                        planId: subscription.plan_id || '',
                        premiumExpiry: newExpiry.toISOString(),
                        lastPaymentAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                }

                console.log(`✅ Successfully upgraded user ${userId} to premium until ${newExpiry.toISOString()}`);
                console.log(`Event: ${event}, Subscription ID: ${subscription.id}`);
            } else {
                console.warn(`⚠️ No userId found in subscription notes for event: ${event}`);
            }
        } else if (
            event === 'subscription.cancelled' ||
            event === 'subscription.halted' ||
            event === 'subscription.paused'
        ) {
            const subscription = payload.payload.subscription.entity;
            const userId = subscription.notes?.userId;

            if (userId) {
                console.log(`Processing subscription cutoff event (${event}) for user: ${userId}`);
                const userSettingsRef = db.doc(`users/${userId}/settings/appSettings`);

                const updateData: any = {
                    subscriptionStatus: 'basic',
                    premiumExpiry: new Date().toISOString(), // Expire immediately
                };

                await userSettingsRef.set(updateData, { merge: true });

                // Update global premium subscriptions collection
                if (subscription.id) {
                    const globalSubRef = db.doc(`premium_subscriptions/${subscription.id}`);
                    await globalSubRef.set({
                        status: event.replace('subscription.', ''),
                        updatedAt: new Date().toISOString()
                    }, { merge: true });
                }

                console.log(`❌ Successfully downgraded user ${userId} to basic due to ${event}`);
            } else {
                console.warn(`⚠️ No userId found in subscription notes for cutoff event: ${event}`);
            }
        }


        return NextResponse.json({ status: 'ok' });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
