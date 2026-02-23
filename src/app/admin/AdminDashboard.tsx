"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
const RUPEE = '\u20B9';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Loader2,
    Search,
    FileText,
    ShieldCheck,
    TrendingUp,
    Users,
    Package,
    ChevronRight,
    ArrowLeft,
    Share2,
    Calendar,
    Award,
    Clock,
    BarChart,
    Printer,
    Download,
    Share,
    Ticket,
    CheckCircle2,
    XCircle,
    AlertCircle,
    ScanLine,
    CreditCard,
    Gift,
    X,
    MapPin,
    Phone,
    Mail,
    Hash,
    Trash2
} from "lucide-react";
import html2canvas from 'html2canvas';
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol } from '@/lib/utils';
import Link from 'next/link';

type ProductStat = {
    name: string;
    quantity: number;
    revenue: number;
};

type ReportStats = {
    billValue: number;
    count: number;
    topProducts: ProductStat[];
};

type AdminUser = {
    userId: string;
    businessName: string;
    ownerEmail: string;
    phone: string;
    subscriptionStatus: 'basic' | 'premium';
    currency: string;
    stats: {
        overall: ReportStats;
        weekly: ReportStats;
        monthly: ReportStats;
    };
};

type TicketSummary = {
    totalBookings: number;
    confirmedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    checkedInBookings: number;
    totalRevenue: number;
    paidBookings: number;
    freeBookings: number;
};

type EventTicketStat = {
    eventId: string;
    eventTitle: string;
    hostId: string;
    total: number;
    confirmed: number;
    pending: number;
    cancelled: number;
    checkedIn: number;
    revenue: number;
};

type RecentBooking = {
    bookingId: string;
    userName: string;
    userEmail: string;
    userMobile?: string | null;
    eventTitle: string;
    eventDate?: string | null;
    eventVenue?: string | null;
    eventTime?: string | null;
    tickets?: { ticketTypeName: string; quantity: number; price: number }[];
    status: string;
    totalPrice: string;
    checkedIn: boolean;
    paymentId?: string | null;
    orderId?: string | null;
    createdAt: number | null;
};

