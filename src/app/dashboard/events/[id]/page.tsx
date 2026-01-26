"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    Calendar,
    MapPin,
    Loader2,
    Copy,
    Check,
    Users,
    ArrowLeft,
    Share2,
    ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getEventById, type EventData } from "@/app/actions/eventActions";
import { getEventBookings, type BookingData } from "@/app/actions/bookingActions";
import { toast } from "@/hooks/use-toast";

export default function EventDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.id as string;

    const [event, setEvent] = useState<EventData | null>(null);
    const [bookings, setBookings] = useState<BookingData[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    // Fetch event first to ensure existence, then bookings? 
                    // Or parallel, assuming currentUser is host.
                    const fetchedEvent = await getEventById(eventId);

                    if (fetchedEvent && fetchedEvent.hostId !== currentUser.uid) {
                        toast({
                            title: "Unauthorized",
                            description: "You do not have permission to view this event.",
                            variant: "destructive"
                        });
                        router.push("/dashboard/events");
                        return;
                    }

                    setEvent(fetchedEvent);

                    if (fetchedEvent) {
                        const fetchedBookings = await getEventBookings(eventId, currentUser.uid);
                        setBookings(fetchedBookings);
                    }
                } catch (error) {
                    console.error("Failed to fetch event details", error);
                    toast({
                        title: "Error",
                        description: "Failed to load event details.",
                        variant: "destructive"
                    });
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [eventId, router]);

    const copyToClipboard = () => {
        const url = `${window.location.origin}/tickets?eventId=${eventId}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        toast({
            title: "Link Copied",
            description: "Event link copied to clipboard.",
        });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShareTicket = (booking: BookingData) => {
        const shareText = `Ticket Details\nEvent: ${booking.eventTitle}\nAttendee: ${booking.userName}\nBooking ID: ${booking.bookingId}\nDate: ${booking.eventDate} at ${booking.eventTime}\nVenue: ${booking.eventVenue}\n\nBook your tickets at: ${window.location.origin}/tickets`;

        if (navigator.share) {
            navigator.share({
                title: 'Ticket Details',
                text: shareText,
                url: `${window.location.origin}/tickets`,
            }).catch(console.error);
        } else {
            navigator.clipboard.writeText(shareText);
            toast({
                title: "Ticket Details Copied",
                description: "Ticket details copied to clipboard.",
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                <h2 className="text-xl font-bold mb-2">Event Not Found</h2>
                <Button asChild>
                    <Link href="/dashboard/events">Back to Events</Link>
                </Button>
            </div>
        );
    }

    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/tickets?eventId=${eventId}` : '';

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Header */}
            <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/events">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline text-foreground">{event.title}</h2>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(event.date).toLocaleDateString()} • {event.time}
                    </p>
                </div>
            </div>

            <Separator />

            <div className="grid gap-6 md:grid-cols-3">
                {/* Event Overview & Share */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Share Event</CardTitle>
                            <CardDescription>Share this link to sell tickets.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex space-x-2">
                                <Input value={shareUrl} readOnly className="bg-muted" />
                                <Button size="icon" onClick={copyToClipboard} className="shrink-0">
                                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <Button variant="outline" className="w-full" asChild>
                                <Link href={`/dashboard/events/${eventId}/edit`}>Edit Event</Link>
                            </Button>
                            <Button variant="outline" className="w-full" asChild>
                                <Link href={`/tickets?eventId=${eventId}`} target="_blank">
                                    <ExternalLink className="mr-2 h-4 w-4" /> View Public Page
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Event Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm">
                            <div className="flex items-start">
                                <MapPin className="mr-2 h-4 w-4 mt-0.5 text-muted-foreground" />
                                <span>{event.venue}</span>
                            </div>
                            <div className="flex items-center">
                                <span className="font-semibold w-20">Price:</span>
                                <span>{event.price === "0" ? "Free" : `₹${event.price}`}</span>
                            </div>
                            <div className="flex items-center">
                                <span className="font-semibold w-20">Type:</span>
                                <span>{event.isOnline ? "Online" : "In-Person"}</span>
                            </div>
                            <div className="flex items-center">
                                <span className="font-semibold w-20">Category:</span>
                                <span>{event.category}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Bookings List */}
                <div className="md:col-span-2">
                    <Card className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Attendee List</CardTitle>
                                <CardDescription>
                                    Total Bookings: {bookings.length}
                                </CardDescription>
                            </div>
                            <Users className="h-5 w-5 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {bookings.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    No bookings yet. Share your event link to get started!
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Guest</TableHead>
                                            <TableHead>Contact</TableHead>
                                            <TableHead>Ticket Type</TableHead>
                                            <TableHead>Booking ID</TableHead>
                                            <TableHead>Booked On</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {bookings.map((booking) => (
                                            <TableRow key={booking.id}>
                                                <TableCell className="font-medium">
                                                    {booking.userName}
                                                    {booking.isGuest && <Badge variant="secondary" className="ml-2 text-xs">Guest</Badge>}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-xs">
                                                        <span>{booking.userEmail}</span>
                                                        <span className="text-muted-foreground">{booking.userMobile || "-"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {booking.tickets && booking.tickets.length > 0 ? (
                                                        <div className="flex flex-col gap-1">
                                                            {booking.tickets.map((t, i) => (
                                                                <Badge key={i} variant="outline" className="w-fit">
                                                                    {t.quantity}x {t.ticketTypeName}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <Badge variant="outline">{booking.ticketTypeName || "Standard"}</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {booking.bookingId}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {booking.createdAt?.seconds ? new Date(booking.createdAt.seconds * 1000).toLocaleDateString() : "-"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={booking.status === "confirmed" ? "outline" : "destructive"} className="capitalize">
                                                        {booking.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => handleShareTicket(booking)} title="Share Ticket">
                                                        <Share2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
