"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { getBookingById, type BookingData } from "@/app/actions/bookingActions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Download,
    Printer,
    Loader2,
    ArrowLeft,
    CheckCircle2,
    XCircle
} from "lucide-react";
import Link from "next/link";
import html2canvas from "html2canvas";

export default function TicketInvoicePage() {
    const params = useParams();
    const bookingId = params.id as string;
    const [booking, setBooking] = useState<BookingData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const invoiceRef = useRef<HTMLDivElement>(null);

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

    const handleDownloadImage = async () => {
        if (!invoiceRef.current || !booking) return;
        setIsGenerating(true);
        try {
            const canvas = await html2canvas(invoiceRef.current, {
                scale: 2,
                backgroundColor: "#ffffff",
                useCORS: true,
                logging: false,
            });
            const dataUrl = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = `Invoice_${booking.bookingId}.png`;
            link.click();
        } catch (err) {
            console.error("Error generating invoice image:", err);
            alert("Failed to download invoice image.");
        } finally {
            setIsGenerating(false);
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
                <h1 className="text-2xl font-bold text-slate-900">Booking Not Found</h1>
                <Button className="mt-8" asChild>
                    <Link href="/tickets">Back to Events</Link>
                </Button>
            </div>
        );
    }

    const subtotal = Number(booking.totalPrice);
    const tax = 0; // Assuming tax is inclusive or Not applicable for now
    const total = subtotal + tax;

    return (
        <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6">
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between no-print">
                    <Button variant="ghost" asChild size="sm" className="text-slate-500">
                        <Link href={`/tickets/receipt/${booking.id}`}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Ticket
                        </Link>
                    </Button>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => window.print()}>
                            <Printer className="w-4 h-4 mr-2" /> Print
                        </Button>
                        <Button variant="default" size="sm" onClick={handleDownloadImage} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                            Download PNG
                        </Button>
                    </div>
                </div>

                <Card ref={invoiceRef} className="border-none shadow-xl overflow-hidden bg-white p-8 sm:p-12">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b pb-8">
                        <div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-1">INVOICE</h1>
                            <p className="text-slate-500 font-medium">Invoice No: {booking.bookingId.replace("TKT-", "INV-")}</p>
                            <p className="text-slate-500 font-medium">Date: {booking.createdAt?.seconds ? new Date(booking.createdAt.seconds * 1000).toLocaleDateString() : new Date().toLocaleDateString()}</p>
                        </div>
                        <div className="text-left sm:text-right">
                            <h2 className="text-xl font-black text-primary mb-1">BizRoom Official</h2>
                            <p className="text-sm text-slate-500 max-w-[200px] ml-auto">
                                Secure Events Ticketing Platform<br />
                                info@bizroom.in<br />
                                www.bizroom.in
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Billed To</p>
                            <p className="font-bold text-slate-900">{booking.userName}</p>
                            <p className="text-sm text-slate-500">{booking.userEmail}</p>
                            {booking.userMobile && <p className="text-sm text-slate-500">{booking.userMobile}</p>}
                        </div>
                        <div className="text-left sm:text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Event Details</p>
                            <p className="font-bold text-slate-900">{booking.eventTitle}</p>
                            <p className="text-sm text-slate-500">{booking.eventVenue}</p>
                            <p className="text-sm text-slate-500">{booking.eventDate} at {booking.eventTime}</p>
                        </div>
                    </div>

                    <div className="py-8">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b">
                                    <th className="pb-4">Description</th>
                                    <th className="pb-4 text-center">Qty</th>
                                    <th className="pb-4 text-right">Unit Price</th>
                                    <th className="pb-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {booking.tickets.map((t, i) => (
                                    <tr key={i} className="text-sm text-slate-700">
                                        <td className="py-4 font-medium">{t.ticketTypeName} Ticket</td>
                                        <td className="py-4 text-center">{t.quantity}</td>
                                        <td className="py-4 text-right">₹{t.price}</td>
                                        <td className="py-4 text-right font-bold text-slate-900">₹{t.price * t.quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end pt-8">
                        <div className="w-full sm:w-64 space-y-3">
                            <div className="flex justify-between text-sm text-slate-500 font-medium">
                                <span>Subtotal</span>
                                <span>₹{subtotal}</span>
                            </div>
                            <div className="flex justify-between text-sm text-slate-500 font-medium">
                                <span>Tax (0%)</span>
                                <span>₹{tax}</span>
                            </div>
                            <div className="flex justify-between items-center pt-3 border-t">
                                <span className="font-black text-slate-900 uppercase tracking-tighter">Total Amount</span>
                                <span className="text-2xl font-black text-primary">₹{total}</span>
                            </div>
                            <div className="pt-4 mt-4 bg-emerald-50 text-emerald-700 p-3 rounded-xl flex items-center justify-center gap-2 border border-emerald-100 no-print">
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase">Payment Confirmed</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-16 pt-8 border-t text-center space-y-2">
                        <p className="text-xs text-slate-400 font-medium">This is a computer-generated invoice and does not require a physical signature.</p>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">Thank you for booking with BizRoom!</p>
                    </div>
                </Card>

                <p className="text-center text-slate-400 text-xs font-medium no-print">
                    Need help? Contact us at support@bizroom.in
                </p>
            </div>
        </div>
    );
}