export default function AdminDashboard() {
    const { user: currentUser, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'overall'>('overall');
    const [loadTimeout, setLoadTimeout] = useState(false);
    const [isImageReady, setIsImageReady] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [capturedImage, setCapturedImage] = useState<File | null>(null);

    // Ticket Analyse State
    const [showTicketAnalyse, setShowTicketAnalyse] = useState(false);
    const [ticketLoading, setTicketLoading] = useState(false);
    const [ticketSummary, setTicketSummary] = useState<TicketSummary | null>(null);
    const [eventBreakdown, setEventBreakdown] = useState<EventTicketStat[]>([]);
    const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
    const [ticketSearch, setTicketSearch] = useState("");
    const [selectedBooking, setSelectedBooking] = useState<RecentBooking | null>(null);
    const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
    const [isDeletingEvent, setIsDeletingEvent] = useState(false);

    const isAdmin = currentUser?.uid === '3l2SpTceF9Qany7x5IRHdHBPU9J3';

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (loading && !authLoading) {
            timer = setTimeout(() => {
                if (users.length === 0) {
                    setLoadTimeout(true);
                }
            }, 15000); // 15s timeout
        }
        return () => clearTimeout(timer);
    }, [loading, authLoading, users.length]);

    useEffect(() => {
        if (!authLoading && isAdmin) {
            fetchUsers();
        }
    }, [authLoading, isAdmin]);

    const fetchTicketAnalytics = async () => {
        setTicketLoading(true);
        try {
            const res = await fetch(`/api/admin/tickets?adminId=${currentUser?.uid}`);
            const data = await res.json();
            if (data.summary) {
                setTicketSummary(data.summary);
                setEventBreakdown(data.eventBreakdown || []);
                setRecentBookings(data.recentBookings || []);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: data.error || 'Failed to fetch ticket data' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Network error fetching tickets' });
        } finally {
            setTicketLoading(false);
        }
    };

    const handleOpenTicketAnalyse = () => {
        setShowTicketAnalyse(true);
        fetchTicketAnalytics();
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!currentUser) {
            toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
            return;
        }

        setIsDeletingEvent(true);
        try {
            const confirmRes = true; // Confirmation is handled by AlertDialog component

            const response = await fetch(`/api/admin/events?adminId=${currentUser.uid}&eventId=${eventId}`, {
                method: 'DELETE',
            });
            const data = await response.json();

            if (data.success) {
                toast({
                    title: "Success",
                    description: "Event and associated bookings deleted successfully",
                });
                // Refresh data
                fetchTicketAnalytics();
                setDeletingEventId(null);
            } else {
                toast({
                    title: "Error",
                    description: data.error || "Failed to delete event",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Delete error:", error);
            toast({
                title: "Error",
                description: "An unexpected error occurred",
                variant: "destructive",
            });
        } finally {
            setIsDeletingEvent(false);
        }
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/users?adminId=${currentUser?.uid}`);
            const data = await res.json();
            if (data.users) {
                setUsers(data.users);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: data.error || 'Failed to fetch users' });
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Network error' });
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            u.businessName?.toLowerCase().includes(search.toLowerCase()) ||
            u.ownerEmail?.toLowerCase().includes(search.toLowerCase()) ||
            u.phone?.includes(search)
        );
    }, [users, search]);

    const globalStats = useMemo(() => ({
        totalBusinesses: users.length,
        totalInvoices: users.reduce((acc, u) => acc + u.stats.overall.count, 0),
        totalSales: users.reduce((acc, u) => acc + u.stats.overall.billValue, 0),
        premiumCount: users.filter(u => u.subscriptionStatus === 'premium').length
    }), [users]);

    const handleShareReport = () => {
        if (!selectedUser) return;

        const currentStats = selectedUser.stats[reportType];
        const currency = getCurrencySymbol(selectedUser.currency);
        const reportTitle = reportType === 'weekly' ? 'Weekly' : reportType === 'monthly' ? 'Monthly' : 'Overall';

        const topProductsText = currentStats.topProducts.map(p => `â€¢ ${p.name}: ${p.quantity} sold`).join('%0A');

        const message = `*BizRoom Business Report (${reportTitle})*%0A%0A` +
            `ðŸ¢ *Business:* ${selectedUser.businessName}%0A` +
            `ðŸ“… *Period:* ${reportTitle}%0A%0A` +
            `ðŸ“‰ *Total Billing:* ${currency}${currentStats.billValue.toLocaleString()}%0A` +
            `ðŸ§¾ *Bills Issued:* ${currentStats.count}%0A%0A` +
            `ðŸ“¦ *Top Products:*%0A${topProductsText || 'No sales data'}%0A%0A` +
            `Generated via BizRoom Admin Control Panel.`;

        const whatsappUrl = `https://wa.me/${selectedUser.phone?.replace(/[^0-9]/g, '')}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    const prepareImageForSharing = async () => {
        const element = document.getElementById('report-content');
        if (!element || isSharing) return;

        setIsSharing(true);
        setIsImageReady(false);
        try {
            const isMobile = window.innerWidth <= 768;
            const canvas = await html2canvas(element, {
                scale: isMobile ? 1.0 : 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDoc) => {
                    const el = clonedDoc.getElementById('report-content');
                    if (el) {
                        el.style.padding = '40px';
                        el.style.width = '800px';
                        const items = el.querySelectorAll('*');
                        items.forEach(item => {
                            if (item instanceof HTMLElement) {
                                item.style.visibility = 'visible';
                            }
                        });
                    }
                }
            });

            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            if (!blob) throw new Error('Failed to create blob');

            const file = new File([blob], `${selectedUser?.businessName}-Report.png`, { type: 'image/png' });
            setCapturedImage(file);
            setIsImageReady(true);
            toast({ title: "Report Ready!", description: "Tap 'Send Now' to share." });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Preparation Failed", description: "Could not generate report image." });
        } finally {
            setIsSharing(false);
        }
    };

    const handleNativeShare = async () => {
        if (!capturedImage) return;
        try {
            if (navigator.share && navigator.canShare({ files: [capturedImage] })) {
                await navigator.share({
                    files: [capturedImage],
                    title: `${selectedUser?.businessName} Report`,
                    text: `Sharing the ${reportType} report for ${selectedUser?.businessName}`
                });
            } else {
                const url = URL.createObjectURL(capturedImage);
                const a = document.createElement('a');
                a.href = url;
                a.download = capturedImage.name;
                a.click();
            }
        } catch (error) {
            console.error("Share failed", error);
        }
    };

    if (authLoading || (currentUser && loading && users.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-6 px-4">
                {loadTimeout ? (
                    <div className="text-center space-y-4 max-w-sm">
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-amber-800">
                            <h3 className="font-bold text-lg">Connection is Slow</h3>
                            <p className="text-sm opacity-80">Fetching platform-wide insights is taking longer than expected on your current connection.</p>
                        </div>
                        <Button onClick={() => { setLoadTimeout(false); fetchUsers(); }} className="w-full h-12 rounded-xl font-bold">
                            Retry Syncing Data
                        </Button>
                    </div>
                ) : (
                    <>
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        <div className="text-center">
                            <p className="text-xl font-black tracking-tight">Syncing Infrastructure...</p>
                            <p className="text-muted-foreground font-medium mt-1">Downloading business intelligence data</p>
                        </div>
                    </>
                )}
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <ShieldCheck className="h-20 w-20 text-destructive mb-6 opacity-20" />
                <h2 className="text-3xl font-bold tracking-tight text-destructive">Unauthorized</h2>
                <p className="text-muted-foreground mt-2 max-w-md">Admin credentials required to view this section.</p>
                <Button asChild className="mt-8" variant="outline">
                    <Link href="/dashboard">Return to Dashboard</Link>
                </Button>
            </div>
        );
    }

    if (selectedUser) {
        const stats = selectedUser.stats[reportType];
        const currency = getCurrencySymbol(selectedUser.currency);
        const gradientClass = reportType === 'weekly' ? 'from-green-600 to-teal-700' :
            reportType === 'monthly' ? 'from-indigo-600 to-purple-700' :
                'from-slate-700 to-slate-900';

        return (
            <div className="space-y-8 animate-in slide-in-from-bottom duration-300 max-w-4xl mx-auto py-8 px-4">
                <style jsx global>{`
                    @media print {
                        @page {
                            margin: 0;
                            size: auto;
                        }
                        body {
                            background: white !important;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        body * {
                            visibility: hidden;
                        }
                        #report-content, #report-content * {
                            visibility: visible;
                        }
                        #report-content {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            padding: 15mm;
                            margin: 0;
                            background: white !important;
                        }
                        .no-print {
                            display: none !important;
                        }
                        /* Ensure gradients and colors show up */
                        #report-content .bg-gradient-to-br,
                        #report-content .bg-white\\/10,
                        #report-content .badge {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        #report-content .shadow-2xl,
                        #report-content .shadow-xl {
                            box-shadow: none !important;
                            border: 1px solid #f1f5f9;
                        }
                        #report-content .rounded-[2rem],
                        #report-content .rounded-3xl {
                            border-radius: 24px !important;
                        }
                    }
                `}</style>

                <div className="flex flex-col md:flex-row items-center justify-between gap-4 no-print">
                    <Button variant="ghost" onClick={() => { setSelectedUser(null); setReportType('overall'); }} className="gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back to List
                    </Button>

                    <Tabs value={reportType} onValueChange={(v) => setReportType(v as any)} className="w-full md:w-auto">
                        <TabsList className="grid grid-cols-3 w-full">
                            <TabsTrigger value="weekly">Weekly</TabsTrigger>
                            <TabsTrigger value="monthly">Monthly</TabsTrigger>
                            <TabsTrigger value="overall">Overall</TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                        <Button onClick={() => window.print()} variant="outline" className="gap-2 border-primary/20">
                            <Printer className="w-4 h-4" /> Save PDF
                        </Button>
                        {isImageReady ? (
                            <Button onClick={handleNativeShare} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg animate-bounce">
                                <Share2 className="w-4 h-4" /> Send Now
                            </Button>
                        ) : (
                            <Button onClick={prepareImageForSharing} disabled={isSharing} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg">
                                {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share className="w-4 h-4" />}
                                Share Report
                            </Button>
                        )}
                        <Button onClick={handleShareReport} className="gap-2 bg-green-600 hover:bg-green-700 shadow-lg text-white font-bold">
                            <Share2 className="w-4 h-4" /> WhatsApp
                        </Button>
                    </div>
                </div>

                <div id="report-content" className="space-y-8">
                    <div className={`bg-gradient-to-br ${gradientClass} rounded-[2rem] p-10 text-white shadow-2xl relative overflow-hidden transition-all duration-500`}>
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            {reportType === 'weekly' ? <Clock className="w-48 h-48" /> :
                                reportType === 'monthly' ? <Calendar className="w-48 h-48" /> :
                                    <BarChart className="w-48 h-48" />}
                        </div>

                        <div className="relative z-10">
                            <Badge className="bg-white/20 text-white mb-6 border-none backdrop-blur-md px-4 py-1.5 uppercase tracking-widest font-bold">
                                {reportType} Insights
                            </Badge>
                            <h2 className="text-5xl font-black mb-2 tracking-tighter">{selectedUser.businessName}</h2>
                            <p className="text-white/80 flex items-center gap-2 text-lg">
                                Performance data for the selected period.
                            </p>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-10 mt-16">
                                <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
                                    <p className="text-xs font-bold opacity-60 uppercase mb-1">Created Value</p>
                                    <p className="text-4xl font-black">{currency}{stats.billValue.toLocaleString()}</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
                                    <p className="text-xs font-bold opacity-60 uppercase mb-1">Total Bills</p>
                                    <p className="text-4xl font-black">{stats.count}</p>
                                </div>
                                <div className="hidden md:block bg-white/10 backdrop-blur-sm p-6 rounded-2xl border border-white/10">
                                    <p className="text-xs font-bold opacity-60 uppercase mb-1">Hero Item</p>
                                    <p className="text-2xl font-black truncate">{stats.topProducts[0]?.name || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Card className="border-none shadow-2xl rounded-3xl overflow-hidden">
                        <CardHeader className="bg-muted/30 border-b p-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 rounded-2xl">
                                    <Package className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-bold">Sold Items ({reportType})</CardTitle>
                                    <CardDescription>Top products contributing to billing volume.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/10">
                                        <TableHead className="py-4 font-bold text-primary pl-8">Product Name</TableHead>
                                        <TableHead className="text-center font-bold text-primary">Quantity</TableHead>
                                        <TableHead className="text-right font-bold text-primary pr-8">Total Billed</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {stats.topProducts.map((p, idx) => (
                                        <TableRow key={idx} className="hover:bg-muted/5 transition-colors">
                                            <TableCell className="py-6 font-bold text-lg pl-8">{p.name}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="font-black text-base px-3">{p.quantity}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-black text-emerald-600 text-lg pr-8">
                                                {currency}{p.revenue.toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {stats.topProducts.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center py-20 text-muted-foreground italic text-lg">
                                                No billing data found for this timeframe.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    // ---- TICKET ANALYSE PANEL ----
    if (showTicketAnalyse) {
        const filteredEvents = eventBreakdown.filter(e =>
            e.eventTitle.toLowerCase().includes(ticketSearch.toLowerCase())
        );

        const statCards = ticketSummary ? [
            { label: 'Total Bookings', value: ticketSummary.totalBookings, icon: <Ticket className="w-6 h-6" />, bg: 'linear-gradient(135deg, #4f46e5, #2563eb)', shadow: '0 8px 32px rgba(79,70,229,0.4)' },
            { label: 'Confirmed', value: ticketSummary.confirmedBookings, icon: <CheckCircle2 className="w-6 h-6" />, bg: 'linear-gradient(135deg, #059669, #0d9488)', shadow: '0 8px 32px rgba(5,150,105,0.4)' },
            { label: 'Pending', value: ticketSummary.pendingBookings, icon: <AlertCircle className="w-6 h-6" />, bg: 'linear-gradient(135deg, #d97706, #ea580c)', shadow: '0 8px 32px rgba(217,119,6,0.4)' },
            { label: 'Cancelled', value: ticketSummary.cancelledBookings, icon: <XCircle className="w-6 h-6" />, bg: 'linear-gradient(135deg, #e11d48, #dc2626)', shadow: '0 8px 32px rgba(225,29,72,0.4)' },
            { label: 'Checked In', value: ticketSummary.checkedInBookings, icon: <ScanLine className="w-6 h-6" />, bg: 'linear-gradient(135deg, #0ea5e9, #6366f1)', shadow: '0 8px 32px rgba(14,165,233,0.4)' },
            { label: 'Paid Tickets', value: ticketSummary.paidBookings, icon: <CreditCard className="w-6 h-6" />, bg: 'linear-gradient(135deg, #7c3aed, #a21caf)', shadow: '0 8px 32px rgba(124,58,237,0.4)' },
            { label: 'Free Tickets', value: ticketSummary.freeBookings, icon: <Gift className="w-6 h-6" />, bg: 'linear-gradient(135deg, #0891b2, #0284c7)', shadow: '0 8px 32px rgba(8,145,178,0.4)' },
            { label: 'Total Revenue', value: `${RUPEE}${ticketSummary.totalRevenue.toLocaleString()}`, icon: <TrendingUp className="w-6 h-6" />, bg: 'linear-gradient(135deg, #065f46, #047857)', shadow: '0 8px 32px rgba(6,95,70,0.4)' },
        ] : [];

        return (
            <div style={{ background: 'linear-gradient(135deg, #0f0c29, #16213e, #0f3460)', minHeight: '100vh' }} className="px-4 py-10 animate-in fade-in duration-300">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <Button
                            variant="ghost"
                            onClick={() => setShowTicketAnalyse(false)}
                            className="gap-2 text-white hover:text-white hover:bg-white/10"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Admin Panel
                        </Button>
                        <div className="flex items-center gap-3">
                            <Ticket className="w-9 h-9 text-violet-400" />
                            <h1 className="text-4xl font-black tracking-tighter text-white">Ticket Analyse</h1>
                        </div>
                        <Button
                            onClick={fetchTicketAnalytics}
                            disabled={ticketLoading}
                            variant="outline"
                            className="gap-2 border-white/20 text-white hover:bg-white/10 bg-transparent"
                        >
                            {ticketLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                            Refresh
                        </Button>
                    </div>

                    {ticketLoading && !ticketSummary ? (
                        <div className="flex items-center justify-center min-h-[400px]">
                            <Loader2 className="h-12 w-12 animate-spin text-violet-400" />
                        </div>
                    ) : ticketSummary ? (
                        <>
                            {/* 8-cell Stat Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {statCards.map((card, i) => (
                                    <div
                                        key={i}
                                        style={{ background: card.bg, boxShadow: card.shadow }}
                                        className="rounded-2xl p-5 text-white relative overflow-hidden"
                                    >
                                        <div className="absolute top-3 right-3 opacity-20">
                                            {React.cloneElement(card.icon, { className: 'w-14 h-14' })}
                                        </div>
                                        <div className="flex items-center gap-2 mb-3 opacity-80">
                                            {card.icon}
                                            <span className="text-xs font-bold uppercase tracking-widest">{card.label}</span>
                                        </div>
                                        <div className="text-4xl md:text-5xl font-black">{card.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Event Breakdown Table */}
                            <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="p-6 border-b border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                    <div>
                                        <h2 className="text-2xl font-black text-white">Event-wise Breakdown</h2>
                                        <p className="text-white/50 text-sm mt-1">All events and their ticket performance</p>
                                    </div>
                                    <div className="relative w-full md:w-72">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                                        <input
                                            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                                            className="pl-9 h-10 rounded-xl w-full text-sm px-4 focus:outline-none placeholder:text-white/30"
                                            placeholder="Search events..."
                                            value={ticketSearch}
                                            onChange={e => setTicketSearch(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                {['Event', 'Total', 'Confirmed', 'Pending', 'Cancelled', 'Checked In', 'Revenue', 'Actions'].map(h => (
                                                    <th key={h} className="py-4 px-4 text-left text-xs font-bold uppercase tracking-widest text-white/40 first:pl-6 last:text-right last:pr-6">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredEvents.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="text-center py-16 text-white/30 italic">No events found.</td>
                                                </tr>
                                            ) : filteredEvents.map((ev, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }} className="hover:bg-white/5 transition-colors">
                                                    <td className="pl-6 py-4 font-bold text-white max-w-[200px] truncate">{ev.eventTitle}</td>
                                                    <td className="px-4 text-center"><span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '2px 10px', borderRadius: 999, fontWeight: 900, fontSize: 13 }}>{ev.total}</span></td>
                                                    <td className="px-4 text-center"><span style={{ background: '#065f46', color: '#6ee7b7', padding: '2px 10px', borderRadius: 999, fontWeight: 700, fontSize: 13 }}>{ev.confirmed}</span></td>
                                                    <td className="px-4 text-center"><span style={{ background: '#78350f', color: '#fde68a', padding: '2px 10px', borderRadius: 999, fontWeight: 700, fontSize: 13 }}>{ev.pending}</span></td>
                                                    <td className="px-4 text-center"><span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '2px 10px', borderRadius: 999, fontWeight: 700, fontSize: 13 }}>{ev.cancelled}</span></td>
                                                    <td className="px-4 text-center"><span style={{ background: '#1e3a5f', color: '#93c5fd', padding: '2px 10px', borderRadius: 999, fontWeight: 700, fontSize: 13 }}>{ev.checkedIn}</span></td>
                                                    <td className="pr-6 text-right font-black text-emerald-400">{RUPEE}{ev.revenue.toLocaleString()}</td>
                                                    <td className="pr-6 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10"
                                                            onClick={(e) => { e.stopPropagation(); setDeletingEventId(ev.eventId); }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Recent Bookings Table */}
                            <div className="rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div className="p-6 border-b border-white/10">
                                    <h2 className="text-2xl font-black text-white">Recent Bookings</h2>
                                    <p className="text-white/50 text-sm mt-1">Last 20 bookings - Click a row for full details & QR Code</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                                {['Booking ID', 'Attendee', 'Event', 'Status', 'Check-In', 'Amount'].map((h, i) => (
                                                    <th key={h} className={`py-4 px-4 text-xs font-bold uppercase tracking-widest text-white/40 ${i === 0 ? 'pl-6 text-left' : i === 5 ? 'text-right pr-6' : i >= 3 ? 'text-center' : 'text-left'}`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentBookings.map((b, idx) => (
                                                <tr
                                                    key={idx}
                                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                                                    className="hover:bg-white/10 transition-colors cursor-pointer group"
                                                    onClick={() => setSelectedBooking(b)}
                                                >
                                                    <td className="pl-6 py-4 font-mono text-xs font-bold text-violet-400 group-hover:text-violet-300 transition-colors">{b.bookingId}</td>
                                                    <td className="px-4 py-4">
                                                        <div className="font-bold text-white">{b.userName}</div>
                                                        <div className="text-xs text-white/40">{b.userEmail}</div>
                                                    </td>
                                                    <td className="px-4 py-4 max-w-[160px] truncate text-white/70">{b.eventTitle}</td>
                                                    <td className="px-4 py-4 text-center">
                                                        {b.status === 'confirmed'
                                                            ? <span style={{ background: '#065f46', color: '#6ee7b7', padding: '3px 10px', borderRadius: 999, fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}><CheckCircle2 size={11} /> Confirmed</span>
                                                            : b.status === 'pending'
                                                                ? <span style={{ background: '#78350f', color: '#fde68a', padding: '3px 10px', borderRadius: 999, fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}><AlertCircle size={11} /> Pending</span>
                                                                : <span style={{ background: '#7f1d1d', color: '#fca5a5', padding: '3px 10px', borderRadius: 999, fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}><XCircle size={11} /> Cancelled</span>
                                                        }
                                                    </td>
                                                    <td className="px-4 py-4 text-center">
                                                        {b.checkedIn
                                                            ? <span style={{ background: '#1e3a5f', color: '#93c5fd', padding: '3px 10px', borderRadius: 999, fontWeight: 700, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}><ScanLine size={11} /> Checked In</span>
                                                            : <span className="text-white/20">--</span>
                                                        }
                                                    </td>
                                                    <td className="pr-6 py-4 text-right font-black text-emerald-400">
                                                        {parseFloat(b.totalPrice) > 0 ? `${RUPEE}${parseFloat(b.totalPrice).toLocaleString()}` : <span style={{ color: '#60a5fa' }}>Free</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Ticket Detail Modal */}
                            <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
                                <DialogContent className="max-w-2xl bg-[#0f172a] border-white/10 text-white p-0 overflow-hidden rounded-3xl">
                                    {selectedBooking && (
                                        <div className="flex flex-col md:flex-row">
                                            {/* Left Column: QR Code */}
                                            <div className="bg-white p-10 flex flex-col items-center justify-center gap-6 md:w-1/2">
                                                <div className="p-4 bg-white rounded-2xl shadow-2xl">
                                                    <QRCodeSVG
                                                        value={selectedBooking.bookingId}
                                                        size={220}
                                                        level="H"
                                                        includeMargin={false}
                                                    />
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-slate-900 font-mono text-sm font-bold tracking-widest">{selectedBooking.bookingId}</p>
                                                    <p className="text-slate-500 text-xs mt-1 uppercase font-black tracking-tighter">Unique Ticket Identity</p>
                                                </div>
                                            </div>

                                            {/* Right Column: Details */}
                                            <div className="p-8 md:w-1/2 space-y-6">
                                                <DialogHeader>
                                                    <DialogTitle className="text-3xl font-black tracking-tighter flex items-center gap-2">
                                                        <Ticket className="text-violet-400" /> Ticket Details
                                                    </DialogTitle>
                                                    <DialogDescription className="text-slate-400">
                                                        Full booking and payment information.
                                                    </DialogDescription>
                                                </DialogHeader>

                                                <div className="space-y-4 pt-2">
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-black uppercase text-violet-400 tracking-widest">Event</p>
                                                        <p className="text-xl font-bold">{selectedBooking.eventTitle}</p>
                                                        <div className="flex items-center gap-4 mt-1 text-slate-400 text-xs">
                                                            <span className="flex items-center gap-1"><Calendar size={12} /> {selectedBooking.eventDate || 'N/A'}</span>
                                                            <span className="flex items-center gap-1"><MapPin size={12} /> {selectedBooking.eventVenue || 'Online'}</span>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black uppercase text-violet-400 tracking-widest">Attendee</p>
                                                            <p className="font-bold flex items-center gap-1.5"><Users size={14} className="opacity-50" /> {selectedBooking.userName}</p>
                                                            <p className="text-xs text-slate-400 flex items-center gap-1.5"><Mail size={12} className="opacity-50" /> {selectedBooking.userEmail}</p>
                                                            {selectedBooking.userMobile && <p className="text-xs text-slate-400 flex items-center gap-1.5"><Phone size={12} className="opacity-50" /> {selectedBooking.userMobile}</p>}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <p className="text-[10px] font-black uppercase text-violet-400 tracking-widest">Status</p>
                                                            <div className="pt-0.5">
                                                                {selectedBooking.status === 'confirmed'
                                                                    ? <Badge className="bg-emerald-500/20 text-emerald-400 border-none px-3 font-bold">Confirmed</Badge>
                                                                    : <Badge className="bg-amber-500/20 text-amber-400 border-none px-3 font-bold">{selectedBooking.status}</Badge>
                                                                }
                                                                {selectedBooking.checkedIn && <Badge className="ml-2 bg-blue-500/20 text-blue-400 border-none px-3 font-bold">In</Badge>}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <p className="text-[10px] font-black uppercase text-violet-400 tracking-widest">Ticket Selection</p>
                                                        <div className="space-y-1.5">
                                                            {(selectedBooking.tickets || []).map((t, i) => (
                                                                <div key={i} className="flex justify-between items-center text-sm bg-white/5 p-2 rounded-lg border border-white/5">
                                                                    <span className="font-medium">{t.ticketTypeName} × {t.quantity}</span>
                                                                    <span className="font-black">{RUPEE}{t.price * t.quantity}</span>
                                                                </div>
                                                            ))}
                                                            {(!selectedBooking.tickets || selectedBooking.tickets.length === 0) && (
                                                                <div className="flex justify-between items-center text-sm bg-white/5 p-2 rounded-lg">
                                                                    <span className="font-medium">Total Paid</span>
                                                                    <span className="font-black">{RUPEE}{parseFloat(selectedBooking.totalPrice).toLocaleString()}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {(selectedBooking.orderId || selectedBooking.paymentId) && (
                                                        <div className="space-y-2 pt-2 border-t border-white/5 mt-4">
                                                            <p className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Transaction Info</p>
                                                            <div className="space-y-1.5">
                                                                {selectedBooking.orderId && (
                                                                    <div className="flex flex-col bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
                                                                        <span className="text-[10px] text-emerald-500/60 font-black uppercase">Razorpay Order ID</span>
                                                                        <span className="font-mono text-xs font-bold flex items-center gap-1.5"><Hash size={10} /> {selectedBooking.orderId}</span>
                                                                    </div>
                                                                )}
                                                                {selectedBooking.paymentId && (
                                                                    <div className="flex flex-col bg-emerald-500/5 p-2 rounded-xl border border-emerald-500/10">
                                                                        <span className="text-[10px] text-emerald-500/60 font-black uppercase">Payment ID</span>
                                                                        <span className="font-mono text-xs font-bold flex items-center gap-1.5"><CreditCard size={10} /> {selectedBooking.paymentId}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </DialogContent>
                            </Dialog>

                            {/* Delete Confirmation Dialog */}
                            <AlertDialog open={!!deletingEventId} onOpenChange={(open) => !open && setDeletingEventId(null)}>
                                <AlertDialogContent className="bg-[#0f172a] border-white/10 text-white rounded-3xl">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-2">
                                            <AlertCircle className="text-rose-500" /> Confirm Deletion
                                        </AlertDialogTitle>
                                        <AlertDialogDescription className="text-slate-400">
                                            Are you absolutely sure? This will permanently delete the event and <b>all associated bookings</b>. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="mt-6">
                                        <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl">Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => deletingEventId && handleDeleteEvent(deletingEventId)}
                                            className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl border-none"
                                            disabled={isDeletingEvent}
                                        >
                                            {isDeletingEvent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                                            Delete Permanently
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </>
                    ) : (
                        <div className="text-center py-20 text-white/30 text-xl">No ticket data found.</div>
                    )}
                </div>
            </div>
        );
    }
    // ---- END TICKET ANALYSE PANEL ----
    return (
        <div className="space-y-10 max-w-7xl mx-auto px-4 py-12 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-5xl font-black tracking-tighter text-primary">Admin Control Center</h1>
                    <p className="text-muted-foreground mt-2 text-xl font-medium opacity-80">Platform health and business intelligence dashboard.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleOpenTicketAnalyse} size="lg" className="rounded-2xl h-14 px-8 text-lg font-bold shadow-xl hover:shadow-2xl transition-all bg-violet-600 hover:bg-violet-700 text-white gap-2">
                        <Ticket className="h-5 w-5" /> Ticket Analyse
                    </Button>
                    <Button onClick={fetchUsers} disabled={loading} size="lg" className="rounded-2xl h-14 px-8 text-lg font-bold shadow-xl hover:shadow-2xl transition-all">
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <TrendingUp className="mr-2 h-5 w-5" />}
                        Sync Platform Data
                    </Button>
                </div>
            </div>

            {/* Platform Stats Row */}
            <div className="grid gap-8 md:grid-cols-3">
                <Card className="bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-none shadow-2xl rounded-3xl transform transition-all hover:scale-[1.03]">
                    <CardHeader className="pb-2 pt-8">
                        <CardTitle className="text-xs font-black uppercase tracking-widest opacity-60 flex items-center justify-between">
                            Connected Brands <Users className="h-5 w-5" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-8">
                        <div className="text-6xl font-black">{globalStats.totalBusinesses}</div>
                        <div className="flex items-center gap-2 mt-4">
                            <Badge className="bg-white/20 text-white border-none px-3 font-bold">{globalStats.premiumCount} Premium Users</Badge>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-none shadow-2xl rounded-3xl transform transition-all hover:scale-[1.03]">
                    <CardHeader className="pb-2 pt-8">
                        <CardTitle className="text-xs font-black uppercase tracking-widest opacity-60 flex items-center justify-between">
                            Total Documents <FileText className="h-5 w-5" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-8">
                        <div className="text-6xl font-black">{globalStats.totalInvoices.toLocaleString()}</div>
                        <p className="text-xs mt-4 opacity-60 font-medium">Platform-wide billing events recorded</p>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-amber-500 to-amber-700 text-white border-none shadow-2xl rounded-3xl transform transition-all hover:scale-[1.03]">
                    <CardHeader className="pb-2 pt-8">
                        <CardTitle className="text-xs font-black uppercase tracking-widest opacity-60 flex items-center justify-between">
                            Platform GMV <TrendingUp className="h-5 w-5" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-8">
                        <div className="text-6xl font-black">â‚¹{globalStats.totalSales.toLocaleString()}</div>
                        <p className="text-xs mt-4 opacity-60 font-medium italic">Calculated billing volume</p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-2xl overflow-hidden rounded-[2.5rem] bg-card/60 backdrop-blur-md">
                <CardHeader className="bg-muted/10 border-b p-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <CardTitle className="text-3xl font-black italic tracking-tighter">Business Registry</CardTitle>
                            <CardDescription className="text-lg">Aggregate growth metrics for every partner business.</CardDescription>
                        </div>
                        <div className="relative w-full md:w-[28rem]">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
                            <Input
                                placeholder="Filter by Name, Email or Phone No..."
                                className="pl-14 h-14 bg-background/50 border-none shadow-inner text-xl rounded-2xl"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/20 hover:bg-muted/20">
                                    <TableHead className="py-8 font-black text-xs uppercase tracking-widest pl-10 text-primary/70">Business Entity</TableHead>
                                    <TableHead className="font-black text-xs uppercase tracking-widest text-primary/70">Subscription</TableHead>
                                    <TableHead className="text-center font-black text-xs uppercase tracking-widest text-primary/70">Invoices</TableHead>
                                    <TableHead className="text-right font-black text-xs uppercase tracking-widest text-primary/70">Bill Value</TableHead>
                                    <TableHead className="text-right font-black text-xs uppercase tracking-widest pr-10 text-primary/70">Operations</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.userId} className="hover:bg-muted/30 transition-all border-b border-muted/20 py-4 group">
                                        <TableCell className="py-8 pl-10">
                                            <div className="flex flex-col">
                                                <span className="font-black text-2xl group-hover:text-primary transition-colors tracking-tight">{user.businessName}</span>
                                                <span className="text-sm text-muted-foreground mt-1 font-medium">{user.ownerEmail || 'No Email Record'} â€¢ {user.phone || 'No Phone Record'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {user.subscriptionStatus === 'premium' ? (
                                                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 font-black px-4 py-1">PREMIUM</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-muted-foreground font-bold px-4 py-1">BASIC</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-2xl font-black font-mono">{user.stats.overall.count}</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="font-black text-emerald-600 text-xl tracking-tighter">
                                                {getCurrencySymbol(user.currency || 'INR')}{user.stats.overall.billValue.toLocaleString()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-10">
                                            <Button
                                                variant="secondary"
                                                onClick={() => setSelectedUser(user)}
                                                className="h-12 px-6 rounded-xl font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-md active:scale-95"
                                            >
                                                Analysis Report <ChevronRight className="ml-2 w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-80 text-center text-muted-foreground italic text-2xl font-light">
                                            No business entities found matching your search parameters.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
