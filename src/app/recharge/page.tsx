"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    staffGetRechargeRecords,
    staffAddRechargeRecord,
    staffUpdateRechargeRecord,
    staffDeleteRechargeRecord,
    type RechargeRecord,
} from '@/app/actions/rechargeRecordsActions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from '@/components/ui/dialog';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Plus, Pencil, Trash2, Search, Download, RefreshCw, Smartphone,
    AlertTriangle, Bell, Wallet, Users, Check, X, Save,
    ChevronUp, ChevronDown, ArrowUpDown, Calendar, Lock, Eye, EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const TEAM_PASSWORD = 'Team@123';
const STAFF_UID = 'staff_user'; // fixed UID for non-auth staff page
const SIM_NETWORKS = ['Jio', 'Airtel', 'Vodafone Idea (Vi)', 'BSNL'];
const RECHARGE_APPS = ['EG', 'Malgopay', 'DirectPay', 'UPI'];


type SortKey = keyof RechargeRecord | '';
type SortDir = 'asc' | 'desc';

const emptyForm = (): Omit<RechargeRecord, 'id' | 'sNo' | 'daysRemaining' | 'createdAt' | 'updatedAt'> => ({
    date: new Date().toISOString().split('T')[0],
    name: '',
    mobileNumber: '',
    simNetwork: 'Jio',
    amount: 0,
    packageDuration: 28,
    billSend: false,
    billInvoiceNo: '',
    rechargeApp: 'EG',
    groupAdded: false,
    nextRechargeDate: '',
    nextReminderDate: '',
    cashbackStatus: 'pending',
    notes: '',
});

// ─── Utilities ─────────────────────────────────────────────────────────────────

function calcNextRechargeDate(date: string, duration: number): string {
    if (!date || !duration) return '';
    const d = new Date(date);
    d.setDate(d.getDate() + duration);
    return d.toISOString().split('T')[0];
}

