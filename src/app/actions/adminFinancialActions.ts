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

export async function fetchFinancialStats(adminId: string) {
    if (adminId !== ADMIN_ID) throw new Error("Unauthorized");
    
    try {
        // Aggregate financials across the platform
        const usersRef = db.collection('users');
        const userDocs = await usersRef.listDocuments();

        let totalRevenue = 0;
        let totalExpenses = 0;
        let totalCommission = 0;
        let totalGST = 0;
        let totalWallet = 0;

        const stats = await Promise.all(userDocs.map(async (userRef) => {
            const invoicesSnap = await userRef.collection('invoices').select('totalAmount', 'taxAmount', 'status').get();
            const expensesSnap = await userRef.collection('expenses').select('amount', 'status').get().catch(() => ({ docs: [] })); // Catch if doesn't exist
            const settingsSnap = await userRef.collection('settings').doc('appSettings').get();
            
            let uRev = 0;
            let uTax = 0;
            invoicesSnap.forEach(d => {
                if(d.data().status !== 'cancelled' && d.data().status !== 'void') {
                    uRev += (d.data().totalAmount || 0);
                    uTax += (d.data().taxAmount || 0);
                }
            });

            let uExp = 0;
            // @ts-ignore
            expensesSnap.docs?.forEach(d => {
                uExp += (d.data().amount || 0);
            });

            let uWallet = settingsSnap.data()?.walletBalance || 0;

            return { uRev, uTax, uExp, uWallet };
        }));

        stats.forEach(s => {
            totalRevenue += s.uRev;
            totalGST += s.uTax;
            totalExpenses += s.uExp;
            totalWallet += s.uWallet;
        });

        // We assume platform commission is a 2% cut of all revenue for demo purposes, or from a config
        totalCommission = totalRevenue * 0.02;

        return {
            revenue: totalRevenue,
            expenses: totalExpenses,
            commission: totalCommission,
            gst: totalGST,
            subscriptionIncome: 145000, // Hardcoded mock for now, would pull from Razorpay webhook logs
            wallet: totalWallet,
            payouts: 45000, 
            refunds: 12500,
            chartData: [
                { name: 'Jan', revenue: 4000, profit: 2400 },
                { name: 'Feb', revenue: 3000, profit: 1398 },
                { name: 'Mar', revenue: 2000, profit: 9800 },
                { name: 'Apr', revenue: 2780, profit: 3908 },
                { name: 'May', revenue: 1890, profit: 4800 },
                { name: 'Jun', revenue: 2390, profit: 3800 },
            ]
        };
    } catch (e: any) {
        throw new Error(e.message);
    }
}
