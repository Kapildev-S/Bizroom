import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Initialize Firebase (using your existing config)
const firebaseConfig = {
    apiKey: "AIzaSyAlJYElsOYVcjoWGZOYug7mkoKXYWYMaIY",
    authDomain: "bill-7362b.firebaseapp.com",
    projectId: "bill-7362b",
    storageBucket: "bill-7362b.firebasestorage.app",
    messagingSenderId: "374803975236",
    appId: "1:374803975236:web:be4e0a4caa45ad01e34011",
    measurementId: "G-8DRPZPNJRG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function makeUserPremium(userId: string) {
    try {
        const userSettingsRef = doc(db, `users/${userId}/settings`, 'appSettings');

        // Set expiry to 1 year from now
        const premiumExpiry = new Date();
        premiumExpiry.setFullYear(premiumExpiry.getFullYear() + 1);

        await setDoc(userSettingsRef, {
            subscriptionStatus: 'premium',
            premiumExpiry: premiumExpiry.toISOString(),
            lastPaymentAt: new Date().toISOString(),
            lastPaymentId: 'manual_upgrade',
        }, { merge: true });

        console.log(`✅ Successfully upgraded user ${userId} to premium`);
        console.log(`Premium expiry: ${premiumExpiry.toISOString()}`);
    } catch (error) {
        console.error('Error upgrading user:', error);
    }
}

const userIds = [
    '5wGzMInxYde6rIPp4WJ0jZ4HwgI2',
    '2vq5mHzgN1MIoJWv63DRE90yTQq2'
];

async function upgradeAll() {
    for (const id of userIds) {
        await makeUserPremium(id);
    }
}

upgradeAll();
