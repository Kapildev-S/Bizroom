import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

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
        if (event === 'subscription.charged') {
            const subscription = payload.payload.subscription.entity;
            const userId = subscription.notes?.userId;

            if (userId) {
                console.log(`Processing renewal for user: ${userId}`);

                const userSettingsRef = doc(db, `users/${userId}/settings`, "appSettings");

                // Calculate new expiry (30 days from now)
                const newExpiry = new Date();
                newExpiry.setDate(newExpiry.getDate() + 30);

                await setDoc(userSettingsRef, {
                    subscriptionStatus: 'premium',
                    premiumExpiry: newExpiry.toISOString(),
                    lastPaymentAt: new Date().toISOString(),
                    lastPaymentId: payload.payload.payment.entity.id
                }, { merge: true });

                console.log(`Successfully renewed subscription for ${userId} until ${newExpiry.toISOString()}`);
            }
        }

        return NextResponse.json({ status: 'ok' });

    } catch (error: any) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
