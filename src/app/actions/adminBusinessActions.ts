"use server";

import { getAdminDb, getAdminAuth } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';

const db = getAdminDb();
const auth = getAdminAuth();
const ADMIN_ID = '3l2SpTceF9Qany7x5IRHdHBPU9J3';

export async function fetchAllBusinesses(adminId: string) {
    if (adminId !== ADMIN_ID) throw new Error("Unauthorized");
    
    try {
        const usersRef = db.collection('users');
        const userDocs = await usersRef.listDocuments();

        const businesses = [];
        
        for (const userRef of userDocs) {
            const userId = userRef.id;
            
            try {
                const [userDoc, settingsDoc, productsSnap, customersSnap, invoicesSnap] = await Promise.all([
                    userRef.get(),
                    userRef.collection('settings').doc('appSettings').get(),
                    db.collection(`users/${userId}/products`).count().get(),
                    db.collection(`users/${userId}/customers`).count().get(),
                    db.collection(`users/${userId}/invoices`).get()
                ]);

                const data = settingsDoc.data();
                const userData = userDoc.data();
                
                const profile = data?.businessProfile || {};
                const subStatus = data?.subscriptionStatus || 'free';
                
                let revenue = 0;
                let billsGenerated = invoicesSnap.size;
                
                invoicesSnap.forEach(inv => {
                    const invData = inv.data();
                    const amount = Number(invData.total || invData.grandTotal || 0);
                    if (amount > 0) {
                        revenue += amount;
                    }
                });
                
                const createdDate = userDoc.createTime?.toDate() || settingsDoc.createTime?.toDate() || new Date();
                
                businesses.push({
                    id: userId,
                    businessName: profile.businessName || 'N/A',
                    ownerName: profile.ownerName || 'N/A',
                    mobile: profile.phone || 'N/A',
                    email: profile.email || 'N/A',
                    gst: profile.gstNumber || 'N/A',
                    category: profile.category || 'N/A',
                    address: profile.address || 'N/A',
                    status: data?.accountStatus || 'active',
                    subscription: subStatus,
                    wallet: data?.walletBalance || 0,
                    revenue: revenue,
                    billsGenerated: billsGenerated,
                    productsCount: productsSnap.data().count,
                    customersCount: customersSnap.data().count,
                    createdDate: createdDate.toISOString(),
                    lastLogin: data?.lastLoginAt || createdDate.toISOString(),
                    verified: data?.isVerified || false
                });
            } catch (err) {
                console.error(`Error fetching data for user ${userId}:`, err);
                // Skip this user if they fail, don't crash the whole page
            }
        }

        return businesses;
    } catch (e: any) {
        throw new Error(e.message);
    }
}

export async function updateBusinessStatus(adminId: string, userId: string, status: 'active' | 'suspended') {
    if (adminId !== ADMIN_ID) throw new Error("Unauthorized");
    await db.doc(`users/${userId}/settings/appSettings`).set({ accountStatus: status }, { merge: true });
    
    try {
        await auth.updateUser(userId, { disabled: status === 'suspended' });
    } catch (e) {
        console.error("Auth update error:", e);
    }
    
    revalidatePath('/admin');
    return { success: true };
}

export async function verifyBusiness(adminId: string, userId: string, verified: boolean) {
    if (adminId !== ADMIN_ID) throw new Error("Unauthorized");
    await db.doc(`users/${userId}/settings/appSettings`).set({ isVerified: verified }, { merge: true });
    revalidatePath('/admin');
    return { success: true };
}

export async function deleteBusiness(adminId: string, userId: string) {
    if (adminId !== ADMIN_ID) throw new Error("Unauthorized");
    
    await db.doc(`users/${userId}/settings/appSettings`).set({ accountStatus: 'deleted' }, { merge: true });
    
    try {
        await auth.updateUser(userId, { disabled: true });
    } catch (e) {
        console.error("Auth update error:", e);
    }
    
    revalidatePath('/admin');
    return { success: true };
}

export async function getImpersonationToken(adminId: string, userId: string) {
    if (adminId !== ADMIN_ID) throw new Error("Unauthorized");
    try {
        const customToken = await auth.createCustomToken(userId);
        return { token: customToken };
    } catch (e: any) {
        throw new Error(e.message);
    }
}

export async function updateBusinessDetails(adminId: string, userId: string, updateData: any) {
    if (adminId !== ADMIN_ID) throw new Error("Unauthorized");
    try {
        const userRef = db.doc(`users/${userId}/settings/appSettings`);
        
        const docSnap = await userRef.get();
        let businessProfile = docSnap.data()?.businessProfile || {};
        
        if (updateData.businessName !== undefined) businessProfile.businessName = updateData.businessName;
        if (updateData.ownerName !== undefined) businessProfile.ownerName = updateData.ownerName;
        if (updateData.phone !== undefined) businessProfile.phone = updateData.phone;
        if (updateData.email !== undefined) businessProfile.email = updateData.email;
        if (updateData.gstNumber !== undefined) businessProfile.gstNumber = updateData.gstNumber;

        await userRef.set({ businessProfile }, { merge: true });
        
        revalidatePath('/admin');
        return { success: true };
    } catch (e: any) {
        console.error("Update Business Details Error:", e);
        throw new Error(e.message);
    }
}

export async function resetUserPassword(adminId: string, email: string) {
    if (adminId !== ADMIN_ID) throw new Error("Unauthorized");
    if (!email || email === 'N/A') throw new Error("Business has no valid email address.");
    try {
        const link = await auth.generatePasswordResetLink(email);
        return { success: true, link };
    } catch (e: any) {
        throw new Error(e.message);
    }
}
