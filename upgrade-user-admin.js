require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase Admin
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: 'bill-7362b',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
    }),
});

const db = admin.firestore();

async function makeUserPremium(userId) {
    try {
        const userSettingsRef = db.doc(`users/${userId}/settings/appSettings`);

        // Set expiry to 1 year from now
        const premiumExpiry = new Date();
        premiumExpiry.setFullYear(premiumExpiry.getFullYear() + 1);

        await userSettingsRef.set({
            subscriptionStatus: 'premium',
            premiumExpiry: premiumExpiry.toISOString(),
            lastPaymentAt: new Date().toISOString(),
            lastPaymentId: 'manual_upgrade',
        }, { merge: true });

        console.log(`✅ Successfully upgraded user ${userId} to premium`);
        console.log(`Premium expiry: ${premiumExpiry.toISOString()}`);

        // Verify the update
        const doc = await userSettingsRef.get();
        console.log('\n📋 Current user settings:');
        console.log(JSON.stringify(doc.data(), null, 2));

    } catch (error) {
        console.error(`❌ Error upgrading user ${userId}:`, error);
    }
}

// Run the script
const userIds = [
    '5wGzMInxYde6rIPp4WJ0jZ4HwgI2',
    '2vq5mHzgN1MIoJWv63DRE90yTQq2'
];

async function upgradeAll() {
    for (const id of userIds) {
        await makeUserPremium(id);
    }
    process.exit(0);
}

upgradeAll();
