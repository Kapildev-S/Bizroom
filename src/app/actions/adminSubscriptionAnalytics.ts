"use server";

import * as admin from 'firebase-admin';

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
const ADMIN_ID = '3l2SpTceF9Qany7x5IRHdHBPU9J3';

export async function fetchSubscriptionAnalytics(adminId: string) {
    if (adminId !== ADMIN_ID) throw new Error("Unauthorized");
    
    try {
        const subsRef = db.collection('premium_subscriptions');
        const snap = await subsRef.get();
        
        let activeCount = 0;
        let monthlyIncome = 0;
        let failedPayments = 0;
        let renewals = 0;
        let refunds = 0;
        
        // This is a naive aggregation for demonstration.
        // In reality, this would require querying payment history logs.
        snap.forEach(doc => {
            const data = doc.data();
            if (data.status === 'active') activeCount++;
            if (data.status === 'failed') failedPayments++;
            
            // Assume planId 'premium' implies 299/month (rough mock logic)
            if (data.status === 'active' && data.planId === 'premium') {
                monthlyIncome += 299;
            }
        });
        
        return {
            activeSubscribers: activeCount,
            monthlyIncome: monthlyIncome,
            failedPayments: failedPayments,
            renewals: renewals,
            refunds: refunds
        };
    } catch (e: any) {
        throw new Error(e.message);
    }
}
