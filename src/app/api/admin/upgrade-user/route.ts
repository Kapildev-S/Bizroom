import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: 'bill-7362b',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        }),
    });
}

const db = admin.firestore();

export async function POST(req: Request) {
    try {
        const { userId, status, premiumDuration, adminId } = await req.json();

        if (adminId !== '3l2SpTceF9Qany7x5IRHdHBPU9J3') {
            return NextResponse.json({ error: 'Unauthorized admin' }, { status: 403 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const userSettingsRef = db.doc(`users/${userId}/settings/appSettings`);

        if (status === 'premium') {
            // Set expiry based on duration or default 1 year
            const premiumExpiry = new Date();
            if (premiumDuration) {
                premiumExpiry.setDate(premiumExpiry.getDate() + parseInt(premiumDuration));
            } else {
                premiumExpiry.setFullYear(premiumExpiry.getFullYear() + 1);
            }

            await userSettingsRef.set({
                subscriptionStatus: 'premium',
                premiumSince: new Date().toISOString(),
                premiumExpiry: premiumExpiry.toISOString(),
                lastPaymentAt: new Date().toISOString(),
                lastPaymentId: 'admin_manual_toggle',
            }, { merge: true });

            return NextResponse.json({
                success: true,
                message: `User ${userId} upgraded to premium`,
                premiumExpiry: premiumExpiry.toISOString()
            });
        } else {
            // Downgrade to basic
            await userSettingsRef.set({
                subscriptionStatus: 'basic',
                // We keep premiumSince/Expiry but status is basic
            }, { merge: true });

            return NextResponse.json({
                success: true,
                message: `User ${userId} downgraded to basic`
            });
        }

    } catch (error: any) {
        console.error('Error updating user status:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
