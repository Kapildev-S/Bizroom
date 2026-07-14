"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/useAuth';
import { fetchRealAIStats, fetchUserDisplayNames, type AIUsageStats } from '@/app/actions/adminAIActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Bot, Zap, MessageSquare, AlertTriangle, Sparkles, RefreshCw,
    TrendingUp, Clock, CheckCircle, XCircle, Users, Search,
    Activity, BarChart3, Cpu,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

const ADMIN_ID = '3l2SpTceF9Qany7x5IRHdHBPU9J3';
const REFRESH_INTERVAL_MS = 30_000; // 30 s

const FEATURE_COLORS: Record<string, string> = {
    'Invoice Creation': '#3b82f6',
    'Sales Summary': '#10b981',
    'Stock Lookup': '#f59e0b',
    'Top Customer': '#a855f7',
    'Top Product': '#ec4899',
    'Invoice Lookup': '#06b6d4',
    'Add Customer': '#14b8a6',
    'Add Product': '#8b5cf6',
    'Update Stock': '#f97316',
    'General Chat': '#94a3b8',
};

function StatCard({
    label, value, sub, icon: Icon, color, loading,
}: {
    label: string; value: string | number; sub?: string;
    icon: any; color: string; loading?: boolean;
}) {
    return (
        <Card className={cn(
            "border",
            color === 'blue' && "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200",
            color === 'emerald' && "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200",
            color === 'amber' && "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200",
            color === 'red' && "bg-red-50/50 dark:bg-red-950/20 border-red-200",
            color === 'violet' && "bg-violet-50/50 dark:bg-violet-950/20 border-violet-200",
            color === 'slate' && "bg-slate-50/50 dark:bg-slate-950/20 border-slate-200",
        )}>
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4">
                <CardTitle className={cn("text-xs font-medium",
                    color === 'blue' && "text-blue-600",
                    color === 'emerald' && "text-emerald-600",
                    color === 'amber' && "text-amber-600",
                    color === 'red' && "text-red-600",
                    color === 'violet' && "text-violet-600",
                    color === 'slate' && "text-slate-600",
                )}>{label}</CardTitle>
                <Icon className={cn("h-4 w-4",
                    color === 'blue' && "text-blue-500",
                    color === 'emerald' && "text-emerald-500",
                    color === 'amber' && "text-amber-500",
                    color === 'red' && "text-red-500",
                    color === 'violet' && "text-violet-500",
                    color === 'slate' && "text-slate-500",
                )} />
            </CardHeader>
            <CardContent className="px-4 pb-4">
                {loading ? (
                    <div className="h-7 bg-muted animate-pulse rounded w-24 mt-1" />
                ) : (
                    <div className={cn("text-2xl font-bold",
                        color === 'blue' && "text-blue-700 dark:text-blue-300",
                        color === 'emerald' && "text-emerald-700 dark:text-emerald-300",
                        color === 'amber' && "text-amber-700 dark:text-amber-300",
                        color === 'red' && "text-red-700 dark:text-red-300",
                        color === 'violet' && "text-violet-700 dark:text-violet-300",
                        color === 'slate' && "text-slate-700 dark:text-slate-300",
                    )}>{value}</div>
                )}
                {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            </CardContent>
        </Card>
    );
}

export default function AIAssistantAdminPage() {
    const { user } = useAuth();
    const [stats, setStats] = useState<AIUsageStats | null>(null);
    const [userNames, setUserNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [userSearch, setUserSearch] = useState('');
    const [logSearch, setLogSearch] = useState('');

    const isAdmin = user?.uid === ADMIN_ID;

    const load = useCallback(async () => {
        if (!user || !isAdmin) return;
        try {
            const data = await fetchRealAIStats(user.uid);
            setStats(data);
            setLastRefresh(new Date());

            // Fetch display names for top users
            const uids = data.userBreakdown.slice(0, 20).map(u => u.userId);
            const names = await fetchUserDisplayNames(user.uid, uids);
            setUserNames(names);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [user, isAdmin]);

    useEffect(() => {
        load();
    }, [load]);

    // Auto-refresh every 30s
    useEffect(() => {
        const interval = setInterval(() => { load(); }, REFRESH_INTERVAL_MS);
        return () => clearInterval(interval);
    }, [load]);

    if (!isAdmin) return <div className="p-8 text-center text-muted-foreground">Admin access only.</div>;

    const filteredUsers = stats?.userBreakdown.filter(u => {
        const name = (userNames[u.userId] || u.userId).toLowerCase();
        return name.includes(userSearch.toLowerCase()) || u.userId.includes(userSearch.toLowerCase());
    }) || [];

    const filteredLogs = stats?.recentLogs.filter(l => {
        const q = logSearch.toLowerCase();
        return !q || l.userId.includes(q) || l.feature.toLowerCase().includes(q) || (userNames[l.userId] || '').toLowerCase().includes(q);
    }) || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Bot className="w-7 h-7 text-violet-600" />
                        AI Assistant Analytics
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Real-time credits & usage per user and feature
                        {lastRefresh && (
                            <span className="ml-2 text-xs opacity-60">
                                · Last updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                        )}
                    </p>
                </div>
                <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
                    <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <StatCard label="Total Requests" value={stats?.totalRequests.toLocaleString() ?? 0} icon={MessageSquare} color="blue" sub="All time" loading={loading} />
                <StatCard label="Est. Tokens Used" value={stats?.totalTokens.toLocaleString() ?? 0} icon={Zap} color="amber" sub="Estimated" loading={loading} />
                <StatCard label="Successful" value={stats?.successCount.toLocaleString() ?? 0} icon={CheckCircle} color="emerald" sub={`${stats?.successRate ?? 100}% success rate`} loading={loading} />
                <StatCard label="Errors" value={stats?.errorCount.toLocaleString() ?? 0} icon={XCircle} color="red" sub="Failed requests" loading={loading} />
                <StatCard label="Unique Users" value={stats?.userBreakdown.length.toLocaleString() ?? 0} icon={Users} color="violet" sub="Active users" loading={loading} />
                <StatCard label="Avg Response" value={stats ? `${stats.avgDurationMs}ms` : '—'} icon={Clock} color="slate" sub="Per request" loading={loading} />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Daily Trend */}
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-blue-500" />Daily AI Requests (Last 14 Days)</CardTitle></CardHeader>
                    <CardContent className="h-[260px]">
                        {loading ? (
                            <div className="flex items-center justify-center h-full"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                        ) : !stats?.dailyTrend.length || stats.dailyTrend.every(d => d.requests === 0) ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                <Activity className="w-8 h-8 opacity-20" />
                                <p className="text-sm">No data yet — start using the AI assistant to see usage here</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={stats.dailyTrend} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="aiGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="date" fontSize={11} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <Tooltip formatter={(v: any) => [v, 'Requests']} />
                                    <Area type="monotone" dataKey="requests" stroke="#8b5cf6" strokeWidth={2} fill="url(#aiGrad)" dot={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                {/* Feature Pie */}
                <Card>
                    <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="w-4 h-4 text-emerald-500" />Feature Usage</CardTitle></CardHeader>
                    <CardContent className="h-[260px]">
                        {loading ? (
                            <div className="flex items-center justify-center h-full"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                        ) : !stats?.featureBreakdown.length ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                                <Sparkles className="w-8 h-8 opacity-20" />
                                <p className="text-sm">No feature data yet</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.featureBreakdown}
                                        dataKey="count"
                                        nameKey="feature"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                    >
                                        {stats.featureBreakdown.map((entry, idx) => (
                                            <Cell key={idx} fill={FEATURE_COLORS[entry.feature] || '#94a3b8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: any, name: any, props: any) => [v + ' requests', props.payload?.feature]} />
                                    <Legend iconType="circle" iconSize={8} formatter={(v, entry: any) => entry.payload?.feature || v} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Feature breakdown table + hourly bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Feature breakdown table */}
                <Card>
                    <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-violet-500" />Feature Breakdown</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-muted/40 border-y">
                                        <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Feature</th>
                                        <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Requests</th>
                                        <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Est. Tokens</th>
                                        <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Errors</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="border-b">
                                                {[1, 2, 3, 4].map(j => (
                                                    <td key={j} className="px-4 py-3"><div className="h-3 bg-muted animate-pulse rounded w-16" /></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : !stats?.featureBreakdown.length ? (
                                        <tr><td colSpan={4} className="py-8 text-center text-muted-foreground">No data yet</td></tr>
                                    ) : stats.featureBreakdown.map(f => (
                                        <tr key={f.feature} className="border-b hover:bg-muted/10 transition-colors">
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: FEATURE_COLORS[f.feature] || '#94a3b8' }} />
                                                    <span className="font-medium">{f.feature}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{f.count.toLocaleString()}</td>
                                            <td className="px-4 py-2.5 text-right text-amber-700">{f.tokens.toLocaleString()}</td>
                                            <td className="px-4 py-2.5 text-right">
                                                {f.errors > 0
                                                    ? <Badge className="bg-red-100 text-red-700 text-xs">{f.errors}</Badge>
                                                    : <span className="text-green-600">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>

                {/* Hourly today */}
                <Card>
                    <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Cpu className="w-4 h-4 text-blue-500" />Today's Hourly Activity</CardTitle></CardHeader>
                    <CardContent className="h-[280px]">
                        {loading ? (
                            <div className="flex items-center justify-center h-full"><RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats?.hourlyToday || []} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                                    <XAxis dataKey="hour" fontSize={10} tickLine={false} axisLine={false}
                                        interval={3}
                                        tickFormatter={v => v.split(':')[0] + 'h'} />
                                    <YAxis fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <Tooltip formatter={(v: any) => [v, 'Requests']} />
                                    <Bar dataKey="count" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Per-User Breakdown */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Users className="w-4 h-4 text-violet-500" />Per-User Usage
                        </CardTitle>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search user…"
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                className="pl-8 h-8 text-xs w-48"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-muted/40 border-y">
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">#</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">User</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">UID</th>
                                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Requests</th>
                                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Est. Tokens</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Last Active</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i} className="border-b">
                                            {[1, 2, 3, 4, 5, 6].map(j => (
                                                <td key={j} className="px-4 py-3"><div className="h-3 bg-muted animate-pulse rounded w-20" /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan={6} className="py-10 text-center text-muted-foreground">No users found</td></tr>
                                ) : filteredUsers.map((u, idx) => (
                                    <tr key={u.userId} className="border-b hover:bg-muted/10 transition-colors">
                                        <td className="px-4 py-2.5 text-muted-foreground font-mono">{idx + 1}</td>
                                        <td className="px-4 py-2.5 font-semibold">{userNames[u.userId] || '—'}</td>
                                        <td className="px-4 py-2.5 font-mono text-muted-foreground">{u.userId.slice(0, 12)}…</td>
                                        <td className="px-4 py-2.5 text-right font-bold text-violet-700">{u.count.toLocaleString()}</td>
                                        <td className="px-4 py-2.5 text-right text-amber-700">{u.tokens.toLocaleString()}</td>
                                        <td className="px-4 py-2.5 text-muted-foreground">
                                            {u.lastActive
                                                ? new Date(u.lastActive).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {filteredUsers.length > 0 && (
                        <div className="px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground flex justify-between">
                            <span>{filteredUsers.length} users</span>
                            <span>Total: <strong>{filteredUsers.reduce((s, u) => s + u.count, 0).toLocaleString()}</strong> requests · <strong>{filteredUsers.reduce((s, u) => s + u.tokens, 0).toLocaleString()}</strong> tokens</span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Logs */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4 text-blue-500" />Recent AI Calls
                            <Badge variant="outline" className="text-xs font-normal">Live · auto-refreshes every 30s</Badge>
                        </CardTitle>
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Filter logs…"
                                value={logSearch}
                                onChange={e => setLogSearch(e.target.value)}
                                className="pl-8 h-8 text-xs w-48"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-muted/40 border-y">
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Time</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">User</th>
                                    <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Feature</th>
                                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Tokens</th>
                                    <th className="px-4 py-2.5 text-right font-semibold text-muted-foreground">Duration</th>
                                    <th className="px-4 py-2.5 text-center font-semibold text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 8 }).map((_, i) => (
                                        <tr key={i} className="border-b">
                                            {[1, 2, 3, 4, 5, 6].map(j => (
                                                <td key={j} className="px-4 py-3"><div className="h-3 bg-muted animate-pulse rounded w-16" /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-14 text-center text-muted-foreground">
                                            <Bot className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                            <p className="font-medium">No AI usage logged yet</p>
                                            <p className="text-xs mt-1">Logs appear here as users interact with the AI assistant</p>
                                        </td>
                                    </tr>
                                ) : filteredLogs.map(log => (
                                    <tr key={log.id} className="border-b hover:bg-muted/10 transition-colors">
                                        <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">
                                            {log.createdAt
                                                ? new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div>
                                                <p className="font-medium">{userNames[log.userId] || '—'}</p>
                                                <p className="text-muted-foreground font-mono">{log.userId.slice(0, 10)}…</p>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <Badge
                                                variant="outline"
                                                className="text-xs font-medium whitespace-nowrap"
                                                style={{ borderColor: FEATURE_COLORS[log.feature] + '60', color: FEATURE_COLORS[log.feature], backgroundColor: FEATURE_COLORS[log.feature] + '15' }}
                                            >
                                                {log.feature}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-amber-700 font-semibold">{log.estimatedTokens}</td>
                                        <td className="px-4 py-2.5 text-right text-muted-foreground">{log.durationMs}ms</td>
                                        <td className="px-4 py-2.5 text-center">
                                            {log.status === 'success'
                                                ? <Badge className="bg-green-100 text-green-700 text-xs">✓ OK</Badge>
                                                : <Badge className="bg-red-100 text-red-700 text-xs">✗ Err</Badge>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
