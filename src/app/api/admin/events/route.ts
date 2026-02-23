import { NextResponse } from 'next/server';
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

const db = admin.firestore();

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const adminId = searchParams.get('adminId');
        const eventId = searchParams.get('eventId');

        // Only allow the specified admin user
        if (adminId !== '3l2SpTceF9Qany7x5IRHdHBPU9J3') {
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
