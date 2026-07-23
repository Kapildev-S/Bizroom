"use client";

import { useEffect, useState, useMemo } from "react";
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
    ExternalLink,
    Download,
    DollarSign,
    Ticket,
    TrendingUp,
    CheckCircle2,
    Search,
    QrCode,
    Edit3,
    BarChart3,
    PieChart as PieIcon,
    Clock,
    Globe
} from "lucide-react";
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    CartesianGrid
} from "recharts";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

function EventImage({ imageUrl, title }: { imageUrl?: string; title: string }) {
    const [error, setError] = useState(false);

    if (imageUrl && !error) {
        return (
            <img
                src={imageUrl}
                alt={title}
                onError={() => setError(true)}
                className="w-12 h-12 object-cover rounded-xl shrink-0"
            />
        );
    }

    return (
        <div className="w-12 h-12 flex items-center justify-center bg-primary/10 rounded-xl shrink-0 border border-primary/20">
            <Calendar className="h-6 w-6 text-primary" />
        </div>
    );
}

const TIER_COLORS = ["#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"];

export default function EventDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const eventId = params.id as string;

    const [event, setEvent] = useState<EventData | null>(null);
    const [bookings, setBookings] = useState<BookingData[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                try {
                    const fetchedEvent = await getEventById(eventId);
                    const isAdmin = currentUser.uid === '3l2SpTceF9Qany7x5IRHdHBPU9J3';

                    if (fetchedEvent && fetchedEvent.hostId !== currentUser.uid && !isAdmin) {
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

    // Analytics Calculations
    const analytics = useMemo(() => {
        let totalRevenue = 0;
        let totalTicketsSold = 0;
        let checkedInCount = 0;

        const tierMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
        const dailyMap: Record<string, { date: string; revenue: number; tickets: number }> = {};

        bookings.forEach(booking => {
            const isConfirmed = booking.status === "confirmed";
            const amount = Number(booking.totalPrice) || 0;

            if (isConfirmed) {
                totalRevenue += amount;
            }

            // Check-in count
            if (booking.attendeeCheckIns && booking.attendeeCheckIns.length > 0) {
                checkedInCount += booking.attendeeCheckIns.length;
            } else if (booking.checkedIn) {
                checkedInCount += 1;
            }

            // Dates & Timelines
            let dateStr = "Recent";
            if (booking.createdAt?.seconds) {
                dateStr = new Date(booking.createdAt.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            }

            if (!dailyMap[dateStr]) {
                dailyMap[dateStr] = { date: dateStr, revenue: 0, tickets: 0 };
            }

            // Ticket Tiers
            if (booking.tickets && booking.tickets.length > 0) {
                booking.tickets.forEach(t => {
                    totalTicketsSold += t.quantity;
                    const tierName = t.ticketTypeName || "Standard";
                    if (!tierMap[tierName]) {
                        tierMap[tierName] = { name: tierName, quantity: 0, revenue: 0 };
                    }
                    tierMap[tierName].quantity += t.quantity;
                    tierMap[tierName].revenue += (Number(t.price) || 0) * t.quantity;

                    if (isConfirmed) {
                        dailyMap[dateStr].tickets += t.quantity;
                    }
                });
            } else {
                // Fallback
                totalTicketsSold += 1;
                const tierName = (booking as any).ticketTypeName || "Standard";
                if (!tierMap[tierName]) {
                    tierMap[tierName] = { name: tierName, quantity: 0, revenue: 0 };
                }
                tierMap[tierName].quantity += 1;
                tierMap[tierName].revenue += amount;

                if (isConfirmed) {
                    dailyMap[dateStr].tickets += 1;
                }
            }

            if (isConfirmed) {
                dailyMap[dateStr].revenue += amount;
            }
        });

        const tierList = Object.values(tierMap).map((tier, idx) => ({
            ...tier,
            color: TIER_COLORS[idx % TIER_COLORS.length]
        }));

        const timelineList = Object.values(dailyMap);

        return {
            totalRevenue,
            totalTicketsSold,
            checkedInCount,
            totalOrders: bookings.length,
            tierList,
            timelineList
        };
    }, [bookings]);

    // Filtered Attendees for table search
    const filteredBookings = useMemo(() => {
        if (!searchQuery.trim()) return bookings;
        const q = searchQuery.toLowerCase().trim();
        return bookings.filter(b =>
            (b.userName && b.userName.toLowerCase().includes(q)) ||
            (b.userEmail && b.userEmail.toLowerCase().includes(q)) ||
            (b.bookingId && b.bookingId.toLowerCase().includes(q)) ||
            (b.attendees && b.attendees.some(a => a.name.toLowerCase().includes(q)))
        );
    }, [bookings, searchQuery]);

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

    const handleExportCSV = () => {
        if (!bookings.length || !event) return;

        const headers = [
            "Booking ID",
            "Booked By",
            "Contact Email",
            "Contact Mobile",
            "Attendee Name",
            "Attendee Mobile",
            "Ticket Selection",
            "Booking Date",
            "Payment Status",
            "Payment ID",
            "Admission Status"
        ];

        const rows: string[][] = [];

        bookings.forEach(booking => {
            const ticketSummary = booking.tickets ? booking.tickets.map(t => `${t.quantity}x ${t.ticketTypeName}`).join(" | ") : "1x Standard";
            const bookedDate = booking.createdAt?.seconds
                ? new Date(booking.createdAt.seconds * 1000).toLocaleDateString()
                : "N/A";

            if (booking.attendees && booking.attendees.length > 0) {
                booking.attendees.forEach((att, idx) => {
                    const isAdmitted = booking.attendeeCheckIns?.some(ci => ci.attendeeIndex === idx);
                    rows.push([
                        booking.bookingId,
                        booking.userName,
                        booking.userEmail,
                        booking.userMobile || "N/A",
                        att.name,
                        att.mobile,
                        ticketSummary,
                        bookedDate,
                        booking.status,
                        booking.paymentId || "N/A",
                        isAdmitted ? "ADMITTED" : "WAITING"
                    ]);
                });
            } else {
                rows.push([
                    booking.bookingId,
                    booking.userName,
                    booking.userEmail,
                    booking.userMobile || "N/A",
                    booking.userName,
                    booking.userMobile || "N/A",
                    ticketSummary,
                    bookedDate,
                    booking.status,
                    booking.paymentId || "N/A",
                    booking.checkedIn ? "ADMITTED" : "WAITING"
                ]);
            }
        });

        const csvContent = [
            headers.join(","),
            ...rows.map(row => row.map(cell => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${event.title.replace(/\s+/g, '_')}_Attendees.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
                <div className="h-52 rounded-3xl bg-slate-900/60 border border-slate-800 animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-32 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
                    ))}
                </div>
                <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                    <span className="text-sm font-medium">Loading event dashboard…</span>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 text-center px-4">
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
                    <Calendar className="h-8 w-8 text-slate-500" />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-white font-headline">Event Not Found</h2>
                    <p className="text-sm text-slate-400 mt-1">This event may have been removed, or you don't have access to it.</p>
                </div>
                <Button asChild className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl">
                    <Link href="/dashboard/events">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Events
                    </Link>
                </Button>
            </div>
        );
    }

    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/tickets?eventId=${eventId}` : '';
    const eventDateLabel = new Date(event.startDate || event.date || "").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    const getInitials = (name?: string) => {
        if (!name) return "?";
        const parts = name.trim().split(/\s+/);
        return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">

            {/* Hero Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-800 shadow-2xl shadow-black/30 min-h-[300px] md:min-h-[340px]">
                {/* Background layer */}
                <div className="absolute inset-0">
                    {event.imageUrl ? (
                        <>
                            <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-slate-950/55" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/60 via-transparent to-transparent" />
                        </>
                    ) : (
                        <>
                            <div className="absolute inset-0 bg-slate-950" />
                            <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
                            <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />
                        </>
                    )}
                </div>

                {/* Content layer */}
                <div className="absolute inset-0 z-10 p-5 md:p-8 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                        <Button variant="outline" size="icon" asChild className="shrink-0 rounded-xl border-slate-700 bg-slate-900/60 hover:bg-slate-800 backdrop-blur-md">
                            <Link href="/dashboard/events">
                                <ArrowLeft className="h-4 w-4 text-slate-200" />
                            </Link>
                        </Button>

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            <Button variant="outline" size="sm" asChild className="rounded-xl border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 backdrop-blur-md">
                                <Link href={`/dashboard/events/${eventId}/edit`}>
                                    <Edit3 className="mr-1.5 h-4 w-4 text-cyan-400" /> Edit
                                </Link>
                            </Button>

                            <Button variant="outline" size="sm" asChild className="rounded-xl border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 backdrop-blur-md">
                                <Link href="/dashboard/events/scanner">
                                    <QrCode className="mr-1.5 h-4 w-4 text-cyan-400" /> Scan QR
                                </Link>
                            </Button>

                            <Button size="sm" asChild className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-cyan-500/30">
                                <Link href={`/tickets?eventId=${eventId}`} target="_blank">
                                    <ExternalLink className="mr-1.5 h-4 w-4" /> View Public Page
                                </Link>
                            </Button>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 text-xs font-semibold px-2.5 py-1">
                                {event.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs text-slate-300 border-slate-600 bg-slate-900/40 px-2.5 py-1 gap-1.5">
                                <Globe className="h-3 w-3" />
                                {event.isOnline ? "Online Event" : "In-Person"}
                            </Badge>
                        </div>

                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white font-headline max-w-3xl">
                            {event.title}
                        </h2>

                        <div className="flex flex-wrap items-center gap-2.5 mt-4">
                            <span className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-200 bg-slate-900/50 border border-slate-800 rounded-full px-3 py-1.5 backdrop-blur-md">
                                <Calendar className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                                {eventDateLabel}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-200 bg-slate-900/50 border border-slate-800 rounded-full px-3 py-1.5 backdrop-blur-md">
                                <Clock className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                                {event.startTime || event.time}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs sm:text-sm text-slate-200 bg-slate-900/50 border border-slate-800 rounded-full px-3 py-1.5 backdrop-blur-md max-w-full">
                                <MapPin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                                <span className="truncate">{event.venue}</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Overview Stats KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">

                {/* Revenue Card */}
                <Card className="group bg-slate-900/60 border-slate-800 shadow-lg hover:border-emerald-500/40 hover:shadow-emerald-500/5 transition-all duration-300">
                    <CardContent className="p-5 md:p-6">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Gross Revenue</span>
                            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                <DollarSign className="h-5 w-5 text-emerald-400" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-extrabold text-white tabular-nums">₹{analytics.totalRevenue.toLocaleString()}</h3>
                            <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1.5 font-medium">
                                <TrendingUp className="h-3.5 w-3.5" /> Direct Ticket Sales
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Tickets Sold Card */}
                <Card className="group bg-slate-900/60 border-slate-800 shadow-lg hover:border-cyan-500/40 hover:shadow-cyan-500/5 transition-all duration-300">
                    <CardContent className="p-5 md:p-6">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tickets Sold</span>
                            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20 group-hover:scale-110 transition-transform">
                                <Ticket className="h-5 w-5 text-cyan-400" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-extrabold text-white tabular-nums">{analytics.totalTicketsSold}</h3>
                            <p className="text-xs text-slate-400 mt-1.5 font-medium">
                                Across {analytics.totalOrders} order{analytics.totalOrders === 1 ? '' : 's'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Check-ins Card */}
                <Card className="group bg-slate-900/60 border-slate-800 shadow-lg hover:border-purple-500/40 hover:shadow-purple-500/5 transition-all duration-300">
                    <CardContent className="p-5 md:p-6">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Admitted Guests</span>
                            <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20 group-hover:scale-110 transition-transform">
                                <CheckCircle2 className="h-5 w-5 text-purple-400" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-extrabold text-white tabular-nums">
                                {analytics.checkedInCount} <span className="text-sm font-normal text-slate-400">/ {analytics.totalTicketsSold}</span>
                            </h3>
                            <div className="h-1.5 w-full bg-slate-800 rounded-full mt-3 overflow-hidden">
                                <div
                                    className="h-full bg-purple-400 rounded-full transition-all duration-500"
                                    style={{ width: `${analytics.totalTicketsSold > 0 ? Math.round((analytics.checkedInCount / analytics.totalTicketsSold) * 100) : 0}%` }}
                                />
                            </div>
                            <p className="text-xs text-purple-400 mt-1.5 font-medium">
                                {analytics.totalTicketsSold > 0 ? Math.round((analytics.checkedInCount / analytics.totalTicketsSold) * 100) : 0}% Turnout Rate
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Starting Price Card */}
                <Card className="group bg-slate-900/60 border-slate-800 shadow-lg hover:border-blue-500/40 hover:shadow-blue-500/5 transition-all duration-300">
                    <CardContent className="p-5 md:p-6">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Starting Price</span>
                            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 group-hover:scale-110 transition-transform">
                                <Ticket className="h-5 w-5 text-blue-400" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-extrabold text-white">
                                {event.price === "0" || !event.price ? "Free" : `₹${event.price}`}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1.5 font-medium">
                                {event.ticketTypes && event.ticketTypes.length > 0 ? `${event.ticketTypes.length} Ticket Tiers Available` : 'Standard Entry Ticket'}
                            </p>
                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* Visual Analytics Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Sales & Revenue Trend Chart */}
                <Card className="lg:col-span-2 bg-slate-900/60 border-slate-800 shadow-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20 shrink-0">
                                <BarChart3 className="h-5 w-5 text-cyan-400" />
                            </div>
                            <div>
                                <CardTitle className="text-base md:text-lg font-bold text-white">
                                    Revenue &amp; Ticket Timeline
                                </CardTitle>
                                <CardDescription className="text-slate-400 text-xs mt-0.5">
                                    Track ticket sales velocity leading up to event day
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                        {analytics.timelineList.length === 0 ? (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-sm rounded-2xl border border-dashed border-slate-800 bg-slate-950/30">
                                <BarChart3 className="h-10 w-10 mb-2 opacity-30" />
                                No sales data recorded yet.
                            </div>
                        ) : (
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analytics.timelineList}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                        <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                                        <YAxis stroke="#64748b" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", color: "#fff" }}
                                            formatter={(val: any) => [`₹${val}`, "Revenue"]}
                                        />
                                        <Area type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sales Breakdown by Category Tier */}
                <Card className="bg-slate-900/60 border-slate-800 shadow-lg flex flex-col">
                    <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/20 shrink-0">
                                <PieIcon className="h-5 w-5 text-cyan-400" />
                            </div>
                            <div>
                                <CardTitle className="text-base md:text-lg font-bold text-white">
                                    Sales by Ticket Category
                                </CardTitle>
                                <CardDescription className="text-slate-400 text-xs mt-0.5">
                                    Income and volume per ticket tier
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col justify-between pt-2">
                        {analytics.tierList.length === 0 ? (
                            <div className="h-56 flex flex-col items-center justify-center text-slate-500 text-sm rounded-2xl border border-dashed border-slate-800 bg-slate-950/30">
                                <PieIcon className="h-10 w-10 mb-2 opacity-30" />
                                No ticket tiers found.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="h-44 w-full relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={analytics.tierList}
                                                dataKey="quantity"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={45}
                                                outerRadius={65}
                                                paddingAngle={4}
                                            >
                                                {analytics.tierList.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "10px", color: "#fff" }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Tier breakdown list */}
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                    {analytics.tierList.map((tier, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-xl bg-slate-800/40 border border-slate-800">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                                                <span className="font-semibold text-slate-200">{tier.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="font-bold text-white block">{tier.quantity} sold</span>
                                                <span className="text-[10px] text-slate-400">₹{tier.revenue.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>

            {/* Middle Share Widget & Quick Copy */}
            <Card className="relative overflow-hidden bg-slate-900/60 border-slate-800 shadow-lg">
                <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
                <CardContent className="relative z-10 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <EventImage imageUrl={event.imageUrl} title={event.title} />
                        <div>
                            <h4 className="text-lg font-bold text-white font-headline">Promote Your Event</h4>
                            <p className="text-xs text-slate-400 max-w-md mt-0.5">
                                Copy your direct public ticket booking link to post across social media, WhatsApp groups, and email campaigns.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Input value={shareUrl} readOnly className="bg-slate-950/80 border-slate-700 text-slate-200 text-xs h-11 min-w-[220px] rounded-xl" />
                        <Button onClick={copyToClipboard} className="h-11 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 rounded-xl shrink-0 transition-colors">
                            {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                            {copied ? "Copied" : "Copy Link"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Bottom Attendee Table Section */}
            <Card className="bg-slate-900/60 border-slate-800 shadow-lg">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                    <div>
                        <CardTitle className="text-xl font-bold text-white flex items-center gap-2 font-headline">
                            <Users className="h-5 w-5 text-cyan-400" /> Attendee Roster
                        </CardTitle>
                        <CardDescription className="text-slate-400 text-xs mt-0.5">
                            {searchQuery ? `${filteredBookings.length} of ${bookings.length}` : `${bookings.length}`} booking{bookings.length === 1 ? '' : 's'} · Manage entries and search attendees
                        </CardDescription>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name, email, ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-10 bg-slate-950 border-slate-800 text-white placeholder-slate-500 rounded-xl text-xs"
                            />
                        </div>

                        {/* Export Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportCSV}
                            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 font-bold rounded-xl h-10 px-4"
                        >
                            <Download className="mr-2 h-4 w-4" /> Export CSV
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {filteredBookings.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-500 text-sm">
                            <Users className="h-9 w-9 mb-1 opacity-30" />
                            {searchQuery ? `No attendees found matching "${searchQuery}".` : "No bookings recorded yet. Share your event link to start selling tickets!"}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-950/60">
                                    <TableRow className="border-slate-800 hover:bg-transparent">
                                        <TableHead className="text-slate-400 font-bold text-xs uppercase">Guest</TableHead>
                                        <TableHead className="text-slate-400 font-bold text-xs uppercase">Contact</TableHead>
                                        <TableHead className="text-slate-400 font-bold text-xs uppercase">Ticket Category</TableHead>
                                        <TableHead className="text-slate-400 font-bold text-xs uppercase">Booking ID</TableHead>
                                        <TableHead className="text-slate-400 font-bold text-xs uppercase">Booked On</TableHead>
                                        <TableHead className="text-slate-400 font-bold text-xs uppercase">Amount</TableHead>
                                        <TableHead className="text-slate-400 font-bold text-xs uppercase">Status</TableHead>
                                        <TableHead className="text-slate-400 font-bold text-xs uppercase text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBookings.map((booking) => (
                                        <TableRow key={booking.id} className="border-slate-800/60 hover:bg-slate-800/30">
                                            <TableCell className="font-medium text-white">
                                                <div className="flex items-start gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-slate-700 flex items-center justify-center text-[11px] font-bold text-cyan-300 shrink-0">
                                                        {getInitials(booking.attendees?.[0]?.name || booking.userName)}
                                                    </div>
                                                    <div className="flex flex-col gap-1">
                                                        {booking.attendees && booking.attendees.length > 0 ? (
                                                            booking.attendees.map((a, i) => (
                                                                <span key={i} className="block text-sm font-semibold">{a.name}</span>
                                                            ))
                                                        ) : (
                                                            <span className="text-sm font-semibold">{booking.userName}</span>
                                                        )}
                                                        {booking.isGuest && <Badge variant="secondary" className="w-fit text-[9px] bg-slate-800 text-slate-400 border border-slate-700">Guest</Badge>}
                                                    </div>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex flex-col text-xs">
                                                    <span className="text-slate-200">{booking.userEmail}</span>
                                                    <span className="text-slate-500">{booking.userMobile || "-"}</span>
                                                </div>
                                            </TableCell>

                                            <TableCell>
                                                {booking.tickets && booking.tickets.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {booking.tickets.map((t, i) => (
                                                            <Badge key={i} className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] font-mono">
                                                                {t.quantity}x {t.ticketTypeName}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] font-mono">
                                                        {(booking as any).ticketTypeName || booking.tickets?.[0]?.ticketTypeName || "Standard"}
                                                    </Badge>
                                                )}
                                            </TableCell>

                                            <TableCell className="font-mono text-xs text-slate-300">
                                                {booking.bookingId}
                                            </TableCell>

                                            <TableCell className="text-xs text-slate-400 whitespace-nowrap">
                                                {booking.createdAt?.seconds ? new Date(booking.createdAt.seconds * 1000).toLocaleDateString() : "-"}
                                            </TableCell>

                                            <TableCell className="font-bold text-white text-xs">
                                                ₹{booking.totalPrice || 0}
                                            </TableCell>

                                            <TableCell>
                                                <Badge className={`text-[10px] font-bold uppercase ${booking.status === "confirmed" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}`}>
                                                    {booking.status}
                                                </Badge>
                                            </TableCell>

                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleShareTicket(booking)} title="Share Ticket" className="h-8 w-8 hover:bg-slate-800 text-slate-400 hover:text-white">
                                                        <Share2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" asChild title="Scan Verification" className="h-8 w-8 hover:bg-slate-800 text-cyan-400">
                                                        <Link href="/dashboard/events/scanner">
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}
