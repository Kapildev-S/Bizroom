"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getBookingById, type BookingData } from "@/app/actions/bookingActions";
import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Calendar,
    MapPin,
    Clock,
    Ticket,
    Download,
    Share2,
    CheckCircle2,
    XCircle,
    Loader2,
    ArrowLeft
} from "lucide-react";
import Link from "next/link";

export default function TicketReceiptPage() {
    const params = useParams();
    const bookingId = params.id as string;
    const [booking, setBooking] = useState<BookingData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBooking = async () => {
            if (bookingId) {
                const data = await getBookingById(bookingId);
                setBooking(data);
            }
            setLoading(false);
        };
        fetchBooking();
    }, [bookingId]);

    const handleShare = async () => {
        if (!booking) return;
        const shareText = `My ticket for ${booking.eventTitle}! Booking ID: ${booking.bookingId}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Event Ticket',
                    text: shareText,
                    url: window.location.href,
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(window.location.href);
            alert("Ticket link copied to clipboard!");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-center">
                <XCircle className="h-16 w-16 text-rose-500 mb-4" />
                <h1 className="text-2xl font-bold text-slate-900">Ticket Not Found</h1>
                <p className="text-slate-500 mt-2 max-w-xs">We couldn't find a booking with ID: {bookingId}</p>
                <Button className="mt-8" asChild>
                    <Link href="/tickets">Explore More Events</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
            <div className="max-w-md mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <Button variant="ghost" asChild size="sm" className="text-slate-500">
                        <Link href="/tickets">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Events
                        </Link>
                    </Button>
                    <Badge variant="outline" className="bg-white text-primary border-primary/20">
                        Official Receipt
                    </Badge>
                </div>

                <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white">
                    <div className="bg-primary h-3 w-full" />
                    <CardHeader className="text-center pb-2">
                        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <CardTitle className="text-2xl font-black text-slate-900 leading-tight">
                            Booking Confirmed!
                        </CardTitle>
                        <CardDescription className="text-slate-500 font-medium">
                            {booking.userName}, your entry is secured.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6 space-y-6">
                        {/* Event Summary */}
                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                            <h3 className="font-bold text-lg text-slate-900 mb-3">{booking.eventTitle}</h3>
                            <div className="space-y-2">
                                <div className="flex items-center text-sm text-slate-600">
                                    <Calendar className="w-4 h-4 mr-2 text-primary" />
                                    {new Date(booking.eventDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </div>
                                <div className="flex items-center text-sm text-slate-600">
                                    <Clock className="w-4 h-4 mr-2 text-primary" />
                                    {booking.eventTime}
                                </div>
                                <div className="flex items-center text-sm text-slate-600">
                                    <MapPin className="w-4 h-4 mr-2 text-primary" />
                                    {booking.eventVenue}
                                </div>
                            </div>
                        </div>

                        {/* QR Section */}
                        <div className="flex flex-col items-center justify-center py-4 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                            <div className="p-4 bg-white rounded-2xl shadow-inner mb-4">
                                <QRCodeSVG
                                    value={booking.bookingId}
                                    size={180}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Booking Reference</p>
                            <p className="text-xl font-mono font-bold text-primary tracking-widest">{booking.bookingId}</p>
                        </div>

                        {/* Attendee Details */}
                        {booking.attendees && booking.attendees.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Attendees</p>
                                <div className="grid gap-2">
                                    {booking.attendees.map((attendee, idx) => (
                                        <div key={idx} className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <span className="text-sm font-bold text-slate-900">{attendee.name}</span>
                                            <span className="text-xs text-slate-500 font-medium">{attendee.mobile}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Ticket Breakdown */}
                        <div className="space-y-3">
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Order Summary</p>
                            {booking.tickets.map((t, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-slate-700">{t.quantity}x {t.ticketTypeName}</span>
                                    <span className="font-bold text-slate-900">₹{t.price * t.quantity}</span>
                                </div>
                            ))}
                            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                                <span className="font-black text-slate-900">Total Paid</span>
                                <span className="text-xl font-black text-primary">₹{booking.totalPrice}</span>
                            </div>
                        </div>

                        {/* Checked In Status */}
                        {booking.checkedIn && (
                            <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl flex items-center justify-center gap-2 border border-emerald-100">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="font-bold">Already Checked In</span>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button variant="outline" className="rounded-xl h-12 font-bold" onClick={() => window.print()}>
                                <Download className="w-4 h-4 mr-2" /> PDF
                            </Button>
                            <Button className="rounded-xl h-12 font-bold" onClick={handleShare}>
                                <Share2 className="w-4 h-4 mr-2" /> Share
                            </Button>
                        </div>
                    </CardContent>

                    <div className="bg-slate-900 text-white p-6 text-center">
                        <p className="text-xs opacity-60 font-medium mb-1 uppercase tracking-widest">Entry Instructions</p>
                        <p className="text-sm font-bold">Please present this QR code at the entry gate. No login required.</p>
                    </div>
                </Card>

                <p className="text-center text-slate-400 text-xs font-medium">
                    Powered by BizRoom Official Events Platform
                </p>
            </div>
        </div>
    );
}
