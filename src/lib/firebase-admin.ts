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

export function getAdminDb() {
    return admin.firestore();
}

export function getAdminAuth() {
    return admin.auth();
}

// UID allowlisted for admin-only actions (subscription grants/revokes, admin dashboards, etc).
export const ADMIN_UID = '3l2SpTceF9Qany7x5IRHdHBPU9J3';

/**
 * Verifies the Firebase ID token on an inbound API route request and returns the
 * verified uid. Never trust a client-supplied uid/adminId string for authorization -
 * always derive identity from a cryptographically verified token.
 */
export async function verifyRequestAuth(req: Request): Promise<string | null> {
    const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) return null;

    try {
        const decoded = await getAdminAuth().verifyIdToken(token);
        return decoded.uid;
    } catch (error) {
        console.error('Failed to verify ID token:', error);
        return null;
    }
}

/** Same as verifyRequestAuth, but for verifying a bare idToken string (e.g. passed as a Server Action argument). */
export async function verifyIdTokenString(idToken: string | undefined | null): Promise<string | null> {
    if (!idToken) return null;
    try {
        const decoded = await getAdminAuth().verifyIdToken(idToken);
        return decoded.uid;
    } catch (error) {
        console.error('Failed to verify ID token:', error);
        return null;
    }
}
