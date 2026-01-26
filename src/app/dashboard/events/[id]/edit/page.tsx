"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getEventById, updateEvent, type EventData } from "@/app/actions/eventActions";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import EventForm, { type EventFormValues } from "@/components/events/EventForm";

export default function EditEventPage() {
    const router = useRouter();
    const params = useParams();
    const eventId = params.id as string;
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [event, setEvent] = useState<EventData | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (!currentUser) {
                router.push("/auth/login");
                return;
            }

            try {
                const fetchedEvent = await getEventById(eventId);

                if (!fetchedEvent) {
                    toast({ title: "Error", description: "Event not found", variant: "destructive" });
                    router.push("/dashboard/events");
                    return;
                }

                if (fetchedEvent.hostId !== currentUser.uid) {
                    toast({ title: "Unauthorized", description: "You cannot edit this event", variant: "destructive" });
                    router.push("/dashboard/events");
                    return;
                }

                setEvent(fetchedEvent);
            } catch (error) {
                console.error(error);
                toast({ title: "Error", description: "Failed to load event", variant: "destructive" });
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [eventId, router, toast]);

    const onSubmit = async (data: EventFormValues) => {
        setSubmitting(true);
        try {
            const result = await updateEvent(eventId, {
                ...data,
                // Backward compatibility
                date: data.startDate,
                time: data.startTime,
                venue: data.locationType === "physical" ? data.venueName! : "Online Event",
                price: data.ticketTypes.length > 0 ? String(Math.min(...data.ticketTypes.map(t => t.price))) : "0",
                isOnline: data.locationType === "online",
            });

            if (result.success) {
                toast({ title: "Event Updated!", description: "Changes have been saved." });
                router.push("/dashboard/events");
            } else {
                throw new Error("Failed to update event");
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to update event.", variant: "destructive" });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!event) return null;

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 max-w-4xl mx-auto">
            <div className="flex items-center space-x-4 mb-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dashboard/events/${eventId}`}>
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline text-foreground">Edit Event</h2>
                    <p className="text-muted-foreground">Modify event details and configuration.</p>
                </div>
            </div>

            <EventForm
                initialData={event}
                onSubmit={onSubmit}
                loading={submitting}
                isEditing={true}
            />
        </div>
    );
}
