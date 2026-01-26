"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, Loader2, Ticket, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserBookings, type BookingData } from "@/app/actions/bookingActions";

export default function MyBookingsPage() {
    const [bookings, setBookings] = useState<BookingData[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const fetchedBookings = await getUserBookings(currentUser.uid);
                    setBookings(fetchedBookings);
                } catch (error) {
                    console.error("Failed to fetch bookings", error);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

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
                    <h2 className="text-3xl font-bold tracking-tight font-headline text-foreground">My Bookings</h2>
                    <p className="text-muted-foreground">
                        View and manage your purchased tickets.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" asChild>
                        <Link href="/tickets">Browse Events</Link>
                    </Button>
                </div>
            </div>
            <Separator />

            {bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed rounded-lg p-8 text-center animate-in fade-in-50">
                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                        <Ticket className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No bookings yet</h3>
                    <p className="text-muted-foreground max-w-sm mb-6">
                        You haven't booked any tickets yet. Explore upcoming events and secure your spot!
                    </p>
                    <Button asChild>
                        <Link href="/tickets">Browse Events</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {bookings.map((booking) => (
                        <Card key={booking.id} className="overflow-hidden border-l-4 border-l-primary shadow-md hover:shadow-lg transition-all duration-300">
                            <CardHeader className="bg-muted/30 pb-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="line-clamp-1 text-lg">{booking.eventTitle}</CardTitle>
                                        <CardDescription className="flex items-center mt-1">
                                            <Calendar className="mr-1 h-3.5 w-3.5" />
                                            {new Date(booking.eventDate).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                    <Badge variant={booking.status === "confirmed" ? "default" : "destructive"}>
                                        {booking.status}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="grid gap-2">
                                    <div className="flex justify-between items-center text-sm font-semibold p-2 bg-primary/10 rounded border border-primary/20 text-primary">
                                        <span>Booking ID</span>
                                        <span className="font-mono tracking-wider">{booking.bookingId}</span>
                                    </div>

                                    <div className="space-y-1 mt-2">
                                        <div className="flex items-start text-sm text-muted-foreground">
                                            <MapPin className="mr-2 h-4 w-4 mt-0.5" />
                                            <span className="line-clamp-2">{booking.eventVenue}</span>
                                        </div>
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <span className="font-medium mr-2">Paid:</span>
                                            <span className="text-foreground">{booking.totalPrice === "0" ? "Free" : `₹${booking.totalPrice}`}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/50 p-4 flex gap-2">
                                <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2" onClick={() => window.print()}>
                                    <Printer className="h-4 w-4" /> Print
                                </Button>
                                <Button variant="ghost" size="sm" className="w-full flex items-center justify-center gap-2">
                                    <Download className="h-4 w-4" /> Download
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
