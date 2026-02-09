
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Calendar, MapPin, Loader2, ArrowRight, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserEvents, type EventData } from "@/app/actions/eventActions";

export default function EventListingPage() {
    const [events, setEvents] = useState<EventData[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const fetchedEvents = await getUserEvents(currentUser.uid);
                    setEvents(fetchedEvents);
                } catch (error) {
                    console.error("Failed to fetch events", error);
                }
            } else {
                // Redirect if not logged in? Or just show empty. 
                // Sidebar handles protected route usually, but good to be safe.
                // router.push("/auth/login");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline text-foreground">My Events</h2>
                    <p className="text-muted-foreground">
                        Manage your upcoming events and tickets here.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/events/scanner">
                            <QrCode className="mr-2 h-4 w-4" /> Scan Tickets
                        </Link>
                    </Button>
                    <Button asChild className="bg-primary hover:bg-primary/90">
                        <Link href="/dashboard/events/create">
                            <Plus className="mr-2 h-4 w-4" /> Create Event
                        </Link>
                    </Button>
                </div>
            </div>
            <Separator />

            {events.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-lg p-8 text-center animate-in fade-in-50">
                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                        <Calendar className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No events yet</h3>
                    <p className="text-muted-foreground max-w-sm mb-6">
                        You haven't created any events yet. Start organizing your first event today!
                    </p>
                    <Button asChild>
                        <Link href="/dashboard/events/create">Create your first event</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {events.map((event) => (
                        <Card key={event.id} className="overflow-hidden hover:shadow-lg transition-all duration-300 border-primary/20 group">
                            <div className="aspect-video w-full overflow-hidden bg-muted relative">
                                {event.imageUrl ? (
                                    <img
                                        src={event.imageUrl}
                                        alt={event.title}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-primary/5">
                                        <Calendar className="h-12 w-12 text-primary/40" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded backdrop-blur-sm">
                                    {event.category}
                                </div>
                            </div>
                            <CardHeader>
                                <CardTitle className="line-clamp-1 text-lg group-hover:text-primary transition-colors">{event.title}</CardTitle>
                                <CardDescription className="flex items-center mt-1">
                                    <Calendar className="mr-1 h-3.5 w-3.5" />
                                    {new Date(event.date).toLocaleDateString()} • {event.time}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-start text-sm text-muted-foreground mb-4">
                                    <MapPin className="mr-1 h-3.5 w-3.5 mt-0.5" />
                                    <span className="line-clamp-2">{event.venue}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-medium">
                                    <span className={event.price === "0" ? "text-green-600" : "text-foreground"}>
                                        {event.price === "0" ? "Free" : `₹${event.price}`}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {event.isOnline ? "Online" : "In-Person"}
                                    </span>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/50 p-4">
                                <Button variant="ghost" className="w-full hover:bg-background hover:text-primary group-hover:underline justify-between" asChild>
                                    <Link href={`/dashboard/events/${event.id}`}>
                                        Manage Event <ArrowRight className="h-4 w-4 ml-2" />
                                    </Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
