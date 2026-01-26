"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Search, Clock, ArrowRight, Loader2, CheckCircle2, Share2, Video, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
    const [events, setEvents] = useState<EventData[]>([]);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [successData, setSuccessData] = useState<{ id: string, event: string } | null>(null);

    const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
    const [bookingFormOpen, setBookingFormOpen] = useState(false);

    // Multi-Ticket Selection State: { [ticketId]: quantity }
    const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});

    const [bookingFormData, setBookingFormData] = useState({
        name: "",
        email: "",
        mobile: ""
    });

    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const categories = ["All", "Conference", "Workshop", "Networking", "Concert", "Festival", "Exhibition", "Party", "Sports", "Other"];

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                setBookingFormData(prev => ({
                    ...prev,
                    name: currentUser.displayName || "",
                    // email: currentUser.email || ""  -- Removed as per requirement
                    email: ""
                }));
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

    const handleOpenBooking = (event: EventData) => {
        setSelectedEvent(event);
        setSelectedTickets({}); // Reset selection
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

    const handleBookingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedEvent) return;

        // Prepare ticket data
        const bookedTickets: { ticketTypeId: string; ticketTypeName: string; quantity: number; price: number }[] = [];

        if (selectedEvent.ticketTypes && selectedEvent.ticketTypes.length > 0) {
            selectedEvent.ticketTypes.forEach(t => {
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
                price: Number(selectedEvent.price || 0)
            });
        }

        if (bookedTickets.length === 0) {
            toast({ title: "Select Tickets", description: "Please select at least one ticket.", variant: "destructive" });
            return;
        }

        // Mobile Number Validation
        const mobileRegex = /^\d{10}$/;
        if (!mobileRegex.test(bookingFormData.mobile)) {
            toast({
                title: "Invalid Mobile Number",
                description: "Please enter a valid 10-digit mobile number.",
                variant: "destructive"
            });
            return;
        }

        setBookingLoading(true);

        try {
            const result = await createBooking({
                eventId: selectedEvent.id!,
                hostId: selectedEvent.hostId,
                userId: user?.uid,
                isGuest: !user,
                userName: bookingFormData.name,
                userEmail: bookingFormData.email,
                userMobile: bookingFormData.mobile,
                eventTitle: selectedEvent.title,
                eventDate: selectedEvent.startDate || selectedEvent.date, // Fallback
                eventTime: selectedEvent.startTime || selectedEvent.time, // Fallback
                eventVenue: selectedEvent.locationType === "physical" ? selectedEvent.venueName! : "Online Event",

                tickets: bookedTickets,
                totalPrice: String(calculateTotal()),
                status: "confirmed",
            });

            if (result.success && result.bookingId) {
                setSuccessData({
                    id: result.bookingId,
                    event: selectedEvent.title
                });
                setBookingFormOpen(false);
            } else {
                throw new Error("Booking failed");
            }
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Booking Failed",
                description: "Unable to process your booking. Please try again.",
                variant: "destructive"
            });
        } finally {
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
                    url: window.location.href,
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

    const filteredEvents = events.filter(event => {
        const venueCheck = event.venueName || event.venue || ""; // Handle new/old
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            venueCheck.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "All" || event.category === selectedCategory;
        return matchesSearch && matchesCategory;
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
        <div className="min-h-screen bg-background-light">
            <header className="bg-background/80 backdrop-blur-md sticky top-0 z-50 border-b">
                <div className="container mx-auto py-4 px-4 flex justify-between items-center">
                    <h1 className="text-2xl font-headline font-bold text-foreground">BizRoom <span className="text-primary">Events</span></h1>
                    <Button variant="outline" size="sm" asChild>
                        <a href="/dashboard/bookings">My Bookings</a>
                    </Button>
                </div>
            </header>

            <main className="container mx-auto px-4 py-8 md:py-12">
                {/* Hero / Search Section */}
                <section className="mb-12 text-center max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h2 className="text-4xl md:text-5xl font-headline font-bold mb-4 text-foreground">Discover Incredible Events</h2>
                        <p className="text-muted-foreground mb-8 text-lg">Book tickets for conferences, workshops, concerts, and more.</p>

                        <div className="relative max-w-lg mx-auto mb-8">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
                            <Input
                                type="text"
                                placeholder="Search events, venues..."
                                className="pl-10 h-12 rounded-full shadow-sm border-muted-foreground/20 focus-visible:ring-primary text-base"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-wrap justify-center gap-2">
                            {categories.map((cat) => (
                                <Button
                                    key={cat}
                                    variant={selectedCategory === cat ? "default" : "outline"}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`rounded-full ${selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                                >
                                    {cat}
                                </Button>
                            ))}
                        </div>
                    </motion.div>
                </section>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                )}

                {/* Events Grid */}
                {!loading && (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {filteredEvents.map((event, index) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="h-full border-none shadow-lg overflow-hidden group hover:shadow-2xl transition-all hover:-translate-y-1 bg-white flex flex-col">
                                    <div className="relative h-48 overflow-hidden bg-muted shrink-0">
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
                                        <div className="absolute top-4 left-4">
                                            <Badge className="bg-white/90 text-foreground hover:bg-white backdrop-blur-sm font-bold">
                                                {event.category}
                                            </Badge>
                                        </div>
                                        <div className="absolute top-4 right-4">
                                            <Badge variant="secondary" className="backdrop-blur-sm shadow-sm backdrop-saturate-150 bg-white/70">
                                                {getPriceDisplay(event)}
                                            </Badge>
                                        </div>
                                    </div>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-xl font-bold font-headline line-clamp-2">{event.title}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pb-4 flex-grow">
                                        <div className="flex items-center text-muted-foreground text-sm">
                                            <Calendar className="h-4 w-4 mr-2 text-primary" />
                                            <span>{formatDate(event.startDate || event.date)}</span>
                                            <span className="mx-2">•</span>
                                            <Clock className="h-4 w-4 mr-1 text-primary" />
                                            <span>{event.startTime || event.time}</span>
                                        </div>
                                        <div className="flex items-start text-muted-foreground text-sm">
                                            {event.locationType === "online" || event.isOnline ? (
                                                <Video className="h-4 w-4 mr-2 mt-1 text-primary shrink-0" />
                                            ) : (
                                                <MapPin className="h-4 w-4 mr-2 mt-1 text-primary shrink-0" />
                                            )}
                                            <span className="line-clamp-1">
                                                {event.locationType === "online" || event.isOnline ? "Online Event" : (event.venueName || event.venue)}
                                            </span>
                                        </div>
                                        <div className="line-clamp-2 text-sm text-muted-foreground/80">
                                            {event.description}
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-0 mt-auto">
                                        <Button
                                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md rounded-lg h-11"
                                            onClick={() => handleOpenBooking(event)}
                                        >
                                            Book Ticket <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}

                {!loading && filteredEvents.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-muted-foreground text-lg">No events found matching your criteria.</p>
                        <Button variant="link" onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }} className="mt-2 text-primary">Clear Filters</Button>
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
                                                    <span className="text-xs text-muted-foreground mt-0.5">
                                                        {ticket.quantity > 0 ? `${ticket.quantity} available` : "Sold Out"}
                                                    </span>
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
                                <Label className="text-base font-semibold">Attendee Details</Label>
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-xs text-muted-foreground uppercase tracking-wider">Full Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="name"
                                        required
                                        value={bookingFormData.name}
                                        onChange={(e) => setBookingFormData(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wider">Email Address <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        required
                                        value={bookingFormData.email}
                                        onChange={(e) => setBookingFormData(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="john@example.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mobile" className="text-xs text-muted-foreground uppercase tracking-wider">Mobile Number <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="mobile"
                                        type="tel"
                                        required
                                        value={bookingFormData.mobile}
                                        onChange={(e) => setBookingFormData(prev => ({ ...prev, mobile: e.target.value }))}
                                        placeholder="+91 98765 43210"
                                        maxLength={10}
                                        pattern="\d{10}"
                                    />
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
                    <DialogFooter className="sm:justify-between gap-2">
                        <Button variant="outline" onClick={() => setSuccessData(null)}>Close</Button>
                        <Button onClick={handleShare} className="gap-2 w-full sm:w-auto">
                            <Share2 className="h-4 w-4" /> Share Now
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
