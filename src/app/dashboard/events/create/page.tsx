"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { createEvent } from "@/app/actions/eventActions";
import { auth } from "@/lib/firebase";
import EventForm, { type EventFormValues } from "@/components/events/EventForm";

export default function CreateEventPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const onSubmit = async (data: EventFormValues) => {
        if (!auth.currentUser) {
            toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
            return;
        }

        setLoading(true);

        try {
            const result = await createEvent({
                ...data,
                hostId: auth.currentUser.uid,
                hostName: auth.currentUser.displayName || "Organizer",
                // Backward compatibility fields
                date: data.startDate,
                time: data.startTime,
                venue: data.locationType === "physical" ? data.venueName! : "Online Event",
                price: data.ticketTypes.length > 0 ? String(Math.min(...data.ticketTypes.map(t => t.price))) : "0",
                isOnline: data.locationType === "online",
            });

            if (result.success) {
                toast({ title: "Event Created!", description: "Your event is live." });
                router.push("/dashboard/events");
            } else {
                throw new Error("Failed to create event");
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to publish event.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center space-x-4 mb-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/events">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline text-foreground">Create Event</h2>
                    <p className="text-muted-foreground">Detailed configuration for your upcoming event.</p>
                </div>
            </div>

            <EventForm onSubmit={onSubmit} loading={loading} />
        </div>
    );
}
