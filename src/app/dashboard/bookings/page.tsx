
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, Loader2, Ticket, Printer, Download, QrCode, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getUserBookings, type BookingData } from "@/app/actions/bookingActions";
import { QRCodeSVG } from "qrcode.react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

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
                    <h2 className="text-3xl font-bold tracking-tight font-headline text-foreground text-indigo-900 flex items-center gap-3">
                        <Ticket className="h-8 w-8 text-indigo-600" />
                        My Bookings
                    </h2>
                    <p className="text-muted-foreground">
                        Show these QR codes at the entry for quick approval.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/events">Browse More Events</Link>
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
                        <Link href="/dashboard/events">Browse Events</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {bookings.map((booking) => (
                        <Card key={booking.id} className="overflow-hidden border-t-4 border-t-indigo-600 shadow-lg hover:shadow-xl transition-all duration-300 bg-white">
                            <CardHeader className="bg-slate-50/50 pb-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle className="line-clamp-1 text-lg font-bold">{booking.eventTitle}</CardTitle>
                                        <CardDescription className="flex items-center mt-1">
                                            <Calendar className="mr-1 h-3.5 w-3.5" />
                                            {new Date(booking.eventDate).toLocaleDateString()}
                                        </CardDescription>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <Badge variant={booking.status === "confirmed" ? "default" : "destructive"}>
                                            {booking.status}
                                        </Badge>
                                        {booking.checkedIn && (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3" /> Checked In
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="grid gap-4">
                                    <div className="flex justify-between items-center text-sm font-semibold p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-700">
                                        <span>Booking ID</span>
                                        <span className="font-mono tracking-wider">{booking.bookingId}</span>
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex items-start text-sm text-muted-foreground">
                                            <MapPin className="mr-2 h-4 w-4 mt-0.5 text-indigo-400" />
                                            <span className="line-clamp-2">{booking.eventVenue}</span>
                                        </div>
                                    </div>

                                    {/* Quick QR View */}
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 py-6 rounded-xl shadow-md shadow-indigo-100">
                                                <QrCode className="h-5 w-5" />
                                                View E-Ticket
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-md">
                                            <DialogHeader>
                                                <DialogTitle className="text-center text-2xl font-bold">{booking.eventTitle}</DialogTitle>
                                                <DialogDescription className="text-center font-medium">
                                                    Scan this code at the venue entry
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="flex flex-col items-center justify-center p-6 space-y-6">
                                                <div className="p-4 bg-white border-8 border-slate-50 rounded-2xl shadow-inner">
                                                    <QRCodeSVG
                                                        value={booking.bookingId}
                                                        size={240}
                                                        level="H"
                                                        includeMargin={true}
                                                    />
                                                </div>
                                                <div className="text-center space-y-1">
                                                    <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Booking ID</p>
                                                    <p className="text-2xl font-mono font-black text-indigo-600">{booking.bookingId}</p>
                                                </div>
                                                <div className="w-full p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                                                    <div className="w-5 h-5 bg-amber-200 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                                        <span className="text-amber-700 font-bold text-xs font-serif italic">i</span>
                                                    </div>
                                                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                                                        Please present this QR code to the event coordinator. This ticket is valid for one-time entry only.
                                                    </p>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-slate-50/50 p-4 flex gap-2 border-t">
                                <Button variant="ghost" size="sm" className="w-full text-indigo-600" onClick={() => window.print()}>
                                    <Printer className="h-4 w-4 mr-2" /> Print
                                </Button>
                                <Button variant="ghost" size="sm" className="w-full text-indigo-600">
                                    <Download className="h-4 w-4 mr-2" /> Save PDF
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
