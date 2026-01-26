
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
    type DocumentData
} from "firebase/firestore";

export interface TicketType {
    id: string;
    name: string; // General, VIP, etc.
    type: "free" | "paid";
    price: number;
    quantity: number;
    maxPerUser: number;
    saleStartDate?: string;
    saleStartTime?: string;
    saleEndDate?: string;
    saleEndTime?: string;
}

export interface EventData {
    id?: string;
    hostId: string;
    hostName: string;
    title: string;
    description: string;
    category: string;
    imageUrl?: string;
    createdAt?: any;

    // Schedule
    startDate: string;
    endDate?: string;
    startTime: string;
    endTime?: string;
    timezone: string;

    // Location
    locationType: "physical" | "online";
    venueName?: string;
    venueAddress?: string;
    venueMapLink?: string;
    meetingLink?: string;

    // Tickets
    ticketTypes: TicketType[];

    // Deprecated / Legacy Support (Optional: keep for backward compat for a while)
    date?: string;
    time?: string;
    venue?: string;
    price?: string;
    isOnline?: boolean;
}

// Create a new event
export const createEvent = async (eventData: Omit<EventData, "id" | "createdAt">) => {
    try {
        const docRef = await addDoc(collection(db, "events"), {
            ...eventData,
            createdAt: serverTimestamp(),
        });
        return { success: true, id: docRef.id };
    } catch (error) {
        console.error("Error creating event: ", error);
        return { success: false, error };
    }
};

// Update an existing event
export const updateEvent = async (eventId: string, eventData: Partial<EventData>) => {
    try {
        const docRef = doc(db, "events", eventId);
        await updateDoc(docRef, {
            ...eventData,
            updatedAt: serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error("Error updating event: ", error);
        return { success: false, error };
    }
};

// Get all events (for public tickets page)
export const getEvents = async (): Promise<EventData[]> => {
    try {
        // In a real app, you might limit this or paginates
        const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);

        const events: EventData[] = [];
        querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() } as EventData);
        });
        return events;
    } catch (error) {
        console.error("Error getting events: ", error);
        return [];
    }
};

// Get events hosted by a specific user (for dashboard)
export const getUserEvents = async (userId: string): Promise<EventData[]> => {
    try {
        const q = query(
            collection(db, "events"),
            where("hostId", "==", userId)
        );
        const querySnapshot = await getDocs(q);

        const events: EventData[] = [];
        querySnapshot.forEach((doc) => {
            events.push({ id: doc.id, ...doc.data() } as EventData);
        });

        // Sort by created time (descending) in memory
        return events.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
        });
    } catch (error) {
        console.error("Error getting user events: ", error);
        return [];
    }
};

export const getEventById = async (eventId: string): Promise<EventData | null> => {
    try {
        const docRef = await getDocs(query(collection(db, "events"), where("__name__", "==", eventId)));

        if (docRef.empty) {
            return null;
        }

        const doc = docRef.docs[0];
        return { id: doc.id, ...doc.data() } as EventData;
    } catch (error) {
        console.error("Error getting event: ", error);
        return null;
    }
};