function calcDaysRemaining(targetDateStr: string): number {
    if (!targetDateStr) return 0;
    const target = new Date(targetDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function DaysBadge({ days }: { days: number }) {
    if (days < 0) return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs whitespace-nowrap">{Math.abs(days)}d ago</Badge>;
    if (days === 0) return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs animate-pulse whitespace-nowrap">Due Today!</Badge>;
    if (days <= 3) return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs whitespace-nowrap">{days}d left</Badge>;
    if (days <= 7) return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs whitespace-nowrap">{days}d left</Badge>;
    if (days <= 14) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs whitespace-nowrap">{days}d left</Badge>;
    return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs whitespace-nowrap">{days}d left</Badge>;
}

function NetworkBadge({ network }: { network: string }) {
    const map: Record<string, string> = {
        'Jio': 'bg-blue-100 text-blue-700 border-blue-200',
        'Airtel': 'bg-red-100 text-red-700 border-red-200',
        'Vodafone Idea (Vi)': 'bg-purple-100 text-purple-700 border-purple-200',
        'BSNL': 'bg-green-100 text-green-700 border-green-200',
    };
    return <Badge variant="outline" className={cn('text-xs font-semibold whitespace-nowrap', map[network] || 'bg-gray-100 text-gray-700')}>{network}</Badge>;
}

// ─── Password Gate ──────────────────────────────────────────────────────────────

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [shaking, setShaking] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === TEAM_PASSWORD) {
            sessionStorage.setItem('recharge_unlocked', '1');
            onUnlock();
        } else {
            setError('Incorrect password. Try again.');
            setShaking(true);
            setTimeout(() => setShaking(false), 600);
            setPassword('');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-4">
            <div className={cn(
                "bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8 w-full max-w-sm border border-white/10",
                shaking && "animate-[shake_0.5s_ease-in-out]"
            )}>
                <style>{`
                    @keyframes shake {
                        0%, 100% { transform: translateX(0); }
                        20% { transform: translateX(-8px); }
                        40% { transform: translateX(8px); }
                        60% { transform: translateX(-6px); }
                        80% { transform: translateX(6px); }
                    }
                `}</style>

                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                        <Smartphone className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white">Recharge Tracker</h1>
                    <p className="text-sm text-slate-500 mt-1">Staff access only</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-sm font-medium">Team Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                type={showPw ? 'text' : 'password'}
                                placeholder="Enter password"
                                value={password}
                                onChange={e => { setPassword(e.target.value); setError(''); }}
                                className="pl-10 pr-10 h-11"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPw(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
                    </div>
                    <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                        Unlock
                    </Button>
                </form>
            </div>
        </div>
    );
}

// ─── Quick Add Form (inline, always visible at top) ──────────────────────────

function QuickAddForm({ onSaved }: { onSaved: () => void }) {
    const { toast } = useToast();
    const [form, setForm] = useState(emptyForm());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (form.date && form.packageDuration) {
            const next = calcNextRechargeDate(form.date, form.packageDuration);
            setForm(f => ({ ...f, nextRechargeDate: next }));
        }
    }, [form.date, form.packageDuration]);

    const handleSave = async () => {
        if (!form.name.trim()) { toast({ variant: 'destructive', title: 'Name required' }); return; }
        if (form.mobileNumber.length !== 10) { toast({ variant: 'destructive', title: 'Enter 10-digit mobile number' }); return; }
        if (!form.amount || form.amount < 1) { toast({ variant: 'destructive', title: 'Enter recharge amount' }); return; }

        setSaving(true);
        try {
            const res = await staffAddRechargeRecord(STAFF_UID, form);
            if (!res.success) throw new Error(res.error);
            toast({ title: '✅ Recharge Added!', description: `${form.name} — ₹${form.amount} (${form.simNetwork})` });
            setForm(emptyForm());
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setSaving(false);
            onSaved();
        }
    };

    return (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
                </div>
                <h2 className="font-bold text-base text-blue-900 dark:text-blue-100">Add New Recharge</h2>
            </div>

            {/* Row 1: Primary fields */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                <div className="space-y-1 lg:col-span-1">
                    <Label className="text-xs font-semibold text-slate-600">Date</Label>
                    <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="h-9 text-sm bg-white" />
                </div>
                <div className="space-y-1 lg:col-span-2">
                    <Label className="text-xs font-semibold text-slate-600">Customer Name *</Label>
                    <Input
                        placeholder="Full name"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="h-9 text-sm bg-white"
                        autoComplete="off"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Mobile *</Label>
                    <Input
                        placeholder="10 digits"
                        value={form.mobileNumber}
                        maxLength={10}
                        onChange={e => setForm(f => ({ ...f, mobileNumber: e.target.value.replace(/\D/g, '') }))}
                        className="h-9 text-sm bg-white font-mono"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Network</Label>
                    <Select value={form.simNetwork} onValueChange={v => setForm(f => ({ ...f, simNetwork: v }))}>
                        <SelectTrigger className="h-9 text-sm bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {SIM_NETWORKS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Amount (₹) *</Label>
                    <Input
                        type="number"
                        placeholder="e.g. 299"
                        value={form.amount || ''}
                        onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
                        className="h-9 text-sm bg-white font-semibold"
                    />
                </div>
            </div>

            {/* Row 2: Secondary fields */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Package (days)</Label>
                    <Input
                        type="number"
                        placeholder="e.g. 28"
                        value={form.packageDuration || ''}
                        onChange={e => setForm(f => ({ ...f, packageDuration: Number(e.target.value) }))}
                        className="h-9 text-sm bg-white"
                        min={1}
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">App Used</Label>
                    <Select value={form.rechargeApp} onValueChange={v => setForm(f => ({ ...f, rechargeApp: v }))}>
                        <SelectTrigger className="h-9 text-sm bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {RECHARGE_APPS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Invoice No</Label>
                    <Input
                        placeholder="Optional"
                        value={form.billInvoiceNo}
                        onChange={e => setForm(f => ({ ...f, billInvoiceNo: e.target.value }))}
                        className="h-9 text-sm bg-white font-mono"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Next Recharge</Label>
                    <Input
                        type="date"
                        value={form.nextRechargeDate}
                        onChange={e => setForm(f => ({ ...f, nextRechargeDate: e.target.value }))}
                        className="h-9 text-sm bg-white"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Cashback</Label>
                    <Select value={form.cashbackStatus} onValueChange={v => setForm(f => ({ ...f, cashbackStatus: v }))}>
                        <SelectTrigger className="h-9 text-sm bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pending">⏳ Pending</SelectItem>
                            <SelectItem value="received">✓ Received</SelectItem>
                            <SelectItem value="na">N/A</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Reminder Date</Label>
                    <Input
                        type="date"
                        value={form.nextReminderDate}
                        onChange={e => setForm(f => ({ ...f, nextReminderDate: e.target.value }))}
                        className="h-9 text-sm bg-white"
                    />
                </div>
            </div>

            {/* Row 3: Checkboxes + Save */}
            <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                    <Checkbox id="qs-bill" checked={form.billSend} onCheckedChange={v => setForm(f => ({ ...f, billSend: !!v }))} />
                    <Label htmlFor="qs-bill" className="text-sm cursor-pointer select-none">Bill Sent</Label>
                </div>
                <div className="flex items-center gap-2">
                    <Checkbox id="qs-grp" checked={form.groupAdded} onCheckedChange={v => setForm(f => ({ ...f, groupAdded: !!v }))} />
                    <Label htmlFor="qs-grp" className="text-sm cursor-pointer select-none">Group Added</Label>
                </div>
                {form.nextRechargeDate && (
                    <div className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-100 rounded-lg px-3 py-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5" />
                        Next recharge in {calcDaysRemaining(form.nextRechargeDate)} days
                    </div>
                )}
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="ml-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2 px-6 h-10 rounded-xl shadow-md shadow-blue-500/20"
                >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {saving ? 'Saving…' : 'Add Recharge'}
                </Button>
            </div>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StaffRechargePage() {
    const { toast } = useToast();
    const [unlocked, setUnlocked] = useState(false);

    const [records, setRecords] = useState<RechargeRecord[]>([]);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');
    const [filterNetwork, setFilterNetwork] = useState('all');
    const [filterDue, setFilterDue] = useState('all');
    const [sortKey, setSortKey] = useState<SortKey>('sNo');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    const [editingRecord, setEditingRecord] = useState<RechargeRecord | null>(null);
    const [editForm, setEditForm] = useState(emptyForm());
    const [editOpen, setEditOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Check session storage for unlocked state
    useEffect(() => {
        if (sessionStorage.getItem('recharge_unlocked') === '1') {
            setUnlocked(true);
        }
    }, []);

    const loadRecords = useCallback(async () => {
        setLoading(true);
        try {
            const data = await staffGetRechargeRecords(STAFF_UID);
            setRecords(data);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { if (unlocked) loadRecords(); }, [unlocked, loadRecords]);

    // Auto-calc edit form next recharge date
    useEffect(() => {
        if (editForm.date && editForm.packageDuration) {
            const next = calcNextRechargeDate(editForm.date, editForm.packageDuration);
            setEditForm(f => ({ ...f, nextRechargeDate: next }));
        }
    }, [editForm.date, editForm.packageDuration]);

    const stats = useMemo(() => {
        const totalAmount = records.reduce((s, r) => s + (r.amount || 0), 0);
        const dueToday = records.filter(r => {
            const d = r.daysRemaining ?? calcDaysRemaining(r.nextRechargeDate);
            return d <= 0 && d > -3;
        }).length;
        const dueTomorrow = records.filter(r => {
            const d = r.daysRemaining ?? calcDaysRemaining(r.nextRechargeDate);
            return d === 1;
        });
        const dueIn7 = records.filter(r => {
            const d = r.daysRemaining ?? calcDaysRemaining(r.nextRechargeDate);
            return d > 0 && d <= 7;
        }).length;
        return { total: records.length, totalAmount, dueToday, dueIn7, dueTomorrow };
    }, [records]);

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
        if (sortKey) {
            data.sort((a, b) => {
                let av: any = a[sortKey as keyof RechargeRecord] ?? '';
                let bv: any = b[sortKey as keyof RechargeRecord] ?? '';
                if (typeof av === 'string') av = av.toLowerCase();
                if (typeof bv === 'string') bv = bv.toLowerCase();
                if (av < bv) return sortDir === 'asc' ? -1 : 1;
                if (av > bv) return sortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return data;
    }, [records, search, filterNetwork, filterDue, sortKey, sortDir]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const SortIcon = ({ col }: { col: string }) => {
        if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-25" />;
        return sortDir === 'asc'
            ? <ChevronUp className="w-3 h-3 ml-1 text-blue-600" />
            : <ChevronDown className="w-3 h-3 ml-1 text-blue-600" />;
    };

    const openEdit = (r: RechargeRecord) => {
        setEditingRecord(r);
        setEditForm({
            date: r.date, name: r.name, mobileNumber: r.mobileNumber,
            simNetwork: r.simNetwork, amount: r.amount, packageDuration: r.packageDuration,
            billSend: r.billSend, billInvoiceNo: r.billInvoiceNo, rechargeApp: r.rechargeApp,
            groupAdded: r.groupAdded, nextRechargeDate: r.nextRechargeDate,
            nextReminderDate: r.nextReminderDate, cashbackStatus: r.cashbackStatus,
            notes: r.notes || '',
        });
        setEditOpen(true);
    };

    const handleEditSave = async () => {
        if (!editingRecord?.id) return;
        setSaving(true);
        try {
            const res = await staffUpdateRechargeRecord(STAFF_UID, editingRecord.id, editForm);
            if (!res.success) throw new Error(res.error);
            toast({ title: '✓ Updated', description: 'Record saved.' });
            setEditOpen(false);
            await loadRecords();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        const res = await staffDeleteRechargeRecord(STAFF_UID, deleteId);
        if (res.success) {
            toast({ title: 'Deleted' });
            setDeleteId(null);
            await loadRecords();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: res.error });
        }
    };

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
        a.download = `recharges-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Exported!' });
    };

    // ── Password Gate ─────────────────────────────────────────────────────────
    if (!unlocked) {
        return <PasswordGate onUnlock={() => setUnlocked(true)} />;
    }

    // ── Main Page ─────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b sticky top-0 z-20 shadow-sm">
                <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/30">
                            <Smartphone className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-base leading-tight">Recharge Tracker</h1>
                            <p className="text-xs text-muted-foreground leading-tight">Staff data entry</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={loadRecords} className="gap-1.5 h-8 text-xs">
                            <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} /> Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 h-8 text-xs">
                            <Download className="w-3.5 h-3.5" /> Export
                        </Button>
                        <Button
                            variant="ghost" size="sm"
                            onClick={() => { sessionStorage.removeItem('recharge_unlocked'); setUnlocked(false); }}
                            className="gap-1.5 h-8 text-xs text-muted-foreground"
                        >
                            <Lock className="w-3.5 h-3.5" /> Lock
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-screen-2xl mx-auto px-4 py-5 space-y-5">

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Records', value: stats.total, icon: Users, color: 'blue' },
                        { label: 'Total Amount', value: `₹${stats.totalAmount.toLocaleString()}`, icon: Wallet, color: 'emerald' },
                        { label: 'Due Today', value: stats.dueToday, icon: AlertTriangle, color: 'red' },
                        { label: 'Due in 7 Days', value: stats.dueIn7, icon: Bell, color: 'amber' },
                    ].map(({ label, value, icon: Icon, color }) => (
                        <div key={label} className={cn(
                            "rounded-xl p-4 border bg-white dark:bg-slate-900",
                            color === 'red' && stats.dueToday > 0 && "border-red-300 bg-red-50 dark:bg-red-950/20",
                            color === 'amber' && stats.dueIn7 > 0 && "border-amber-300 bg-amber-50 dark:bg-amber-950/20",
                        )}>
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs text-muted-foreground">{label}</p>
                                <Icon className={cn("w-4 h-4",
                                    color === 'blue' && "text-blue-500",
                                    color === 'emerald' && "text-emerald-500",
                                    color === 'red' && "text-red-500",
                                    color === 'amber' && "text-amber-500",
                                )} />
                            </div>
                            <p className={cn("text-xl font-bold",
                                color === 'blue' && "text-blue-700",
                                color === 'emerald' && "text-emerald-700",
                                color === 'red' && "text-red-700",
                                color === 'amber' && "text-amber-700",
                            )}>{value}</p>
                        </div>
                    ))}
                </div>

                {/* Quick Add Form */}
                <QuickAddForm onSaved={loadRecords} />

                {/* Due Tomorrow Alert */}
                {stats.dueTomorrow.length > 0 && (
                    <div className="rounded-2xl border-2 border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-700 p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-md shadow-orange-400/30">
                                <Bell className="w-4 h-4 text-white" />
                            </div>
                            <div>
                                <p className="font-bold text-orange-800 dark:text-orange-200 text-sm">
                                    🔔 {stats.dueTomorrow.length} customer{stats.dueTomorrow.length > 1 ? 's' : ''} need recharge TOMORROW
                                </p>
                                <p className="text-xs text-orange-600 dark:text-orange-400">Recharge these before their deadline</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {stats.dueTomorrow.map(r => (
                                <div key={r.id} className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl px-4 py-3 border border-orange-200 dark:border-orange-800 shadow-sm">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center shrink-0">
                                        <Smartphone className="w-4 h-4 text-orange-600" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-sm truncate">{r.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono">{r.mobileNumber}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-xs font-bold text-orange-700">₹{r.amount}</p>
                                        <NetworkBadge network={r.simNetwork} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Filters + Table */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm overflow-hidden">
                    {/* Filter bar */}
                    <div className="px-4 py-3 border-b flex flex-wrap gap-2 items-center">
                        <div className="relative flex-1 min-w-[160px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                            <Input placeholder="Search name, mobile…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs" />
                            {search && <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>}
                        </div>
                        <Select value={filterNetwork} onValueChange={setFilterNetwork}>
                            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Network" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Networks</SelectItem>
                                {SIM_NETWORKS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterDue} onValueChange={setFilterDue}>
                            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Due Status" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Due</SelectItem>
                                <SelectItem value="today">Due Today</SelectItem>
                                <SelectItem value="7days">Due in 7 Days</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                            </SelectContent>
                        </Select>
                        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} of {records.length}</span>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b">
                                    {[
                                        { label: '#', key: 'sNo' },
                                        { label: 'Date', key: 'date' },
                                        { label: 'Name', key: 'name' },
                                        { label: 'Mobile', key: 'mobileNumber' },
                                        { label: 'Network', key: 'simNetwork' },
                                        { label: '₹ Amount', key: 'amount' },
                                        { label: 'Days', key: 'packageDuration' },
                                        { label: 'Bill', key: 'billSend' },
                                        { label: 'Invoice', key: 'billInvoiceNo' },
                                        { label: 'App', key: 'rechargeApp' },
                                        { label: 'Group', key: 'groupAdded' },
                                        { label: 'Next Recharge', key: 'nextRechargeDate' },
                                        { label: 'Days Left', key: 'daysRemaining' },
                                        { label: 'Cashback', key: 'cashbackStatus' },
                                    ].map(col => (
                                        <th
                                            key={col.key}
                                            className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 whitespace-nowrap cursor-pointer hover:text-slate-700 select-none"
                                            onClick={() => handleSort(col.key as SortKey)}
                                        >
                                            <span className="flex items-center">{col.label}<SortIcon col={col.key} /></span>
                                        </th>
                                    ))}
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <tr key={i} className="border-b">
                                            {Array.from({ length: 15 }).map((_, j) => (
                                                <td key={j} className="px-3 py-3">
                                                    <div className="h-3.5 bg-slate-100 animate-pulse rounded w-14" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={15} className="py-16 text-center text-muted-foreground">
                                            <Smartphone className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                            <p className="font-medium">No records yet</p>
                                            <p className="text-xs mt-1">Use the form above to add your first recharge</p>
                                        </td>
                                    </tr>
                                ) : filtered.map(record => {
                                    const days = record.daysRemaining ?? calcDaysRemaining(record.nextRechargeDate);
                                    return (
                                        <tr
                                            key={record.id}
                                            className={cn(
                                                "border-b transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/30",
                                                days <= 0 && "bg-red-50/50 dark:bg-red-950/10"
                                            )}
                                        >
                                            <td className="px-3 py-2.5 text-xs text-slate-400 font-mono">{record.sNo}</td>
                                            <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                                                {record.date ? new Date(record.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                                            </td>
                                            <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{record.name}</td>
                                            <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{record.mobileNumber}</td>
                                            <td className="px-3 py-2.5"><NetworkBadge network={record.simNetwork} /></td>
                                            <td className="px-3 py-2.5 font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">₹{record.amount}</td>
                                            <td className="px-3 py-2.5 text-center text-xs text-slate-500">{record.packageDuration}</td>
                                            <td className="px-3 py-2.5 text-center">
                                                {record.billSend ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-slate-200 mx-auto" />}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs font-mono text-slate-400">{record.billInvoiceNo || '—'}</td>
                                            <td className="px-3 py-2.5"><Badge variant="outline" className="text-xs">{record.rechargeApp}</Badge></td>
                                            <td className="px-3 py-2.5 text-center">
                                                {record.groupAdded ? <Check className="w-4 h-4 text-green-600 mx-auto" /> : <X className="w-4 h-4 text-slate-200 mx-auto" />}
                                            </td>
                                            <td className="px-3 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                                                {record.nextRechargeDate ? new Date(record.nextRechargeDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                                            </td>
                                            <td className="px-3 py-2.5"><DaysBadge days={days} /></td>
                                            <td className="px-3 py-2.5">
                                                {record.cashbackStatus === 'received'
                                                    ? <Badge className="bg-green-100 text-green-700 text-xs">✓ Got</Badge>
                                                    : record.cashbackStatus === 'pending'
                                                        ? <Badge className="bg-amber-100 text-amber-700 text-xs">⏳</Badge>
                                                        : <Badge className="bg-slate-100 text-slate-500 text-xs">N/A</Badge>}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-1">
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEdit(record)}>
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteId(record.id!)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {filtered.length > 0 && (
                        <div className="px-4 py-3 border-t bg-slate-50/50 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{filtered.length} records</span>
                            <span>Total: <strong className="text-emerald-700">₹{filtered.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}</strong></span>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="w-4 h-4 text-blue-600" /> Edit Recharge Record
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
                        <div className="space-y-1.5"><Label className="text-xs font-semibold">Date</Label><Input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} className="h-9 text-sm" /></div>
                        <div className="space-y-1.5"><Label className="text-xs font-semibold">Name *</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-9 text-sm" /></div>
                        <div className="space-y-1.5"><Label className="text-xs font-semibold">Mobile *</Label><Input value={editForm.mobileNumber} maxLength={10} onChange={e => setEditForm(f => ({ ...f, mobileNumber: e.target.value.replace(/\D/g, '') }))} className="h-9 text-sm font-mono" /></div>
                        <div className="space-y-1.5"><Label className="text-xs font-semibold">Network</Label>
                            <Select value={editForm.simNetwork} onValueChange={v => setEditForm(f => ({ ...f, simNetwork: v }))}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>{SIM_NETWORKS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5"><Label className="text-xs font-semibold">Amount (₹)</Label><Input type="number" value={editForm.amount || ''} onChange={e => setEditForm(f => ({ ...f, amount: Number(e.target.value) }))} className="h-9 text-sm" /></div>
                        <div className="space-y-1.5"><Label className="text-xs font-semibold">Package (days)</Label>
                            <Input
                                type="number"
                                placeholder="e.g. 28"
                                value={editForm.packageDuration || ''}
                                onChange={e => setEditForm(f => ({ ...f, packageDuration: Number(e.target.value) }))}
                                className="h-9 text-sm"
                                min={1}
                            />
                        </div>
                        <div className="space-y-1.5"><Label className="text-xs font-semibold">App</Label>
                            <Select value={editForm.rechargeApp} onValueChange={v => setEditForm(f => ({ ...f, rechargeApp: v }))}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>{RECHARGE_APPS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5"><Label className="text-xs font-semibold">Invoice No</Label><Input value={editForm.billInvoiceNo} onChange={e => setEditForm(f => ({ ...f, billInvoiceNo: e.target.value }))} className="h-9 text-sm font-mono" /></div>
                        <div className="space-y-1.5"><Label className="text-xs font-semibold">Next Recharge <span className="text-muted-foreground font-normal">(auto)</span></Label><Input type="date" value={editForm.nextRechargeDate} onChange={e => setEditForm(f => ({ ...f, nextRechargeDate: e.target.value }))} className="h-9 text-sm" /></div>
                        <div className="space-y-1.5"><Label className="text-xs font-semibold">Reminder Date</Label><Input type="date" value={editForm.nextReminderDate} onChange={e => setEditForm(f => ({ ...f, nextReminderDate: e.target.value }))} className="h-9 text-sm" /></div>
                        <div className="space-y-1.5"><Label className="text-xs font-semibold">Cashback</Label>
                            <Select value={editForm.cashbackStatus} onValueChange={v => setEditForm(f => ({ ...f, cashbackStatus: v }))}>
                                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">⏳ Pending</SelectItem>
                                    <SelectItem value="received">✓ Received</SelectItem>
                                    <SelectItem value="na">N/A</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-6 pt-1">
                            <div className="flex items-center gap-2"><Checkbox id="eb" checked={editForm.billSend} onCheckedChange={v => setEditForm(f => ({ ...f, billSend: !!v }))} /><Label htmlFor="eb" className="text-sm cursor-pointer">Bill Sent</Label></div>
                            <div className="flex items-center gap-2"><Checkbox id="eg" checked={editForm.groupAdded} onCheckedChange={v => setEditForm(f => ({ ...f, groupAdded: !!v }))} /><Label htmlFor="eg" className="text-sm cursor-pointer">Group Added</Label></div>
                        </div>
                        <div className="sm:col-span-2 space-y-1.5"><Label className="text-xs font-semibold">Notes</Label><Textarea rows={2} value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="text-sm resize-none" /></div>
                    </div>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild><Button variant="outline" disabled={saving}>Cancel</Button></DialogClose>
                        <Button onClick={handleEditSave} disabled={saving} className="gap-1.5">
                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this record?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
