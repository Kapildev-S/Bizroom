"use server";

import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

export async function upgradeUserToPremium(userId: string) {
    if (!userId) {
        return { success: false, error: "User ID is required" };
    }

    try {
        const userSettingsRef = doc(db, `users/${userId}/settings`, "appSettings");

        const premiumSince = new Date();
        const premiumExpiry = new Date();
        premiumExpiry.setDate(premiumSince.getDate() + 30); // 30 days from now

        await setDoc(userSettingsRef, {
            subscriptionStatus: 'premium',
            premiumSince: premiumSince.toISOString(),
            premiumExpiry: premiumExpiry.toISOString()
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error("Error upgrading user to premium:", error);
        return { success: false, error: "Failed to upgrade user." };
    }
}
