import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { verifyRequestAuth, ADMIN_UID } from '@/lib/firebase-admin';

const db = admin.firestore();

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const eventId = searchParams.get('eventId');

        const uid = await verifyRequestAuth(req);

        // Only allow the specified admin user
        if (uid !== ADMIN_UID) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (!eventId) {
            return NextResponse.json({ error: 'Event ID required' }, { status: 400 });
        }

        // Delete the event document
        await db.collection('events').doc(eventId).delete();

        // Optional: Delete associated bookings? 
        // For now, we'll just delete the event. 
        // If we want to delete bookings, we'd do it here in a batch.

        const bookingsQuery = await db.collection('bookings').where('eventId', '==', eventId).get();
        if (!bookingsQuery.empty) {
            const batch = db.batch();
            bookingsQuery.docs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
        }

        return NextResponse.json({ success: true, message: 'Event and associated bookings deleted successfully' });

    } catch (error: any) {
        console.error('Error deleting event:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
