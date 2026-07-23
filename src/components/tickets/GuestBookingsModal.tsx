"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, KeyRound, Ticket, Calendar, MapPin, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { sendTicketOTP, verifyTicketOTP, fetchGuestBookings } from "@/app/actions/ticketAuthActions";
import { useToast } from "@/hooks/use-toast";

interface GuestBookingsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function GuestBookingsModal({ open, onOpenChange }: GuestBookingsModalProps) {
    const [step, setStep] = useState<"email" | "otp" | "bookings">("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [bookings, setBookings] = useState<any[]>([]);
    const { toast } = useToast();

    const handleReset = () => {
        setStep("email");
        setEmail("");
        setOtp("");
        setBookings([]);
        setLoading(false);
    };

    const handleSendOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !email.includes("@")) {
            toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
            return;
        }

        setLoading(true);
        const res = await sendTicketOTP(email);
        setLoading(false);

        if (res.success) {
            toast({ title: "Code Sent!", description: `Verification code sent to ${email}` });
            setStep("otp");
        } else {
            toast({ title: "Error", description: res.error || "Failed to send verification code.", variant: "destructive" });
        }
    };

    const handleVerifyOTP = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp.trim() || otp.trim().length < 6) {
            toast({ title: "Invalid Code", description: "Please enter the 6-digit verification code.", variant: "destructive" });
            return;
        }

        setLoading(true);
        const verifyRes = await verifyTicketOTP(email, otp);

        if (verifyRes.success) {
            const fetchRes = await fetchGuestBookings(email);
            setLoading(false);
            if (fetchRes.success) {
                setBookings(fetchRes.bookings || []);
                setStep("bookings");
            } else {
                toast({ title: "Error", description: "Failed to fetch bookings.", variant: "destructive" });
            }
        } else {
            setLoading(false);
            toast({ title: "Verification Failed", description: verifyRes.error || "Invalid code.", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { onOpenChange(isOpen); if (!isOpen) handleReset(); }}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-slate-950 border border-cyan-500/30 text-white rounded-3xl p-6 md:p-8 shadow-2xl">
                <DialogHeader className="text-left space-y-2">
                    <DialogTitle className="text-2xl font-sans font-bold flex items-center gap-2 text-white">
                        <Ticket className="h-6 w-6 text-cyan-400" />
                        {step === "bookings" ? "Your Purchased Tickets" : "Access My Tickets"}
                    </DialogTitle>
                    <DialogDescription className="text-slate-400 text-sm">
                        {step === "email" && "Enter your email to receive a 6-digit security code to check your tickets."}
                        {step === "otp" && `Enter the 6-digit verification code sent to ${email}`}
                        {step === "bookings" && `Displaying confirmed bookings for ${email}`}
                    </DialogDescription>
                </DialogHeader>

                {/* Step 1: Enter Email */}
                {step === "email" && (
                    <form onSubmit={handleSendOTP} className="space-y-5 pt-3">
                        <div className="space-y-2 text-left">
                            <Label htmlFor="email-input" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                Email Address
                            </Label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-cyan-400" />
                                <Input
                                    id="email-input"
                                    type="email"
                                    placeholder="yourname@domain.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="pl-10 h-12 bg-slate-900/90 border-white/15 text-white placeholder-slate-500 focus-visible:ring-cyan-400 rounded-xl"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-cyan-500/20 text-sm transition-all"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send Verification Code"}
                        </Button>
                    </form>
                )}

                {/* Step 2: Enter OTP */}
                {step === "otp" && (
                    <form onSubmit={handleVerifyOTP} className="space-y-5 pt-3">
                        <div className="space-y-2 text-left">
                            <Label htmlFor="otp-input" className="text-xs font-bold uppercase tracking-wider text-slate-300">
                                6-Digit Code
                            </Label>
                            <div className="relative">
                                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-cyan-400" />
                                <Input
                                    id="otp-input"
                                    type="text"
                                    maxLength={6}
                                    placeholder="123456"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    required
                                    className="pl-10 h-12 bg-slate-900/90 border-white/15 text-white placeholder-slate-500 text-center font-mono text-xl tracking-[0.3em] focus-visible:ring-cyan-400 rounded-xl"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full h-12 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-cyan-500/20 text-sm transition-all"
                        >
                            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify Code & View Tickets"}
                        </Button>

                        <div className="flex justify-between items-center pt-2 text-xs">
                            <button
                                type="button"
                                onClick={() => setStep("email")}
                                className="text-slate-400 hover:text-white transition-colors"
                            >
                                Change Email
                            </button>
                            <button
                                type="button"
                                onClick={handleSendOTP}
                                disabled={loading}
                                className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                                <RefreshCw className="h-3 w-3" /> Resend Code
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 3: Bookings View */}
                {step === "bookings" && (
                    <div className="space-y-4 pt-2">
                        {bookings.length === 0 ? (
                            <div className="text-center py-10 space-y-3">
                                <Ticket className="h-12 w-12 text-slate-600 mx-auto" />
                                <p className="text-slate-400 text-sm font-medium">No tickets found for {email}</p>
                                <Button
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    className="border-white/15 text-white hover:bg-white/10 rounded-xl text-xs"
                                >
                                    Browse Available Events
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                                {bookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className="bg-slate-900/90 border border-white/10 rounded-2xl p-4 space-y-3 text-left hover:border-cyan-500/30 transition-all"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono mb-1">
                                                    {booking.bookingId || booking.id}
                                                </Badge>
                                                <h4 className="text-base font-bold text-white line-clamp-1">{booking.eventTitle}</h4>
                                            </div>
                                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs px-2.5 py-0.5">
                                                <CheckCircle2 className="h-3 w-3 mr-1" /> Confirmed
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-1">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                                                <span>{booking.eventDate || "TBD"}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                                                <span className="line-clamp-1">{booking.eventVenue || "Venue"}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-2 border-t border-white/10">
                                            <span className="text-xs font-bold text-white">Total Paid: ₹{booking.totalPrice}</span>
                                            <Button
                                                size="sm"
                                                asChild
                                                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-xl text-xs h-9 px-4"
                                            >
                                                <a href={`/tickets/receipt/${booking.bookingId || booking.id}`} target="_blank" rel="noopener noreferrer">
                                                    View Ticket &amp; QR <ArrowRight className="ml-1 h-3.5 w-3.5" />
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
