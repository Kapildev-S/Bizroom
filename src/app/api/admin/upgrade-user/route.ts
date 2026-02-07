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
        const { userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        const userSettingsRef = db.doc(`users/${userId}/settings/appSettings`);

        // Set expiry to 1 year from now
        const premiumExpiry = new Date();
        premiumExpiry.setFullYear(premiumExpiry.getFullYear() + 1);

        await userSettingsRef.set({
            subscriptionStatus: 'premium',
            premiumExpiry: premiumExpiry.toISOString(),
            lastPaymentAt: new Date().toISOString(),
            lastPaymentId: 'manual_upgrade',
        }, { merge: true });

        console.log(`✅ Successfully upgraded user ${userId} to premium`);
        console.log(`Premium expiry: ${premiumExpiry.toISOString()}`);

        return NextResponse.json({
            success: true,
            message: `User ${userId} upgraded to premium`,
            premiumExpiry: premiumExpiry.toISOString()
        });

    } catch (error: any) {
        console.error('Error upgrading user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
