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

// ─── STAFF ACTIONS (any logged-in user) ─────────────────────────────────────

export async function staffGetRechargeRecords(userId: string): Promise<RechargeRecord[]> {
    if (!userId) throw new Error('Not authenticated');

    const snap = await db.collection('recharge_records')
        .orderBy('createdAt', 'desc')
        .limit(200)
        .get();

    return snap.docs.map(doc => {
        const data = doc.data() as RechargeRecord;
        return {
            ...data,
            id: doc.id,
            daysRemaining: calcDaysRemaining(data.nextRechargeDate),
        };
    });
}

export async function staffAddRechargeRecord(
    userId: string,
    record: Omit<RechargeRecord, 'id' | 'sNo' | 'daysRemaining' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
    if (!userId) return { success: false, error: 'Not authenticated' };

    try {
        const countSnap = await db.collection('recharge_records').get();
        const sNo = countSnap.size + 1;
        const nextRechargeDate = record.nextRechargeDate || calcNextRechargeDate(record.date, record.packageDuration);

        const docRef = await db.collection('recharge_records').add({
            ...record,
            nextRechargeDate,
            sNo,
            addedByUid: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        return { success: true, id: docRef.id };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function staffUpdateRechargeRecord(
    userId: string,
    id: string,
    updates: Partial<RechargeRecord>
): Promise<{ success: boolean; error?: string }> {
    if (!userId) return { success: false, error: 'Not authenticated' };

    try {
        // Only allow staff to update records they added, unless admin
        if (userId !== ADMIN_ID) {
            const doc = await db.collection('recharge_records').doc(id).get();
            if (!doc.exists) return { success: false, error: 'Record not found' };
            const data = doc.data();
            if (data?.addedByUid && data.addedByUid !== userId) {
                return { success: false, error: 'You can only edit records you added' };
            }
        }

        if ((updates.date || updates.packageDuration) && !updates.nextRechargeDate) {
            const existing = await db.collection('recharge_records').doc(id).get();
            const data = existing.data() as RechargeRecord;
            const date = updates.date || data.date;
            const duration = updates.packageDuration || data.packageDuration;
            updates.nextRechargeDate = calcNextRechargeDate(date, duration);
        }

        await db.collection('recharge_records').doc(id).update({
            ...updates,
            updatedAt: new Date().toISOString(),
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function staffDeleteRechargeRecord(
    userId: string,
    id: string,
): Promise<{ success: boolean; error?: string }> {
    if (!userId) return { success: false, error: 'Not authenticated' };

    try {
        // Only allow staff to delete records they added, unless admin
        if (userId !== ADMIN_ID) {
            const doc = await db.collection('recharge_records').doc(id).get();
            if (!doc.exists) return { success: false, error: 'Record not found' };
            const data = doc.data();
            if (data?.addedByUid && data.addedByUid !== userId) {
                return { success: false, error: 'You can only delete records you added' };
            }
        }
        await db.collection('recharge_records').doc(id).delete();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export interface RechargeRecord {
    id?: string;
    sNo?: number;
    date: string;
    name: string;
    mobileNumber: string;
    simNetwork: string;
    amount: number;
    packageDuration: number;
    billSend: boolean;
    billInvoiceNo: string;
    rechargeApp: string;
    groupAdded: boolean;
    nextRechargeDate: string;
    nextReminderDate: string;
    daysRemaining?: number;
    cashbackStatus: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
}

function calcDaysRemaining(targetDateStr: string): number {
    if (!targetDateStr) return 0;
    const target = new Date(targetDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function calcNextRechargeDate(date: string, duration: number): string {
    if (!date || !duration) return '';
    const d = new Date(date);
    d.setDate(d.getDate() + duration);
    return d.toISOString().split('T')[0];
}

export async function getRechargeRecords(adminId: string): Promise<RechargeRecord[]> {
    if (adminId !== ADMIN_ID) throw new Error('Unauthorized');

    const snap = await db.collection('recharge_records')
        .orderBy('sNo', 'asc')
        .get();

    return snap.docs.map(doc => {
        const data = doc.data() as RechargeRecord;
        return {
            ...data,
            id: doc.id,
            daysRemaining: calcDaysRemaining(data.nextRechargeDate),
        };
    });
}

export async function addRechargeRecord(adminId: string, record: Omit<RechargeRecord, 'id' | 'sNo' | 'daysRemaining' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; id?: string; error?: string }> {
    if (adminId !== ADMIN_ID) return { success: false, error: 'Unauthorized' };

    try {
        const countSnap = await db.collection('recharge_records').get();
        const sNo = countSnap.size + 1;

        const nextRechargeDate = record.nextRechargeDate || calcNextRechargeDate(record.date, record.packageDuration);

        const docRef = await db.collection('recharge_records').add({
            ...record,
            nextRechargeDate,
            sNo,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        return { success: true, id: docRef.id };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function updateRechargeRecord(adminId: string, id: string, updates: Partial<RechargeRecord>): Promise<{ success: boolean; error?: string }> {
    if (adminId !== ADMIN_ID) return { success: false, error: 'Unauthorized' };

    try {
        if (updates.date || updates.packageDuration) {
            const existing = await db.collection('recharge_records').doc(id).get();
            const data = existing.data() as RechargeRecord;
            const date = updates.date || data.date;
            const duration = updates.packageDuration || data.packageDuration;
            if (!updates.nextRechargeDate) {
                updates.nextRechargeDate = calcNextRechargeDate(date, duration);
            }
        }

        await db.collection('recharge_records').doc(id).update({
            ...updates,
            updatedAt: new Date().toISOString(),
        });

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function deleteRechargeRecord(adminId: string, id: string): Promise<{ success: boolean; error?: string }> {
    if (adminId !== ADMIN_ID) return { success: false, error: 'Unauthorized' };

    try {
        await db.collection('recharge_records').doc(id).delete();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function bulkDeleteRechargeRecords(adminId: string, ids: string[]): Promise<{ success: boolean; error?: string }> {
    if (adminId !== ADMIN_ID) return { success: false, error: 'Unauthorized' };

    try {
        const batch = db.batch();
        ids.forEach(id => {
            batch.delete(db.collection('recharge_records').doc(id));
        });
        await batch.commit();
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function getRechargeStats(adminId: string) {
    if (adminId !== ADMIN_ID) throw new Error('Unauthorized');

    const snap = await db.collection('recharge_records').get();
    const records = snap.docs.map(d => d.data() as RechargeRecord);

    const totalRevenue = records.reduce((sum, r) => sum + (r.amount || 0), 0);
    const dueToday = records.filter(r => {
        const days = calcDaysRemaining(r.nextRechargeDate);
        return days <= 0 && days > -3;
    }).length;
    const dueIn7Days = records.filter(r => {
        const days = calcDaysRemaining(r.nextRechargeDate);
        return days > 0 && days <= 7;
    }).length;
    const cashbackPending = records.filter(r => r.cashbackStatus === 'pending').length;

    return {
        totalRecords: records.length,
        totalRevenue,
        dueToday,
        dueIn7Days,
        cashbackPending,
    };
}
