import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { verifyRequestAuth, ADMIN_UID } from '@/lib/firebase-admin';

const db = admin.firestore();

export async function GET(req: Request) {
    try {
        const uid = await verifyRequestAuth(req);

        if (uid !== ADMIN_UID) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const bookingsSnap = await db.collection('bookings').get();
        const eventsSnap = await db.collection('events').get();

        // Build event map
        const eventMap: Record<string, any> = {};
        eventsSnap.docs.forEach(doc => {
            eventMap[doc.id] = { id: doc.id, ...doc.data() };
        });

        const bookings = bookingsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as any[];

        // --- Platform Summary ---
        const totalBookings = bookings.length;
        const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
        const pendingBookings = bookings.filter(b => b.status === 'pending').length;
        const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
        const checkedInBookings = bookings.filter(b => b.checkedIn === true).length;

        const totalRevenue = bookings
            .filter(b => b.status === 'confirmed')
            .reduce((sum, b) => sum + (parseFloat(b.totalPrice) || 0), 0);

        const paidBookings = bookings.filter(b => b.paymentId).length;
        const freeBookings = bookings.filter(b => !b.paymentId && b.status === 'confirmed').length;

        // --- Per-Event Stats ---
        const eventStats: Record<string, any> = {};
        bookings.forEach(b => {
            if (!b.eventId) return;
            if (!eventStats[b.eventId]) {
                eventStats[b.eventId] = {
                    eventId: b.eventId,
                    eventTitle: b.eventTitle || eventMap[b.eventId]?.title || 'Unknown Event',
                    hostId: b.hostId,
                    total: 0,
                    confirmed: 0,
                    pending: 0,
                    cancelled: 0,
                    checkedIn: 0,
                    revenue: 0,
                };
            }
            const es = eventStats[b.eventId];
            es.total++;
            if (b.status === 'confirmed') { es.confirmed++; es.revenue += parseFloat(b.totalPrice) || 0; }
            if (b.status === 'pending') es.pending++;
            if (b.status === 'cancelled') es.cancelled++;
            if (b.checkedIn) es.checkedIn++;
        });

        // Sort by most bookings
        const eventBreakdown = Object.values(eventStats).sort((a: any, b: any) => b.total - a.total);

        // --- Recent Bookings (last 20) ---
        const recentBookings = [...bookings]
            .sort((a, b) => {
                const aTime = a.createdAt?.seconds || 0;
                const bTime = b.createdAt?.seconds || 0;
                return bTime - aTime;
            })
            .slice(0, 20)
            .map(b => ({
                bookingId: b.bookingId,
                userName: b.userName,
                userEmail: b.userEmail,
                userMobile: b.userMobile || null,
                eventTitle: b.eventTitle,
                eventDate: b.eventDate || null,
                eventVenue: b.eventVenue || null,
                eventTime: b.eventTime || null,
                tickets: b.tickets || [],
                status: b.status,
                totalPrice: b.totalPrice,
                checkedIn: b.checkedIn,
                paymentId: b.paymentId || null,
                orderId: b.orderId || null,
                createdAt: b.createdAt?.seconds ? b.createdAt.seconds * 1000 : null,
            }));

        return NextResponse.json({
            summary: {
                totalBookings,
                confirmedBookings,
                pendingBookings,
                cancelledBookings,
                checkedInBookings,
                totalRevenue,
                paidBookings,
                freeBookings,
            },
            eventBreakdown,
            recentBookings,
        });

    } catch (error: any) {
        console.error('Error fetching ticket analytics:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
