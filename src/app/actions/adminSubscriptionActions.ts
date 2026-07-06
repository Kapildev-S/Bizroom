"use server";

import { getAdminDb } from '@/lib/firebase-admin';

const db = getAdminDb();
const ADMIN_ID = '3l2SpTceF9Qany7x5IRHdHBPU9J3';

export async function adminGrantPremium(adminId: string, targetUserId: string, durationDays: number = 365) {
    if (adminId !== ADMIN_ID) {
        throw new Error('Unauthorized. Admin access required.');
    }

    try {
        const userSettingsRef = db.doc(`users/${targetUserId}/settings/appSettings`);
        
        const premiumExpiry = new Date();
        premiumExpiry.setDate(premiumExpiry.getDate() + durationDays);

        const updateData = {
            subscriptionStatus: 'premium',
            premiumExpiry: premiumExpiry.toISOString(),
            lastPaymentAt: new Date().toISOString(),
            lastPaymentId: `manual_admin_${Date.now()}`,
            subscriptionId: `manual_${targetUserId}`,
        };

        await userSettingsRef.set(updateData, { merge: true });

        const globalSubRef = db.doc(`premium_subscriptions/manual_${targetUserId}`);
        await globalSubRef.set({
            userId: targetUserId,
            subscriptionId: `manual_${targetUserId}`,
            status: 'active',
            planId: 'manual_admin_grant',
            premiumExpiry: premiumExpiry.toISOString(),
            lastPaymentAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return { success: true };
    } catch (error: any) {
        console.error("Error granting premium:", error);
        throw new Error(error.message || "Failed to grant premium.");
    }
}

export async function adminRevokePremium(adminId: string, targetUserId: string) {
    if (adminId !== ADMIN_ID) {
        throw new Error('Unauthorized. Admin access required.');
    }

    try {
        const userSettingsRef = db.doc(`users/${targetUserId}/settings/appSettings`);
        const userSettingsSnap = await userSettingsRef.get();
        
        let existingSubId = `manual_${targetUserId}`;
        if (userSettingsSnap.exists) {
            const data = userSettingsSnap.data();
            if (data?.subscriptionId) {
                existingSubId = data.subscriptionId;
            }
        }

        const updateData = {
            subscriptionStatus: 'basic',
            premiumExpiry: new Date().toISOString(), // Expire immediately
        };

        await userSettingsRef.set(updateData, { merge: true });

        const globalSubRef = db.doc(`premium_subscriptions/${existingSubId}`);
        await globalSubRef.set({
            status: 'cancelled',
            updatedAt: new Date().toISOString()
        }, { merge: true });

        return { success: true };
    } catch (error: any) {
        console.error("Error revoking premium:", error);
        throw new Error(error.message || "Failed to revoke premium.");
    }
}
