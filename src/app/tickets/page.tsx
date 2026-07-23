"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Search, Clock, ArrowRight, Loader2, CheckCircle2, Share2, Video, Ticket, Users, BookOpen, Network, Music, Sparkles, Wine, Trophy, HelpCircle, Rocket, Star, Shield, QrCode, RotateCcw, Filter, Bell, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TubesBackground } from "@/components/ui/TubesBackground";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getEvents, type EventData, type TicketType } from "@/app/actions/eventActions";
import { createBooking } from "@/app/actions/bookingActions";
import { GuestBookingsModal } from "@/components/tickets/GuestBookingsModal";
import CtaFooter from "@/components/CtaFooter";
import { KresnaFooter } from "@/components/KresnaFooter";

function EventImage({ imageUrl, title }: { imageUrl?: string; title: string }) {
    const [error, setError] = useState(false);

    if (imageUrl && !error) {
        return (
            <img
                src={imageUrl}
                alt={title}
                onError={() => setError(true)}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
        );
    }

    return (
        <div className="w-full h-full flex items-center justify-center bg-primary/5">
            <Calendar className="h-12 w-12 text-primary/40" />
        </div>
    );
}

// Wrapper component to handle Suspense boundary for useSearchParams
export default function TicketsPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
            <TicketsPageContent />
        </Suspense>
    );
}

