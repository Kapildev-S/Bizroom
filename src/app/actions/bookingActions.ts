
import { db } from "@/lib/firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
    doc,
    updateDoc,
    getDoc,
    type DocumentData
} from "firebase/firestore";
import { sendBookingEmail } from "./emailActions";

export interface BookingData {
    id?: string;
    bookingId: string; // Readable ID like TKT-12345
    eventId: string;
    hostId: string; // Required for security rules
    userId?: string | null;
    userName: string;
    userEmail: string;
    userMobile?: string;

    // Ticket Details
    tickets: {
        ticketTypeId: string;
        ticketTypeName: string;
        quantity: number;
        price: number;
    }[];

    // Attendee Details
    attendees?: {
        name: string;
        mobile: string;
    }[];

    isGuest?: boolean;
    eventTitle: string;
    eventDate: string;
    eventVenue: string;
    eventTime: string;
    totalPrice: string;
    status: "confirmed" | "cancelled" | "pending";

    // Check-in Details
    checkedIn: boolean;
    checkedInAt?: any;
    checkedInCount?: number; // How many attendees have checked in
    attendeeCheckIns?: {
        attendeeIndex: number;
        checkedInAt: any;
    }[];

    paymentId?: string;
    orderId?: string;
    signature?: string;
    createdAt?: any;
}

// Generate a random 6-character string for Booking ID
const generateBookingId = () => {
    return "TKT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createBooking = async (bookingData: Omit<BookingData, "id" | "bookingId" | "createdAt" | "checkedIn" | "checkedInAt">) => {
    try {
        const newBookingId = generateBookingId();

        const docRef = await addDoc(collection(db, "bookings"), {
            ...bookingData,
            bookingId: newBookingId,
            checkedIn: false,
            checkedInCount: 0,
            attendeeCheckIns: [],
            createdAt: serverTimestamp(),
        });

        // Send confirmation email
        await sendBookingEmail({
            bookingId: newBookingId,
            userName: bookingData.userName,
            userEmail: bookingData.userEmail,
            eventTitle: bookingData.eventTitle,
            eventDate: bookingData.eventDate,
            eventVenue: bookingData.eventVenue,
            totalPrice: bookingData.totalPrice,
        });

        return { success: true, id: docRef.id, bookingId: newBookingId };
    } catch (error) {
        console.error("Error creating booking: ", error);
        return { success: false, error };
    }
};

export const getBookingsByHost = async (hostId: string): Promise<BookingData[]> => {
    try {
        const q = query(
            collection(db, "bookings"),
            where("hostId", "==", hostId),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));
    } catch (error) {
        console.error("Error getting bookings: ", error);
        return [];
    }
};

export const verifyAndCheckInAttendee = async (bookingId: string, attendeeIndex: number, hostId: string) => {
    try {
        const isAdmin = hostId === '3l2SpTceF9Qany7x5IRHdHBPU9J3';

        const q = isAdmin
            ? query(collection(db, "bookings"), where("bookingId", "==", bookingId))
            : query(collection(db, "bookings"), where("bookingId", "==", bookingId), where("hostId", "==", hostId));

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, message: "Ticket not found or unauthorized." };
        }

        const bookingDoc = querySnapshot.docs[0];
        const data = bookingDoc.data() as BookingData;

        if (data.status === "cancelled") {
            return { success: false, message: "This ticket has been cancelled." };
        }

        const attendeeCheckIns = data.attendeeCheckIns || [];
        const isAlreadyCheckedIn = attendeeCheckIns.some(ci => ci.attendeeIndex === attendeeIndex);

        if (isAlreadyCheckedIn) {
            return {
                success: false,
                message: `${data.attendees?.[attendeeIndex]?.name || "Attendee"} already checked in!`,
                userName: data.userName,
                eventTitle: data.eventTitle
            };
        }

        const newCheckIns = [...attendeeCheckIns, { attendeeIndex, checkedInAt: new Date().toISOString() }];
        const totalAttendees = data.attendees?.length || 1;
        const allCheckedIn = newCheckIns.length >= totalAttendees;

        await updateDoc(doc(db, "bookings", bookingDoc.id), {
            attendeeCheckIns: newCheckIns,
            checkedInCount: newCheckIns.length,
            checkedIn: allCheckedIn,
            checkedInAt: allCheckedIn ? serverTimestamp() : data.checkedInAt || null
        });

        return {
            success: true,
            message: `${data.attendees?.[attendeeIndex]?.name || "Attendee"} check-in successful!`,
            userName: data.userName,
            eventTitle: data.eventTitle,
            allCheckedIn
        };
    } catch (error: any) {
        console.error("Error checking in attendee:", error);
        return {
            success: false,
            message: `System error: ${error.message || "Unknown error during check-in"}`
        };
    }
};

export const verifyAndCheckInTicket = async (bookingId: string, hostId: string) => {
    try {
        const isAdmin = hostId === '3l2SpTceF9Qany7x5IRHdHBPU9J3';

        const q = isAdmin
            ? query(collection(db, "bookings"), where("bookingId", "==", bookingId))
            : query(collection(db, "bookings"), where("bookingId", "==", bookingId), where("hostId", "==", hostId));

        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, message: "Ticket not found or unauthorized." };
        }

        const bookingDoc = querySnapshot.docs[0];
        const data = bookingDoc.data() as BookingData;

        if (data.status === "cancelled") {
            return { success: false, message: "This ticket has been cancelled." };
        }

        // For group tickets, return data to let the scanner choose attendees
        return {
            success: true,
            requiresAction: true,
            booking: { id: bookingDoc.id, ...data }
        };

    } catch (error: any) {
        console.error("Error verifying ticket:", error);
        return {
            success: false,
            message: `System error: ${error.message || "Unknown error during verification"}`
        };
    }
};

export const getEventBookings = async (eventId: string, hostId: string): Promise<BookingData[]> => {
    try {
        const isAdmin = hostId === '3l2SpTceF9Qany7x5IRHdHBPU9J3';
        const q = isAdmin
            ? query(collection(db, "bookings"), where("eventId", "==", eventId), orderBy("createdAt", "desc"))
            : query(collection(db, "bookings"), where("eventId", "==", eventId), where("hostId", "==", hostId), orderBy("createdAt", "desc"));

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));
    } catch (error) {
        console.error("Error getting event bookings: ", error);
        return [];
    }
};

export const getBookingsByUser = async (userId: string): Promise<BookingData[]> => {
    try {
        const q = query(
            collection(db, "bookings"),
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BookingData));
    } catch (error) {
        console.error("Error getting user bookings: ", error);
        return [];
    }
};

export const getBookingById = async (bookingId: string): Promise<BookingData | null> => {
    try {
        const q = query(
            collection(db, "bookings"),
            where("bookingId", "==", bookingId)
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) return null;
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() } as BookingData;
    } catch (error) {
        console.error("Error getting booking: ", error);
        return null;
    }
};
