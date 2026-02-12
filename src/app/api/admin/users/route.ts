import { NextResponse } from 'next/server';
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

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const adminId = searchParams.get('adminId');

        // Only allow the specified admin user
        if (adminId !== '3l2SpTceF9Qany7x5IRHdHBPU9J3') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const usersRef = db.collection('users');
        const userDocs = await usersRef.listDocuments();

        const userData = await Promise.all(userDocs.map(async (userRef) => {
            const userId = userRef.id;

            // Fetch settings
            const settingsDoc = await userRef.collection('settings').doc('appSettings').get();
            const settings = settingsDoc.exists ? settingsDoc.data() : {};

            // Fetch invoice stats and product data
            const invoicesSnap = await userRef.collection('invoices').get();
            const totalInvoices = invoicesSnap.size;

            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            const calculateForItems = (docs: admin.firestore.QueryDocumentSnapshot[]) => {
                let billValue = 0;
                let count = 0;
                const productStats: Record<string, { quantity: number; revenue: number }> = {};

                docs.forEach(doc => {
                    const data = doc.data();
                    if (data.status !== 'void') {
                        billValue += (data.totalAmount || 0);
                        count++;
                        if (data.items && Array.isArray(data.items)) {
                            data.items.forEach((item: any) => {
                                const name = item.productName || 'Unknown Product';
                                if (!productStats[name]) {
                                    productStats[name] = { quantity: 0, revenue: 0 };
                                }
                                productStats[name].quantity += (item.quantity || 0);
                                productStats[name].revenue += (item.totalPrice || 0);
                            });
                        }
                    }
                });

                const topProducts = Object.entries(productStats)
                    .map(([name, stats]) => ({ name, ...stats }))
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 5);

                return { billValue, count, topProducts };
            };

            const allDocs = invoicesSnap.docs;
            const weeklyDocs = allDocs.filter(doc => {
                const issueDate = doc.data().issueDate;
                if (!issueDate) return false;
                const date = (issueDate as admin.firestore.Timestamp).toDate();
                return date >= sevenDaysAgo;
            });
            const monthlyDocs = allDocs.filter(doc => {
                const issueDate = doc.data().issueDate;
                if (!issueDate) return false;
                const date = (issueDate as admin.firestore.Timestamp).toDate();
                return date >= thirtyDaysAgo;
            });

            const overall = calculateForItems(allDocs);
            const weekly = calculateForItems(weeklyDocs);
            const monthly = calculateForItems(monthlyDocs);

            const business = settings?.businessProfile || {};

            return {
                userId,
                businessName: business.businessName || 'Unnamed Business',
                ownerEmail: business.email || 'N/A',
                phone: business.phone || 'N/A',
                subscriptionStatus: settings?.subscriptionStatus || 'basic',
                currency: settings?.invoiceSettings?.currency || 'INR',
                stats: {
                    overall,
                    weekly,
                    monthly
                }
            };
        }));

        return NextResponse.json({ users: userData });

    } catch (error: any) {
        console.error('Error fetching admin data:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