function TicketsPageContent() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [selectedLocation, setSelectedLocation] = useState("All");
    const [selectedDate, setSelectedDate] = useState("All");
    const [events, setEvents] = useState<EventData[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [successData, setSuccessData] = useState<{ id: string, event: string } | null>(null);

    const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
    const [bookingFormOpen, setBookingFormOpen] = useState(false);
    const [guestModalOpen, setGuestModalOpen] = useState(false);

    // Multi-Ticket Selection State: { [ticketId]: quantity }
    const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});

    const [bookingFormData, setBookingFormData] = useState({
        email: ""
    });
    const [attendees, setAttendees] = useState<{ name: string; mobile: string; place: string }[]>([]);

    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const categories = ["All", "Conference", "Workshop", "Networking", "Concert", "Festival", "Exhibition", "Party", "Sports", "Other"];

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case "All": return <Ticket className="h-4 w-4 mr-1.5" />;
            case "Conference": return <Users className="h-4 w-4 mr-1.5" />;
            case "Workshop": return <BookOpen className="h-4 w-4 mr-1.5" />;
            case "Networking": return <Network className="h-4 w-4 mr-1.5" />;
            case "Concert": return <Music className="h-4 w-4 mr-1.5" />;
            case "Festival": return <Sparkles className="h-4 w-4 mr-1.5" />;
            case "Exhibition": return <Sparkles className="h-4 w-4 mr-1.5" />;
            case "Party": return <Wine className="h-4 w-4 mr-1.5" />;
            case "Sports": return <Trophy className="h-4 w-4 mr-1.5" />;
            default: return <HelpCircle className="h-4 w-4 mr-1.5" />;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case "Conference": return "bg-blue-50 text-blue-700 border-blue-200";
            case "Workshop": return "bg-purple-50 text-purple-700 border-purple-200";
            case "Networking": return "bg-emerald-50 text-emerald-700 border-emerald-200";
            case "Concert": return "bg-amber-50 text-amber-700 border-amber-200";
            case "Festival": return "bg-rose-50 text-rose-700 border-rose-200";
            case "Exhibition": return "bg-indigo-50 text-indigo-700 border-indigo-200";
            case "Party": return "bg-pink-50 text-pink-700 border-pink-200";
            case "Sports": return "bg-cyan-50 text-cyan-700 border-cyan-200";
            default: return "bg-slate-50 text-slate-700 border-slate-200";
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                setBookingFormData(prev => ({
                    ...prev,
                    email: ""
                }));
                // Update first attendee if already initialized
                setAttendees(prev => {
                    if (prev.length > 0 && !prev[0].name) {
                        const next = [...prev];
                        next[0] = { ...next[0], name: currentUser.displayName || "" };
                        return next;
                    }
                    return prev;
                });
            }
        });

        const fetchEvents = async () => {
            try {
                const data = await getEvents();
                setEvents(data);

                // Handle direct link via ?eventId=...
                const eventIdParam = searchParams.get("eventId");
                if (eventIdParam) {
                    const targetEvent = data.find(e => e.id === eventIdParam);
                    if (targetEvent) {
                        handleOpenBooking(targetEvent);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch events", error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
        return () => unsubscribe();
    }, [searchParams]);

    useEffect(() => {
        if (!selectedEvent) return;
        let totalQty = Object.values(selectedTickets).reduce((a, b) => a + b, 0);

        // Handle legacy events where quantity is implicitly 1
        if (totalQty === 0 && (!selectedEvent.ticketTypes || selectedEvent.ticketTypes.length === 0)) {
            totalQty = 1;
        }

        setAttendees(prev => {
            if (prev.length === totalQty) return prev;
            if (prev.length < totalQty) {
                const extra = Array.from({ length: totalQty - prev.length }, () => ({ name: "", mobile: "", place: "" }));
                return [...prev, ...extra];
            } else {
                return prev.slice(0, totalQty);
            }
        });
    }, [selectedTickets, selectedEvent]);

    const handleOpenBooking = (event: EventData) => {
        setSelectedEvent(event);
        setSelectedTickets({});
        setAttendees([{ name: user?.displayName || "", mobile: "", place: "" }]);
        setBookingFormOpen(true);
    };

    const handleTicketChange = (ticketId: string, change: number, max: number) => {
        setSelectedTickets(prev => {
            const current = prev[ticketId] || 0;
            const next = Math.max(0, Math.min(current + change, max));
            return { ...prev, [ticketId]: next };
        });
    };

    const calculateTotal = () => {
        if (!selectedEvent) return 0;
        let total = 0;
        if (selectedEvent.ticketTypes && selectedEvent.ticketTypes.length > 0) {
            selectedEvent.ticketTypes.forEach(t => {
                const qty = selectedTickets[t.id] || 0;
                total += qty * t.price;
            });
        } else {
            // Legacy single ticket
            total = Number(selectedEvent.price || 0);
        }
        return total;
    };

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            if ((window as any).Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleBookingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedEvent) return;
        const currentEvent = selectedEvent;

        // Prepare ticket data
        const bookedTickets: { ticketTypeId: string; ticketTypeName: string; quantity: number; price: number }[] = [];

        if (currentEvent.ticketTypes && currentEvent.ticketTypes.length > 0) {
            currentEvent.ticketTypes.forEach(t => {
                const qty = selectedTickets[t.id] || 0;
                if (qty > 0) {
                    bookedTickets.push({
                        ticketTypeId: t.id,
                        ticketTypeName: t.name,
                        quantity: qty,
                        price: t.price
                    });
                }
            });
        } else {
            // Legacy support: 1 ticket
            bookedTickets.push({
                ticketTypeId: "legacy",
                ticketTypeName: "Standard Entry",
                quantity: 1,
                price: Number(currentEvent.price || 0)
            });
        }

        // Mobile Number Validation
        const mobileRegex = /^\d{10}$/;
        for (let i = 0; i < attendees.length; i++) {
            if (!attendees[i].name.trim()) {
                toast({
                    title: `Missing Name`,
                    description: `Please enter the name for attendee ${i + 1}.`,
                    variant: "destructive"
                });
                return;
            }
            if (!attendees[i].place?.trim()) {
                toast({
                    title: `Missing Location`,
                    description: `Please enter the place/city for attendee ${i + 1}.`,
                    variant: "destructive"
                });
                return;
            }
            if (!mobileRegex.test(attendees[i].mobile)) {
                toast({
                    title: `Invalid Mobile Number`,
                    description: `Please enter a valid 10-digit mobile number for ${attendees[i].name || 'attendee ' + (i + 1)}.`,
                    variant: "destructive"
                });
                return;
            }
        }

        const totalAmount = calculateTotal();

        // If it's a free event, skip Razorpay
        if (totalAmount === 0) {
            setBookingLoading(true);
            try {
                const result = await createBooking({
                    eventId: currentEvent.id!,
                    hostId: currentEvent.hostId,
                    userId: user?.uid || null,
                    isGuest: !user,
                    userName: attendees[0].name,
                    userEmail: bookingFormData.email,
                    userMobile: attendees[0].mobile,
                    attendees: attendees,
                    eventTitle: currentEvent.title,
                    eventDate: currentEvent.startDate || currentEvent.date || "",
                    eventTime: currentEvent.startTime || currentEvent.time || "",
                    eventVenue: currentEvent.locationType === "physical" ? (currentEvent.venueName || currentEvent.venue || "TBD") : "Online Event",
                    tickets: bookedTickets,
                    totalPrice: "0",
                    status: "confirmed",
                });

                if (result.success && result.bookingId) {
                    setSuccessData({ id: result.bookingId, event: currentEvent.title });
                    setBookingFormOpen(false);
                }
            } catch (error) {
                toast({ title: "Booking Failed", description: "Unable to process your booking.", variant: "destructive" });
            } finally {
                setBookingLoading(false);
            }
            return;
        }

        // Paid booking - Razorpay flow
        setBookingLoading(true);

        try {
            const res = await loadRazorpay();
            if (!res) {
                toast({ title: "Error", description: "Razorpay SDK failed to load. Check your connection.", variant: "destructive" });
                setBookingLoading(false);
                return;
            }

            // 1. Create Order
            const orderRes = await fetch('/api/razorpay/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: totalAmount,
                    bookingData: {
                        eventTitle: currentEvent.title,
                        userName: attendees[0].name,
                        userMobile: attendees[0].mobile
                    }
                }),
            });

            const orderData = await orderRes.json();
            if (!orderRes.ok) throw new Error(orderData.error || "Order creation failed");

            // 2. Open Checkout
            const options = {
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "BizRoom Events",
                description: `Ticket for ${currentEvent.title}`,
                order_id: orderData.id,
                prefill: {
                    name: attendees[0].name,
                    email: bookingFormData.email,
                    contact: attendees[0].mobile,
                },
                theme: { color: "#1fb2a6" },
                handler: async function (response: any) {
                    try {
                        // 3. Complete Booking
                        const result = await createBooking({
                            eventId: currentEvent.id!,
                            hostId: currentEvent.hostId,
                            userId: user?.uid || null,
                            isGuest: !user,
                            userName: attendees[0].name,
                            userEmail: bookingFormData.email,
                            userMobile: attendees[0].mobile,
                            attendees: attendees,
                            eventTitle: currentEvent.title,
                            eventDate: currentEvent.startDate || currentEvent.date || "",
                            eventTime: currentEvent.startTime || currentEvent.time || "",
                            eventVenue: currentEvent.locationType === "physical" ? (currentEvent.venueName || currentEvent.venue || "TBD") : "Online Event",
                            tickets: bookedTickets,
                            totalPrice: String(totalAmount),
                            status: "confirmed",
                            paymentId: response.razorpay_payment_id,
                            orderId: response.razorpay_order_id,
                            signature: response.razorpay_signature
                        });

                        if (result.success && result.bookingId) {
                            setSuccessData({ id: result.bookingId, event: currentEvent.title });
                            setBookingFormOpen(false);
                        } else {
                            throw new Error("Failed to save booking");
                        }
                    } catch (error: any) {
                        console.error(error);
                        toast({ title: "Payment Successful but Booking Failed", description: "Please contact support with payment ID: " + response.razorpay_payment_id, variant: "destructive" });
                    }
                },
                modal: {
                    ondismiss: function () {
                        setBookingLoading(false);
                    }
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();

        } catch (error: any) {
            console.error(error);
            toast({
                title: "Payment Error",
                description: error.message || "Unable to start payment process.",
                variant: "destructive"
            });
            setBookingLoading(false);
        }
    };

    const isBookingInvalid = !selectedEvent || (selectedEvent.ticketTypes && selectedEvent.ticketTypes.length > 0 && Object.values(selectedTickets).reduce((a, b) => a + b, 0) === 0);

    const handleShare = async () => {
        if (!successData) return;
        const shareText = `I just booked a ticket for ${successData.event} on BizRoom! Booking ID: ${successData.id}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Ticket Booked!',
                    text: shareText,
                    url: `${window.location.origin}/tickets/receipt/${successData.id}`,
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            navigator.clipboard.writeText(shareText);
            toast({
                title: "Copied to clipboard!",
                description: "Booking details copied to clipboard."
            });
        }
    };

    const locationsList = Array.from(new Set(events.map(e => e.venueName || e.venue || "").filter(Boolean)));

    const filteredEvents = events.filter(event => {
        const venueCheck = event.venueName || event.venue || ""; // Handle new/old
        const matchesSearch = !searchQuery.trim() || 
            event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            venueCheck.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (event.category && event.category.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesCategory = selectedCategory === "All" || event.category === selectedCategory;
        const matchesLocation = selectedLocation === "All" || venueCheck.toLowerCase().includes(selectedLocation.toLowerCase());
        
        let matchesDate = true;
        if (selectedDate !== "All" && event.date) {
            const eventDateObj = new Date(event.date);
            const today = new Date();
            if (selectedDate === "Today") {
                matchesDate = eventDateObj.toDateString() === today.toDateString();
            } else if (selectedDate === "This Weekend") {
                const day = today.getDay();
                const diffToSat = (6 - day + 7) % 7;
                const saturday = new Date(today);
                saturday.setDate(today.getDate() + diffToSat);
                const sunday = new Date(saturday);
                sunday.setDate(saturday.getDate() + 1);
                matchesDate = eventDateObj.toDateString() === saturday.toDateString() || eventDateObj.toDateString() === sunday.toDateString();
            } else if (selectedDate === "This Month") {
                matchesDate = eventDateObj.getMonth() === today.getMonth() && eventDateObj.getFullYear() === today.getFullYear();
            }
        }

        return matchesSearch && matchesCategory && matchesLocation && matchesDate;
    });

    const formatDate = (dateString: string) => {
        if (!dateString) return "TBD";
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getPriceDisplay = (event: EventData) => {
        if (event.ticketTypes && event.ticketTypes.length > 0) {
            const prices = event.ticketTypes.map(t => t.price);
            const minPrice = Math.min(...prices);
            return minPrice === 0 ? "Free" : `From ₹${minPrice}`;
        }
        // Fallback for legacy events
        return event.price === "0" ? "Free" : `₹${event.price}`;
    };

    return (
        <div className="min-h-screen bg-slate-50/50 relative">
            {/* Transparent Header overlaying TubesBackground */}
            <header className="absolute top-0 w-full py-5 px-6 md:px-12 z-50 border-b border-white/10 bg-slate-950/40 backdrop-blur-md">
                <div className="container mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src="/favicon.svg" alt="BizRoom Logo" className="h-9 w-9 object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]" />
                        <h1 className="text-xl md:text-2xl font-jakarta font-black text-white tracking-tight">BizRoom <span className="text-cyan-400 font-black">Events</span></h1>
                    </div>

                    {/* Navigation Links - Removed Venues & Categories as requested */}
                    <nav className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-300">
                        <a href="/tickets" className="text-cyan-400 border-b-2 border-cyan-400 pb-1">Home</a>
                        <a href="#events-section" className="hover:text-white transition-colors">Events</a>
                        <a href="#" className="hover:text-white transition-colors">Organizers</a>
                        <a href="#" className="hover:text-white transition-colors">Become Organizer</a>
                        <a href="#" className="hover:text-white transition-colors">Pricing</a>
                    </nav>

                    <div className="flex items-center">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setGuestModalOpen(true)} 
                            className="rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-white hover:text-white font-bold px-5 transition-all"
                        >
                            My Bookings
                        </Button>
                    </div>
                </div>
            </header>

            {/* Pure Light Streak Hero Section Matching Reference Screenshot 1-to-1 */}
            <section className="relative w-full z-10 overflow-hidden bg-slate-950 min-h-[85vh] flex flex-col justify-center">
                <TubesBackground className="min-h-[85vh]">
                    <div className="container mx-auto px-6 md:px-12 h-full flex flex-col justify-center pt-28 pb-12 pointer-events-none relative z-10">
                        <div className="max-w-6xl mx-auto w-full pointer-events-auto flex flex-col space-y-7">
                            
                            {/* Top Pill Badge */}
                            <motion.div
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                            >
                                <div className="inline-flex items-center gap-2 bg-cyan-950/60 border border-cyan-500/30 rounded-full px-4 py-1.5 backdrop-blur-md shadow-lg shadow-cyan-500/10">
                                    <Rocket className="h-3.5 w-3.5 text-cyan-400" />
                                    <span className="text-cyan-300 text-xs font-bold uppercase tracking-wider">PREMIUM EVENT BOOKING PLATFORM</span>
                                </div>
                            </motion.div>

                            {/* Headline with Clash Display Font (Weight: 700, Size: 92px, Letter Spacing: -3px) */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="space-y-1 text-left"
                            >
                                <h1 className="text-[44px] sm:text-[68px] md:text-[80px] lg:text-[92px] font-clash font-bold text-white tracking-[-3px] leading-[0.95]">
                                    Discover &amp; Book
                                </h1>
                                <h2 className="text-[44px] sm:text-[68px] md:text-[80px] lg:text-[92px] font-clash font-bold text-cyan-400 tracking-[-3px] leading-[0.95]">
                                    Incredible Events
                                </h2>
                                <p className="text-slate-300/90 text-base md:text-xl font-jakarta font-medium leading-relaxed max-w-2xl pt-3">
                                    Conferences, workshops, concerts, networking events and more with industry leading brands.
                                </p>
                            </motion.div>

                            {/* Trust Badges matching Reference Image: 3 Items */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.5, delay: 0.15 }}
                                className="flex flex-wrap items-center gap-6 pt-1 text-slate-200 text-sm font-semibold"
                            >
                                <div className="flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-cyan-400 shrink-0" />
                                    <span>Verified Organizers</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                                    <span>Secure Payments</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <QrCode className="h-4 w-4 text-cyan-400 shrink-0" />
                                    <span>Instant QR Tickets</span>
                                </div>
                            </motion.div>

                            {/* Interactive Multi-Column Search Bar matching Reference Screenshot */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                                className="w-full bg-slate-950/80 border border-cyan-500/20 rounded-2xl p-2.5 shadow-2xl backdrop-blur-xl flex flex-col lg:flex-row items-stretch gap-2 mt-4"
                            >
                                {/* Query Input */}
                                <div className="flex-1 flex items-center px-4 py-2 border-b lg:border-b-0 lg:border-r border-white/10">
                                    <Search className="text-cyan-400 h-5 w-5 mr-3 shrink-0" />
                                    <Input
                                        type="text"
                                        placeholder="Search events, organizers, venues..."
                                        className="border-none bg-transparent text-white placeholder-slate-400 focus-visible:ring-0 text-sm md:text-base h-10 p-0 shadow-none"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                {/* Location Select */}
                                <div className="flex items-center px-4 py-2 border-b lg:border-b-0 lg:border-r border-white/10 shrink-0 min-w-[170px]">
                                    <MapPin className="text-cyan-400 h-4 w-4 mr-2.5 shrink-0" />
                                    <div className="flex flex-col text-left w-full">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">LOCATION</span>
                                        <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                                            <SelectTrigger className="h-6 p-0 border-none bg-transparent text-xs font-bold text-white focus:ring-0 shadow-none [&>svg]:text-white/70">
                                                <SelectValue placeholder="Current Location" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                <SelectItem value="All">Current Location</SelectItem>
                                                {locationsList.map(loc => (
                                                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Date Select */}
                                <div className="flex items-center px-4 py-2 border-b lg:border-b-0 lg:border-r border-white/10 shrink-0 min-w-[150px]">
                                    <Calendar className="text-cyan-400 h-4 w-4 mr-2.5 shrink-0" />
                                    <div className="flex flex-col text-left w-full">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">DATE</span>
                                        <Select value={selectedDate} onValueChange={setSelectedDate}>
                                            <SelectTrigger className="h-6 p-0 border-none bg-transparent text-xs font-bold text-white focus:ring-0 shadow-none [&>svg]:text-white/70">
                                                <SelectValue placeholder="This Weekend" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                <SelectItem value="All">Anytime</SelectItem>
                                                <SelectItem value="Today">Today</SelectItem>
                                                <SelectItem value="This Weekend">This Weekend</SelectItem>
                                                <SelectItem value="This Month">This Month</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Category Select */}
                                <div className="flex items-center px-4 py-2 shrink-0 min-w-[160px]">
                                    <Filter className="text-cyan-400 h-4 w-4 mr-2.5 shrink-0" />
                                    <div className="flex flex-col text-left w-full">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">CATEGORY</span>
                                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                            <SelectTrigger className="h-6 p-0 border-none bg-transparent text-xs font-bold text-white focus:ring-0 shadow-none [&>svg]:text-white/70">
                                                <SelectValue placeholder="All Categories" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-900 border-white/10 text-white">
                                                {categories.map(cat => (
                                                    <SelectItem key={cat} value={cat}>{cat === "All" ? "All Categories" : cat}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Search Button */}
                                <Button 
                                    onClick={() => {
                                        const el = document.getElementById("events-section");
                                        if (el) el.scrollIntoView({ behavior: "smooth" });
                                    }}
                                    className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold rounded-xl h-12 px-7 text-sm shrink-0 shadow-lg shadow-cyan-500/25 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    Search Events <ArrowRight className="h-4 w-4" />
                                </Button>
                            </motion.div>

                        </div>
                    </div>
                </TubesBackground>
            </section>

            <main id="events-section" className="container mx-auto px-6 py-12">

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center py-24">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Events Grid */}
                {!loading && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredEvents.map((event, index) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.08, duration: 0.4 }}
                            >
                                <Card className="h-full border border-slate-100 shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 bg-white flex flex-col rounded-3xl overflow-hidden group">
                                    <div className="relative h-52 overflow-hidden bg-slate-100 shrink-0">
                                        <EventImage imageUrl={event.imageUrl} title={event.title} />
                                        <div className="absolute top-4 left-4">
                                            <Badge className={`border px-3 py-1 rounded-full font-bold shadow-sm backdrop-blur-sm bg-white/95 ${getCategoryColor(event.category)}`}>
                                                {event.category}
                                            </Badge>
                                        </div>
                                        <div className="absolute top-4 right-4">
                                            <Badge variant="secondary" className="backdrop-blur-md shadow-sm bg-slate-900/80 text-white font-bold border-none px-3 py-1 rounded-full">
                                                {getPriceDisplay(event)}
                                            </Badge>
                                        </div>
                                    </div>
                                    <CardHeader className="pb-2 pt-5 px-6">
                                        <CardTitle className="text-xl font-bold font-headline line-clamp-2 text-slate-900 group-hover:text-primary transition-colors leading-snug">{event.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pb-5 px-6 flex-grow">
                                        <div className="flex flex-col gap-2.5">
                                            <div className="flex items-center text-slate-500 text-xs font-semibold">
                                                <Calendar className="h-4 w-4 mr-2 text-primary shrink-0" />
                                                <span>{formatDate(event.startDate || event.date || "")}</span>
                                                <span className="mx-2 text-slate-300">•</span>
                                                <Clock className="h-4 w-4 mr-1.5 text-primary shrink-0" />
                                                <span>{event.startTime || event.time || ""}</span>
                                            </div>
                                            <div className="flex items-start text-slate-500 text-xs font-semibold">
                                                {event.locationType === "online" || event.isOnline ? (
                                                    <Video className="h-4 w-4 mr-2 text-primary shrink-0 mt-0.5" />
                                                ) : (
                                                    <MapPin className="h-4 w-4 mr-2 text-primary shrink-0 mt-0.5" />
                                                )}
                                                <span className="line-clamp-1 leading-normal">
                                                    {event.locationType === "online" || event.isOnline ? "Online Event" : (event.venueName || event.venue)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="line-clamp-3 text-xs text-slate-400 leading-relaxed font-medium pt-1 border-t border-slate-50">
                                            {event.description}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-0 pb-6 px-6 mt-auto">
                                        <Button
                                            className="w-full bg-slate-900 hover:bg-primary text-white hover:text-white font-bold shadow-md rounded-2xl h-12 transition-all duration-300 group-hover:shadow-lg group-hover:shadow-primary/10"
                                            onClick={() => handleOpenBooking(event)}
                                        >
                                            Book Ticket <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}

                {!loading && filteredEvents.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-slate-400 text-lg font-medium">No events found matching your search criteria.</p>
                        <Button variant="link" onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }} className="mt-2 text-primary font-bold">Clear Filters</Button>
                    </div>
                )}
            </main>

            {/* Booking Form Dialog */}
            <Dialog open={bookingFormOpen} onOpenChange={(open) => { setBookingFormOpen(open); if (!open) setSelectedTickets({}); }}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Book Ticket</DialogTitle>
                        <DialogDescription>
                            {selectedEvent?.title}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedEvent && (
                        <form onSubmit={handleBookingSubmit} className="space-y-6 py-2">

                            {/* Ticket Selection */}
                            <div className="space-y-4">
                                <Label className="text-base font-semibold">Select Tickets</Label>
                                {selectedEvent.ticketTypes && selectedEvent.ticketTypes.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedEvent.ticketTypes.map(ticket => (
                                            <div key={ticket.id} className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/30">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">{ticket.name}</span>
                                                        <Badge variant={ticket.type === "free" ? "secondary" : "default"} className="text-xs">
                                                            {ticket.type === "free" ? "Free" : `₹${ticket.price}`}
                                                        </Badge>
                                                    </div>
                                                    {ticket.quantity <= 0 && (
                                                        <span className="text-xs text-destructive font-bold mt-0.5">Sold Out</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    {ticket.quantity > 0 ? (
                                                        <div className="flex items-center gap-2">
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                disabled={(selectedTickets[ticket.id] || 0) <= 0}
                                                                onClick={() => handleTicketChange(ticket.id, -1, ticket.maxPerUser)}
                                                            >
                                                                -
                                                            </Button>
                                                            <span className="w-6 text-center font-mono">{selectedTickets[ticket.id] || 0}</span>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                disabled={(selectedTickets[ticket.id] || 0) >= Math.min(ticket.quantity, ticket.maxPerUser)}
                                                                onClick={() => handleTicketChange(ticket.id, 1, Math.min(ticket.quantity, ticket.maxPerUser))}
                                                            >
                                                                +
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <Badge variant="destructive">Sold Out</Badge>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 border rounded-lg bg-muted/20 text-center">
                                        <p className="text-muted-foreground">Standard Entry</p>
                                        <Badge className="mt-2">{selectedEvent.price === "0" ? "Free" : `₹${selectedEvent.price}`}</Badge>
                                        <p className="text-xs text-muted-foreground mt-2">Single ticket per booking for legacy events.</p>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-2 border-t mt-2">
                                    <span className="font-semibold">Total</span>
                                    <span className="text-xl font-bold">₹{calculateTotal()}</span>
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t">
                                <Label className="text-base font-semibold">Contact & Attendee Details</Label>

                                {/* Primary Email */}
                                <div className="space-y-2 bg-primary/5 p-4 rounded-xl border border-primary/10">
                                    <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wider">Email Address (For Confirmation) <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        value={bookingFormData.email}
                                        onChange={(e) => setBookingFormData(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="john@example.com"
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Important: Your ticket and QR code will be sent to this email.</p>
                                </div>

                                {/* Attendee List */}
                                <div className="space-y-6 pt-2">
                                    {attendees.map((attendee, index) => (
                                        <div key={index} className="space-y-4 p-5 border border-slate-100 rounded-2xl bg-slate-50/50 shadow-sm relative pt-8 mt-4">
                                            <div className="absolute -top-3 left-4 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-md shadow-primary/10">
                                                Attendee {index + 1}
                                            </div>
 
                                            <div className="space-y-1.5 mt-2">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Full Name <span className="text-red-500">*</span></Label>
                                                <Input
                                                    required
                                                    value={attendee.name}
                                                    onChange={(e) => {
                                                        const next = [...attendees];
                                                        next[index].name = e.target.value;
                                                        setAttendees(next);
                                                    }}
                                                    placeholder={`Name of Attendee ${index + 1}`}
                                                    className="h-10 bg-white border-slate-200 focus-visible:ring-primary rounded-xl"
                                                />
                                            </div>
 
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mobile Number <span className="text-red-500">*</span></Label>
                                                <Input
                                                    type="tel"
                                                    required
                                                    value={attendee.mobile}
                                                    onChange={(e) => {
                                                        const next = [...attendees];
                                                        next[index].mobile = e.target.value;
                                                        setAttendees(next);
                                                    }}
                                                    placeholder="10-digit mobile number"
                                                    maxLength={10}
                                                    className="h-10 bg-white border-slate-200 focus-visible:ring-primary rounded-xl"
                                                />
                                            </div>
 
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Place / City <span className="text-red-500">*</span></Label>
                                                <Input
                                                    required
                                                    value={attendee.place}
                                                    onChange={(e) => {
                                                        const next = [...attendees];
                                                        next[index].place = e.target.value;
                                                        setAttendees(next);
                                                    }}
                                                    placeholder="e.g. Chennai, Bangalore"
                                                    className="h-10 bg-white border-slate-200 focus-visible:ring-primary rounded-xl"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <DialogFooter className="pt-4 sticky bottom-0 bg-background pb-2">
                                <Button type="button" variant="outline" onClick={() => setBookingFormOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isBookingInvalid || bookingLoading}>
                                    {bookingLoading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                                    ) : (
                                        "Confirm Booking"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Success Dialog */}
            <Dialog open={!!successData} onOpenChange={(open) => !open && setSuccessData(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-green-600">
                            <CheckCircle2 className="h-6 w-6" /> Booking Confirmed!
                        </DialogTitle>
                        <DialogDescription>
                            You have successfully booked a ticket for <strong>{successData?.event}</strong>.
                            <br /><span className="mt-2 block text-xs">A confirmation email has been sent to your inbox.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-lg border border-dashed">
                        <span className="text-sm text-muted-foreground mb-1 uppercase tracking-wider">Booking ID</span>
                        <span className="text-3xl font-mono font-bold text-primary tracking-widest">{successData?.id}</span>
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={() => setSuccessData(null)} className="flex-1">Close</Button>
                        <Button asChild className="flex-1">
                            <Link href={`/tickets/receipt/${successData?.id}`}>View & Save Ticket</Link>
                        </Button>
                        <Button onClick={handleShare} variant="secondary" className="gap-2 shrink-0">
                            <Share2 className="h-4 w-4" /> Share
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Guest Bookings OTP Modal */}
            <GuestBookingsModal open={guestModalOpen} onOpenChange={setGuestModalOpen} />

            {/* CTA Section */}
            <CtaFooter />

            {/* Footer */}
            <div id="contact">
                <KresnaFooter />
            </div>
        </div>
    );
}
