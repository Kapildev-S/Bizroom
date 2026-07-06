const admin = require('firebase-admin');
require('dotenv').config({ path: '.env' });

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

async function makeUserPremium(userId) {
    const premiumSince = new Date();
    const premiumExpiry = new Date();
    premiumExpiry.setDate(premiumSince.getDate() + 30);

    const userSettingsRef = db.doc(`users/${userId}/settings/appSettings`);

    await userSettingsRef.set({
        subscriptionStatus: 'premium',
        premiumSince: premiumSince.toISOString(),
        premiumExpiry: premiumExpiry.toISOString(),
        lastPaymentAt: premiumSince.toISOString(),
    }, { merge: true });

    console.log(`✅ User ${userId} upgraded to PREMIUM`);
    console.log(`   Premium Since:  ${premiumSince.toISOString()}`);
    console.log(`   Premium Expiry: ${premiumExpiry.toISOString()}`);
    process.exit(0);
}

makeUserPremium('7ss2W37JKtZW9GM5c3GFI93LTGx2').catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
