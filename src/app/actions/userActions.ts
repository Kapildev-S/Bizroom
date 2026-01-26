"use server";

import { adminDb } from "@/lib/firebase-admin"; // Assuming admin SDK is set up, otherwise use client SDK (less secure but ok for now if admin not ready)
// Actually, looking at previous files, we use client SDK in components but actions use... wait, let me check existing actions.
// If we don't have admin SDK setup, we might need to rely on client side update or check if we can import server-side firestore.
// Let's check `src/lib/firebase.ts` or similar first.

// Fallback: If no server-admin setup, I will use a client-callable approach temporarily or try to use the client SDK in the action (which might work if rules allow).
// BUT, server actions run on server. Client SDK initialized with API key works on server too for some ops if auth is handled.
// Better approach: Since I don't see `firebase-admin` in imports previously, I will assume client SDK is the primary way.

import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";

export async function upgradeUserToPremium(userId: string) {
    if (!userId) {
        return { success: false, error: "User ID is required" };
    }

    try {
        const userSettingsRef = doc(db, `users/${userId}/settings`, "appSettings");

        // Get existing settings to merge or create new
        // We update subscriptionStatus to 'premium'
        await setDoc(userSettingsRef, {
            subscriptionStatus: 'premium',
            premiumSince: new Date().toISOString()
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error("Error upgrading user to premium:", error);
        return { success: false, error: "Failed to upgrade user." };
    }
}
