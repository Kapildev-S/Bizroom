"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/useAuth';
import { getRechargeRecords, getRechargeStats, type RechargeRecord } from '@/app/actions/rechargeRecordsActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    SmartphoneCharging, IndianRupee, AlertCircle, Clock, Users,
    Search, Download, RefreshCw, Check, X, Bell, TrendingUp,
    ChevronUp, ChevronDown, ArrowUpDown, Wallet, AlertTriangle,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';
import { cn } from '@/lib/utils';

const ADMIN_ID = '3l2SpTceF9Qany7x5IRHdHBPU9J3';
const COLORS = ['#3b82f6', '#ef4444', '#a855f7', '#22c55e'];

function calcDaysRemaining(targetDateStr: string): number {
    if (!targetDateStr) return 0;
    const target = new Date(targetDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DaysBadge({ days }: { days: number }) {
    if (days < 0) return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">{days}d</Badge>;
    if (days === 0) return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs animate-pulse">Today</Badge>;
    if (days <= 3) return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">{days}d</Badge>;
    if (days <= 7) return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">{days}d</Badge>;
    return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">{days}d</Badge>;
}

function NetworkBadge({ network }: { network: string }) {
    const map: Record<string, string> = {
        'Jio': 'bg-blue-100 text-blue-700 border-blue-200',
        'Airtel': 'bg-red-100 text-red-700 border-red-200',
        'Vodafone Idea (Vi)': 'bg-purple-100 text-purple-700 border-purple-200',
        'BSNL': 'bg-green-100 text-green-700 border-green-200',
    };
    return <Badge variant="outline" className={cn('text-xs', map[network] || '')}>{network}</Badge>;
}

export default function BizRechargeAdminPage() {
    const { user } = useAuth();
    const [records, setRecords] = useState<RechargeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterNetwork, setFilterNetwork] = useState('all');
    const [filterDue, setFilterDue] = useState('all');
    const [filterCashback, setFilterCashback] = useState('all');

    const isAdmin = user?.uid === ADMIN_ID;

    const load = async () => {
        if (!user || !isAdmin) return;
        setLoading(true);
        try {
            const data = await getRechargeRecords(user.uid);
            setRecords(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [user]);

    // ─── Stats ───────────────────────────────────────────────────────────────
    const stats = useMemo(() => {
        const total = records.length;
        const totalRevenue = records.reduce((s, r) => s + (r.amount || 0), 0);
        const dueToday = records.filter(r => {
            const d = r.daysRemaining ?? calcDaysRemaining(r.nextRechargeDate);
            return d <= 0 && d > -3;
        }).length;
        const dueIn7 = records.filter(r => {
            const d = r.daysRemaining ?? calcDaysRemaining(r.nextRechargeDate);
            return d > 0 && d <= 7;
        }).length;
        const expired = records.filter(r => {
            const d = r.daysRemaining ?? calcDaysRemaining(r.nextRechargeDate);
            return d <= -3;
        }).length;
        const cashbackPending = records.filter(r => r.cashbackStatus === 'pending').length;
        const billSent = records.filter(r => r.billSend).length;
        const groupAdded = records.filter(r => r.groupAdded).length;

        // Operator split
        const operatorMap: Record<string, { count: number; revenue: number }> = {};
        records.forEach(r => {
            const key = r.simNetwork || 'Unknown';
            if (!operatorMap[key]) operatorMap[key] = { count: 0, revenue: 0 };
            operatorMap[key].count++;
            operatorMap[key].revenue += r.amount || 0;
        });
        const operatorData = Object.entries(operatorMap).map(([name, v]) => ({
            name, value: v.count, revenue: v.revenue,
        }));

        // Monthly revenue (last 7 months)
        const monthlyMap: Record<string, number> = {};
        records.forEach(r => {
            if (!r.date) return;
            const key = r.date.substring(0, 7); // YYYY-MM
            monthlyMap[key] = (monthlyMap[key] || 0) + (r.amount || 0);
        });
        const monthlyData = Object.entries(monthlyMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-7)
            .map(([month, amount]) => ({
                name: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
                amount,
            }));

        // App usage
        const appMap: Record<string, number> = {};
        records.forEach(r => {
            const key = r.rechargeApp || 'Unknown';
            appMap[key] = (appMap[key] || 0) + 1;
        });
        const appData = Object.entries(appMap)
            .sort(([, a], [, b]) => b - a)
            .map(([name, count]) => ({ name, count }));

        return { total, totalRevenue, dueToday, dueIn7, expired, cashbackPending, billSent, groupAdded, operatorData, monthlyData, appData };
    }, [records]);

    // ─── Filtered Records ────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        let data = [...records];
        if (search) {
            const q = search.toLowerCase();
            data = data.filter(r =>
                r.name?.toLowerCase().includes(q) ||
                r.mobileNumber?.includes(q) ||
                r.billInvoiceNo?.toLowerCase().includes(q)
            );
        }
        if (filterNetwork !== 'all') data = data.filter(r => r.simNetwork === filterNetwork);
        if (filterCashback !== 'all') data = data.filter(r => r.cashbackStatus === filterCashback);
        if (filterDue === 'today') data = data.filter(r => {
            const d = r.daysRemaining ?? calcDaysRemaining(r.nextRechargeDate);
            return d <= 0 && d > -3;
        });
        if (filterDue === '7days') data = data.filter(r => {
            const d = r.daysRemaining ?? calcDaysRemaining(r.nextRechargeDate);
            return d > 0 && d <= 7;
        });
        if (filterDue === 'expired') data = data.filter(r => {
            const d = r.daysRemaining ?? calcDaysRemaining(r.nextRechargeDate);
            return d <= -3;
        });
        return data;
    }, [records, search, filterNetwork, filterDue, filterCashback]);

    const handleExport = () => {
        const headers = ['#', 'Date', 'Name', 'Mobile', 'Network', 'Amount', 'Days', 'Bill', 'Invoice', 'App', 'Group', 'Next Recharge', 'Days Left', 'Cashback'];
        const rows = filtered.map(r => [
            r.sNo, r.date, r.name, r.mobileNumber, r.simNetwork, r.amount,
            r.packageDuration, r.billSend ? 'Yes' : 'No', r.billInvoiceNo,
            r.rechargeApp, r.groupAdded ? 'Yes' : 'No', r.nextRechargeDate,
            r.daysRemaining ?? calcDaysRemaining(r.nextRechargeDate), r.cashbackStatus,
        ]);
        const csv = [headers, ...rows].map(row => row.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recharge-report-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!isAdmin) return <div className="p-8 text-center text-muted-foreground">Admin access only.</div>;

    return (
        <div className="space-y-6">
            {/* ─── Header ─── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <SmartphoneCharging className="w-7 h-7 text-blue-600" />
                        BizRecharge Dashboard
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Real-time overview of all recharges logged by staff
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
                        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
                        <Download className="w-3.5 h-3.5" /> Export
                    </Button>
                </div>
            </div>

            {/* ─── KPI Cards ─── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Records', value: stats.total, icon: Users, color: 'blue', sub: `${stats.billSent} bills sent` },
                    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: IndianRupee, color: 'emerald', sub: `${stats.groupAdded} in groups` },
                    { label: 'Due Today', value: stats.dueToday, icon: AlertTriangle, color: 'red', sub: `${stats.expired} expired` },
                    { label: 'Due in 7 Days', value: stats.dueIn7, icon: Bell, color: 'amber', sub: `${stats.cashbackPending} cashback pending` },
                ].map(({ label, value, icon: Icon, color, sub }) => (
                    <Card key={label} className={cn(
                        "border",
                        color === 'blue' && "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200",
                        color === 'emerald' && "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200",
                        color === 'red' && "bg-red-50/50 dark:bg-red-950/20 border-red-200",
                        color === 'amber' && "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200",
                    )}>
                        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                            <CardTitle className={cn("text-xs font-medium",
                                color === 'blue' && "text-blue-600",
                                color === 'emerald' && "text-emerald-600",
                                color === 'red' && "text-red-600",
                                color === 'amber' && "text-amber-600",
                            )}>{label}</CardTitle>
                            <Icon className={cn("h-4 w-4",
                                color === 'blue' && "text-blue-500",
                                color === 'emerald' && "text-emerald-500",
                                color === 'red' && "text-red-500",
                                color === 'amber' && "text-amber-500",
                            )} />
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                            <div className={cn("text-2xl font-bold",
                                color === 'blue' && "text-blue-700 dark:text-blue-300",
                                color === 'emerald' && "text-emerald-700 dark:text-emerald-300",
                                color === 'red' && "text-red-700 dark:text-red-300",
                                color === 'amber' && "text-amber-700 dark:text-amber-300",
                            )}>{value}</div>
                            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ─── Charts ─── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Monthly Revenue */}
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="text-sm">Monthly Revenue (₹)</CardTitle></CardHeader>
                    <CardContent className="h-[280px]">
                        {stats.monthlyData.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data yet</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, 'Revenue']} />
                                    <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#grad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Operator Split */}
                <Card>
                    <CardHeader><CardTitle className="text-sm">Operator Split</CardTitle></CardHeader>
                    <CardContent className="h-[280px]">
                        {stats.operatorData.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No data yet</div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.operatorData} innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                                        {stats.operatorData.map((_, idx) => (
                                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: any, name: any, props: any) => [v, props.payload?.name]} />
                                    <Legend iconType="circle" iconSize={8} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* App Usage Bar */}
            {stats.appData.length > 0 && (
                <Card>
                    <CardHeader><CardTitle className="text-sm">Recharge App Usage</CardTitle></CardHeader>
                    <CardContent className="h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.appData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                                <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            {/* ─── Due Soon Alert ─── */}
            {(stats.dueToday > 0 || stats.dueIn7 > 0) && (
                <div className={cn(
                    "rounded-xl border p-4 flex items-start gap-3",
                    stats.dueToday > 0 ? "bg-red-50 border-red-200 dark:bg-red-950/20" : "bg-amber-50 border-amber-200 dark:bg-amber-950/20"
                )}>
                    <AlertCircle className={cn("w-5 h-5 mt-0.5 shrink-0", stats.dueToday > 0 ? "text-red-600" : "text-amber-600")} />
                    <div>
                        <p className="font-semibold text-sm">
                            {stats.dueToday > 0 ? `⚠️ ${stats.dueToday} recharge(s) due TODAY!` : `🔔 ${stats.dueIn7} recharge(s) due within 7 days`}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Use the filter below to view them. Notify your staff to process immediately.
                        </p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        className="ml-auto shrink-0 text-xs h-8"
                        onClick={() => setFilterDue(stats.dueToday > 0 ? 'today' : '7days')}
                    >
                        View
                    </Button>
                </div>
            )}

            {/* ─── Records Table ─── */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <CardTitle className="text-sm">All Recharge Records</CardTitle>
                        <div className="flex flex-wrap gap-2">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-8 h-8 w-44 text-xs"
                                />
                            </div>
                            <Select value={filterNetwork} onValueChange={setFilterNetwork}>
                                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Network" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Networks</SelectItem>
                                    {['Jio', 'Airtel', 'Vodafone Idea (Vi)', 'BSNL'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={filterDue} onValueChange={setFilterDue}>
                                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Due Status" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Due</SelectItem>
                                    <SelectItem value="today">Due Today</SelectItem>
                                    <SelectItem value="7days">7 Days</SelectItem>
                                    <SelectItem value="expired">Expired</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={filterCashback} onValueChange={setFilterCashback}>
                                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Cashback" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Cashback</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="received">Received</SelectItem>
                                    <SelectItem value="na">N/A</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                        {filtered.length} of {records.length} records
                    </p>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-muted/40 border-y">
                                    {['#', 'Date', 'Name', 'Mobile', 'Network', 'Amount', 'Pkg', 'Bill', 'Invoice', 'App', 'Grp', 'Next Recharge', 'Days Left', 'Cashback'].map(h => (
                                        <th key={h} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="border-b">
                                            {Array.from({ length: 14 }).map((_, j) => (
                                                <td key={j} className="px-3 py-3">
                                                    <div className="h-3 bg-muted animate-pulse rounded w-14" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={14} className="py-12 text-center text-muted-foreground">
                                            <p className="font-medium">No records found</p>
                                            <p className="text-xs mt-1">Staff can add records from the Recharge Tracker page</p>
                                        </td>
                                    </tr>
                                ) : filtered.map(record => {
                                    const days = record.daysRemaining ?? calcDaysRemaining(record.nextRechargeDate);
                                    return (
                                        <tr key={record.id} className={cn(
                                            "border-b hover:bg-muted/10 transition-colors",
                                            days <= 0 && "bg-red-50/30 dark:bg-red-950/10"
                                        )}>
                                            <td className="px-3 py-2 text-muted-foreground font-mono">{record.sNo}</td>
                                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                                {record.date ? new Date(record.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                            </td>
                                            <td className="px-3 py-2 font-medium whitespace-nowrap">{record.name}</td>
                                            <td className="px-3 py-2 font-mono text-muted-foreground">{record.mobileNumber}</td>
                                            <td className="px-3 py-2"><NetworkBadge network={record.simNetwork} /></td>
                                            <td className="px-3 py-2 font-semibold text-emerald-700">₹{record.amount}</td>
                                            <td className="px-3 py-2 text-center text-muted-foreground">{record.packageDuration}d</td>
                                            <td className="px-3 py-2 text-center">
                                                {record.billSend ? <Check className="w-3.5 h-3.5 text-green-600 mx-auto" /> : <X className="w-3.5 h-3.5 text-muted-foreground/40 mx-auto" />}
                                            </td>
                                            <td className="px-3 py-2 font-mono text-muted-foreground">{record.billInvoiceNo || '—'}</td>
                                            <td className="px-3 py-2"><Badge variant="outline" className="text-xs">{record.rechargeApp}</Badge></td>
                                            <td className="px-3 py-2 text-center">
                                                {record.groupAdded ? <Check className="w-3.5 h-3.5 text-green-600 mx-auto" /> : <X className="w-3.5 h-3.5 text-muted-foreground/40 mx-auto" />}
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                                                {record.nextRechargeDate
                                                    ? new Date(record.nextRechargeDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
                                                    : '—'}
                                            </td>
                                            <td className="px-3 py-2"><DaysBadge days={days} /></td>
                                            <td className="px-3 py-2">
                                                {record.cashbackStatus === 'received'
                                                    ? <Badge className="bg-green-100 text-green-700 text-xs">✓</Badge>
                                                    : record.cashbackStatus === 'pending'
                                                        ? <Badge className="bg-amber-100 text-amber-700 text-xs">⏳</Badge>
                                                        : <Badge className="bg-gray-100 text-gray-600 text-xs">N/A</Badge>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {filtered.length > 0 && (
                        <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{filtered.length} records shown</span>
                            <span>Total: <strong className="text-foreground">₹{filtered.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}</strong></span>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
