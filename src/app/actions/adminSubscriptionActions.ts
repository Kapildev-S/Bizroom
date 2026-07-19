"use server";

import { getAdminDb, verifyIdTokenString, ADMIN_UID } from '@/lib/firebase-admin';

const db = getAdminDb();

async function assertAdmin(idToken: string) {
    const uid = await verifyIdTokenString(idToken);
    if (uid !== ADMIN_UID) {
        throw new Error('Unauthorized. Admin access required.');
    }
}

export async function adminGrantPremium(idToken: string, targetUserId: string, durationDays: number = 365) {
    await assertAdmin(idToken);

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

export async function adminRevokePremium(idToken: string, targetUserId: string) {
    await assertAdmin(idToken);

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
