"use server";

import { getAdminDb, ADMIN_UID, verifyIdTokenString } from '@/lib/firebase-admin';
import { getImageAsDataUri } from './imageActions';
import type { AppSettings, Customer, Invoice } from '@/lib/mockData';

const db = getAdminDb();

async function assertAdmin(idToken: string) {
    const uid = await verifyIdTokenString(idToken);
    if (uid !== ADMIN_UID) {
        throw new Error('Unauthorized. Admin access required.');
    }
}

// Firestore Timestamps can't cross the Server Action serialization boundary, and
// the invoice templates expect plain ISO date strings anyway - the same shape the
// user-facing invoice page produces before handing data to InvoiceView.
function toPlain(value: any): any {
    if (value === null || value === undefined) return null;
    if (typeof value?.toDate === 'function') return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(toPlain);
    if (typeof value === 'object') {
        const out: Record<string, any> = {};
        for (const [key, val] of Object.entries(value)) {
            out[key] = toPlain(val);
        }
        return out;
    }
    return value;
}

export interface BusinessInvoiceExportData {
    businessName: string;
    settings: AppSettings | null;
    logoDataUri: string | null;
    invoices: Invoice[];
    customersById: Record<string, Customer>;
}

/**
 * Loads everything needed to re-render a business's own invoices exactly as that
 * business sees them: their invoices, the customers those invoices point at, and
 * their appSettings (template choice, paper size, theme colour, branding).
 */
export async function fetchBusinessInvoicesForExport(
    idToken: string,
    targetUserId: string
): Promise<BusinessInvoiceExportData> {
    await assertAdmin(idToken);

    const [settingsSnap, invoicesSnap, customersSnap] = await Promise.all([
        db.doc(`users/${targetUserId}/settings/appSettings`).get(),
        db.collection(`users/${targetUserId}/invoices`).get(),
        db.collection(`users/${targetUserId}/customers`).get(),
    ]);

    const settings = settingsSnap.exists ? (toPlain(settingsSnap.data()) as AppSettings) : null;

    const customersById: Record<string, Customer> = {};
    customersSnap.forEach(docSnap => {
        customersById[docSnap.id] = { id: docSnap.id, ...toPlain(docSnap.data()) } as Customer;
    });

    // Sorted client-side (not with orderBy) so the export never depends on a
    // composite index existing for every business.
    const invoices = invoicesSnap.docs
        .map(docSnap => ({ id: docSnap.id, ...toPlain(docSnap.data()) } as Invoice))
        .sort((a, b) => {
            const aTime = a.issueDate ? new Date(a.issueDate).getTime() : 0;
            const bTime = b.issueDate ? new Date(b.issueDate).getTime() : 0;
            return aTime - bTime;
        });

    // The logo has to be inlined as a data URI: html2canvas taints the canvas on a
    // cross-origin image, which makes the toDataURL() call in the PDF capture throw.
    let logoDataUri: string | null = null;
    const logoUrl = settings?.businessProfile?.logoUrl;
    if (logoUrl) {
        logoDataUri = await getImageAsDataUri(logoUrl);
    }

    return {
        businessName: settings?.businessProfile?.businessName || 'business',
        settings,
        logoDataUri,
        invoices,
        customersById,
    };
}
