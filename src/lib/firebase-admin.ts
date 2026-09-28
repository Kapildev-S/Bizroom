import * as admin from 'firebase-admin';

function initFirebaseAdmin() {
    if (admin.apps.length > 0) {
        return admin.apps[0]!;
    }

    const projectId = 'bill-7362b';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (clientEmail && rawPrivateKey) {
        try {
            let privateKey = rawPrivateKey.trim();
            if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
                privateKey = privateKey.slice(1, -1);
            }
            privateKey = privateKey.replace(/\\n/g, '\n');

            return admin.initializeApp({
                credential: admin.credential.cert({
                    projectId,
                    clientEmail,
                    privateKey,
                }),
            });
        } catch (error) {
            console.error('Failed to initialize Firebase Admin with cert, using default credentials fallback:', error);
        }
    }

    try {
        return admin.initializeApp({ projectId });
    } catch (error) {
        console.error('Failed to initialize Firebase Admin with default credentials:', error);
        throw error;
    }
}

try {
    initFirebaseAdmin();
} catch (e) {
    console.error('Firebase Admin initialization caught top-level error:', e);
}

export function getAdminDb() {
    initFirebaseAdmin();
    return admin.firestore();
}

export function getAdminAuth() {
    initFirebaseAdmin();
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
