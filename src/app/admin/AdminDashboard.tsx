"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    Share
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

export default function AdminDashboard() {
    const { user: currentUser, loading: authLoading } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'overall'>('overall');
    const [isSharing, setIsSharing] = useState(false);

    const isAdmin = currentUser?.uid === '3l2SpTceF9Qany7x5IRHdHBPU9J3';

    useEffect(() => {
        if (!authLoading && isAdmin) {
            fetchUsers();
        }
    }, [authLoading, isAdmin]);

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

        const topProductsText = currentStats.topProducts.map(p => `• ${p.name}: ${p.quantity} sold`).join('%0A');

        const message = `*BizRoom Business Report (${reportTitle})*%0A%0A` +
            `🏢 *Business:* ${selectedUser.businessName}%0A` +
            `📅 *Period:* ${reportTitle}%0A%0A` +
            `📉 *Total Billing:* ${currency}${currentStats.billValue.toLocaleString()}%0A` +
            `🧾 *Bills Issued:* ${currentStats.count}%0A%0A` +
            `📦 *Top Products:*%0A${topProductsText || 'No sales data'}%0A%0A` +
            `Generated via BizRoom Admin Control Panel.`;

        const whatsappUrl = `https://wa.me/${selectedUser.phone?.replace(/[^0-9]/g, '')}?text=${message}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleShareAsImage = async () => {
        const element = document.getElementById('report-content');
        if (!element || isSharing) return;

        setIsSharing(true);
        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
                onclone: (clonedDoc) => {
                    const el = clonedDoc.getElementById('report-content');
                    if (el) {
                        el.style.padding = '40px';
                        el.style.width = '800px';
                        // Force styles for clone
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

            if (navigator.share && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: `${selectedUser?.businessName} Report`,
                    text: `Sharing the ${reportType} report for ${selectedUser?.businessName}`
                });
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${selectedUser?.businessName}-${reportType}-Report.png`;
                a.click();
                toast({ title: "Report Downloaded", description: "Sharing not supported, file has been downloaded." });
            }
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: "Share Failed", description: "Could not generate report." });
        } finally {
            setIsSharing(false);
        }
    };

    if (authLoading || (currentUser && loading && users.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground font-medium">Preparing Infrastructure Data...</p>
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
                        <Button onClick={handleShareAsImage} disabled={isSharing} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg">
                            {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share className="w-4 h-4" />}
                            Share Report
                        </Button>
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

    return (
        <div className="space-y-10 max-w-7xl mx-auto px-4 py-12 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-5xl font-black tracking-tighter text-primary">Admin Control Center</h1>
                    <p className="text-muted-foreground mt-2 text-xl font-medium opacity-80">Platform health and business intelligence dashboard.</p>
                </div>
                <Button onClick={fetchUsers} disabled={loading} size="lg" className="rounded-2xl h-14 px-8 text-lg font-bold shadow-xl hover:shadow-2xl transition-all">
                    {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <TrendingUp className="mr-2 h-5 w-5" />}
                    Sync Platform Data
                </Button>
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
                        <div className="text-6xl font-black">₹{globalStats.totalSales.toLocaleString()}</div>
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
                                                <span className="text-sm text-muted-foreground mt-1 font-medium">{user.ownerEmail || 'No Email Record'} • {user.phone || 'No Phone Record'}</span>
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
