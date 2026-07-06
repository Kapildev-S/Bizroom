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

export async function fetchBillingStats(adminId: string) {
    if (adminId !== ADMIN_ID) throw new Error("Unauthorized");
    
    try {
        const usersRef = db.collection('users');
        const userDocs = await usersRef.listDocuments();

        let totalBills = 0;
        let liveBillsToday = 0;
        let totalValue = 0;
        let refunds = 0;
        let cancelledBills = 0;
        
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // This is a heavy operation for thousands of users. In a production scenario with large scale, 
        // we'd use a Cloud Function to keep a running total in a root document.
        const stats = await Promise.all(userDocs.map(async (userRef) => {
            const invoicesSnap = await userRef.collection('invoices')
                .select('totalAmount', 'status', 'issueDate')
                .get();
                
            let userBills = 0;
            let userValue = 0;
            let userLive = 0;
            let userCancel = 0;
            let userRefund = 0;

            invoicesSnap.forEach(doc => {
                const data = doc.data();
                userBills++;
                
                if (data.status === 'cancelled' || data.status === 'void') {
                    userCancel++;
                } else if (data.status === 'refunded') {
                    userRefund++;
                } else {
                    userValue += (data.totalAmount || 0);
                    
                    // Check if today
                    const d = data.issueDate;
                    let dateObj = null;
                    if (d?.toDate) dateObj = d.toDate();
                    else if (typeof d === 'string') dateObj = new Date(d);
                    
                    if (dateObj && dateObj >= startOfToday) {
                        userLive++;
                    }
                }
            });
            
            return { userBills, userValue, userLive, userCancel, userRefund };
        }));

        stats.forEach(s => {
            totalBills += s.userBills;
            totalValue += s.userValue;
            liveBillsToday += s.userLive;
            cancelledBills += s.userCancel;
            refunds += s.userRefund;
        });

        const avgBillValue = totalBills > 0 ? (totalValue / totalBills) : 0;

        return {
            totalBills,
            liveBillsToday,
            avgBillValue,
            refunds,
            cancelledBills,
            printerStatus: { online: 84, offline: 12 }, // Hardware status mock for now
            posDevices: { active: 142, inactive: 34 },
            topProducts: [
                { name: 'Standard Ticket', value: 4500 },
                { name: 'VIP Ticket', value: 2100 },
                { name: 'Service A', value: 1200 },
            ],
            paymentModes: [
                { name: 'UPI', value: 65 },
                { name: 'Cash', value: 20 },
                { name: 'Card', value: 15 },
            ]
        };
    } catch (e: any) {
        throw new Error(e.message);
    }
}
