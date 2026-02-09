
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
    userId?: string;
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

    isGuest?: boolean;
    eventTitle: string;
    eventDate: string;
    eventVenue: string;
    eventTime: string;
    totalPrice: string;
    status: "confirmed" | "cancelled";
    checkedIn?: boolean;
    checkedInAt?: any;
    createdAt?: any;
}

// Generate a random 6-character string for Booking ID
const generateBookingId = () => {
    return "TKT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
};

export const createBooking = async (bookingData: Omit<BookingData, "id" | "bookingId" | "createdAt" | "status" | "checkedIn" | "checkedInAt">) => {
    try {
        const newBookingId = generateBookingId();

        const docRef = await addDoc(collection(db, "bookings"), {
            ...bookingData,
            bookingId: newBookingId,
            status: "confirmed",
            checkedIn: false,
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

export const verifyAndCheckInTicket = async (bookingId: string, hostId: string) => {
    try {
        const q = query(
            collection(db, "bookings"),
            where("bookingId", "==", bookingId),
            where("hostId", "==", hostId)
        );
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, message: "Ticket not found or unauthorized." };
        }

        const bookingDoc = querySnapshot.docs[0];
        const data = bookingDoc.data() as BookingData;

        if (data.status === "cancelled") {
            return { success: false, message: "This ticket has been cancelled." };
        }

        if (data.checkedIn) {
            return {
                success: false,
                message: "Ticket already checked in!",
                userName: data.userName,
                eventTitle: data.eventTitle
            };
        }

        // Perform check-in
        await updateDoc(doc(db, "bookings", bookingDoc.id), {
            checkedIn: true,
            checkedInAt: serverTimestamp(),
        });

        return {
            success: true,
            message: "Check-in successful!",
            userName: data.userName,
            eventTitle: data.eventTitle
        };
    } catch (error) {
        console.error("Error checking in ticket:", error);
        return { success: false, message: "System error during check-in." };
    }
};

export const getUserBookings = async (userId: string): Promise<BookingData[]> => {
    try {
        const q = query(
            collection(db, "bookings"),
            where("userId", "==", userId)
        );
        const querySnapshot = await getDocs(q);

        const bookings: BookingData[] = [];
        querySnapshot.forEach((doc) => {
            bookings.push({ id: doc.id, ...doc.data() } as BookingData);
        });

        // Sort by created time (descending) in memory
        return bookings.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });
    } catch (error) {
        console.error("Error getting user bookings: ", error);
        return [];
    }
};

export const getEventBookings = async (eventId: string, hostId: string): Promise<BookingData[]> => {
    try {
        const q = query(
            collection(db, "bookings"),
            where("eventId", "==", eventId),
            where("hostId", "==", hostId)
        );
        const querySnapshot = await getDocs(q);

        const bookings: BookingData[] = [];
        querySnapshot.forEach((doc) => {
            bookings.push({ id: doc.id, ...doc.data() } as BookingData);
        });

        // Sort by created time (descending) in memory
        return bookings.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });
    } catch (error) {
        console.error("Error getting event bookings: ", error);
        return [];
    }
};
