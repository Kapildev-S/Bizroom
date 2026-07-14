'use server';

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

export interface PublicRechargeRequest {
    id?: string;
    name: string;
    mobileNumber: string;
    operator: string;        // Jio | Airtel | Vi | BSNL
    amount: number;
    planData?: string;       // e.g. "2 GB/day"
    planValidity?: string;   // e.g. "28 days"
    planNote?: string;       // e.g. "JioHotstar"
    upiRef?: string;         // Payment reference / UTR
    status: 'pending' | 'processing' | 'completed' | 'rejected';
    adminNote?: string;
    submittedAt: string;
    processedAt?: string;
}

// PUBLIC: No auth required — anyone can submit a recharge request
export async function submitPublicRechargeRequest(
    data: Omit<PublicRechargeRequest, 'id' | 'status' | 'submittedAt'>
): Promise<{ success: boolean; requestId?: string; error?: string }> {
    try {
        // Basic validation
        if (!data.name || !data.mobileNumber || !data.operator || !data.amount) {
            return { success: false, error: 'All required fields must be filled.' };
        }
        if (data.mobileNumber.length !== 10 || !/^\d+$/.test(data.mobileNumber)) {
            return { success: false, error: 'Please enter a valid 10-digit mobile number.' };
        }
        if (data.amount < 10) {
            return { success: false, error: 'Amount must be at least ₹10.' };
        }

        const docRef = await db.collection('recharge_requests').add({
            ...data,
            status: 'pending',
            submittedAt: new Date().toISOString(),
        });

        return { success: true, requestId: docRef.id };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ADMIN: Get all recharge requests
export async function getRechargeRequests(adminId: string): Promise<PublicRechargeRequest[]> {
    if (adminId !== ADMIN_ID) throw new Error('Unauthorized');

    const snap = await db.collection('recharge_requests')
        .orderBy('submittedAt', 'desc')
        .get();

    return snap.docs.map(doc => ({
        ...(doc.data() as PublicRechargeRequest),
        id: doc.id,
    }));
}

// ADMIN: Update status of a request
export async function updateRechargeRequestStatus(
    adminId: string,
    requestId: string,
    status: PublicRechargeRequest['status'],
    adminNote?: string
): Promise<{ success: boolean; error?: string }> {
    if (adminId !== ADMIN_ID) return { success: false, error: 'Unauthorized' };

    try {
        const updates: any = {
            status,
            processedAt: new Date().toISOString(),
        };
        if (adminNote !== undefined) updates.adminNote = adminNote;

        await db.collection('recharge_requests').doc(requestId).update(updates);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ADMIN: Delete a request
export async function deleteRechargeRequest(
    adminId: string,
    requestId: string
): Promise<{ success: boolean; error?: string }> {
    if (adminId !== ADMIN_ID) return { success: false, error: 'Unauthorized' };

    try {
        await db.collection('recharge_requests').doc(requestId).delete();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ADMIN: Get pending request count (for badge)
export async function getPendingRechargeCount(adminId: string): Promise<number> {
    if (adminId !== ADMIN_ID) return 0;
    const snap = await db.collection('recharge_requests').where('status', '==', 'pending').get();
    return snap.size;
}
