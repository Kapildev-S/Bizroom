"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { useAuth } from '@/lib/useAuth';
import {
    getRechargeRecords,
    addRechargeRecord,
    updateRechargeRecord,
    deleteRechargeRecord,
    bulkDeleteRechargeRecords,
    type RechargeRecord,
} from '@/app/actions/rechargeRecordsActions';
import { useToast } from '@/hooks/use-toast';
import {
    Plus, Pencil, Trash2, Search, Filter, Download, Upload,
    Smartphone, RefreshCw, CheckSquare, Square, Bell, TrendingUp,
    Clock, AlertTriangle, Wallet, X, Save, ChevronUp, ChevronDown,
    MoreHorizontal, Eye, Users, Check, ArrowUpDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

const SIM_NETWORKS = ['Jio', 'Airtel', 'Vodafone Idea (Vi)', 'BSNL'];
const RECHARGE_APPS = ['EG', 'My Jio', 'My Airtel', 'Vi App', 'Paytm', 'PhonePe', 'Direct'];
const CASHBACK_STATUSES = ['pending', 'received', 'na'];
const PACKAGE_DURATIONS = [1, 7, 14, 28, 30, 56, 84, 90, 180, 365];

type SortKey = keyof RechargeRecord | '';
type SortDir = 'asc' | 'desc';

const ADMIN_ID = '3l2SpTceF9Qany7x5IRHdHBPU9J3';

const emptyForm: Omit<RechargeRecord, 'id' | 'sNo' | 'daysRemaining' | 'createdAt' | 'updatedAt'> = {
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
};

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

function getDaysRemainingBadge(days: number) {
    if (days < 0) return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs font-semibold">{days}d (expired)</Badge>;
    if (days === 0) return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs font-semibold animate-pulse">Due Today</Badge>;
    if (days <= 3) return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs font-semibold">{days}d</Badge>;
    if (days <= 7) return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs font-semibold">{days}d</Badge>;
    if (days <= 14) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs font-semibold">{days}d</Badge>;
    return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs font-semibold">{days}d</Badge>;
}

function getNetworkColor(network: string) {
    switch (network) {
        case 'Jio': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'Airtel': return 'bg-red-100 text-red-700 border-red-200';
        case 'Vodafone Idea (Vi)': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'BSNL': return 'bg-green-100 text-green-700 border-green-200';
        default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
}

function getCashbackBadge(status: string) {
    if (status === 'received') return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">✓ Received</Badge>;
    if (status === 'pending') return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">⏳ Pending</Badge>;
    return <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">N/A</Badge>;
}

export default function RechargeRecordsPage() {
    const { user } = useAuth();
    const { toast } = useToast();

    const [records, setRecords] = useState<RechargeRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Selection
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Filters
    const [search, setSearch] = useState('');
    const [filterNetwork, setFilterNetwork] = useState('all');
    const [filterCashback, setFilterCashback] = useState('all');
    const [filterDue, setFilterDue] = useState('all');

    // Sort
    const [sortKey, setSortKey] = useState<SortKey>('sNo');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    // Dialogs
    const [formOpen, setFormOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<RechargeRecord | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

    // Form state
    const [form, setForm] = useState(emptyForm);

    const isAdmin = user?.uid === ADMIN_ID;

    const loadRecords = useCallback(async () => {
        if (!user || !isAdmin) return;
        setLoading(true);
        try {
            const data = await getRechargeRecords(user.uid);
            setRecords(data);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setLoading(false);
        }
    }, [user, isAdmin, toast]);

    useEffect(() => { loadRecords(); }, [loadRecords]);

    // Auto-calculate next recharge date when date or duration changes
    useEffect(() => {
        if (form.date && form.packageDuration) {
            const next = calcNextRechargeDate(form.date, form.packageDuration);
            setForm(f => ({ ...f, nextRechargeDate: next }));
        }
    }, [form.date, form.packageDuration]);

    // Stats
    const stats = useMemo(() => {
        const totalRevenue = records.reduce((s, r) => s + (r.amount || 0), 0);
        const dueToday = records.filter(r => {
            const d = r.daysRemaining ?? calcDaysRemaining(r.nextRechargeDate);
            return d <= 0 && d > -3;
        }).length;
        const dueIn7 = records.filter(r => {
            const d = r.daysRemaining ?? calcDaysRemaining(r.nextRechargeDate);
            return d > 0 && d <= 7;
        }).length;
        const cashbackPending = records.filter(r => r.cashbackStatus === 'pending').length;
        return { totalRevenue, dueToday, dueIn7, cashbackPending };
    }, [records]);

    // Filtered & sorted
    const filteredRecords = useMemo(() => {
        let data = [...records];

        if (search) {
            const q = search.toLowerCase();
            data = data.filter(r =>
                r.name?.toLowerCase().includes(q) ||
                r.mobileNumber?.includes(q) ||
                r.simNetwork?.toLowerCase().includes(q) ||
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

        if (sortKey) {
            data.sort((a, b) => {
                let av: any = a[sortKey as keyof RechargeRecord];
                let bv: any = b[sortKey as keyof RechargeRecord];
                if (typeof av === 'string') av = av.toLowerCase();
                if (typeof bv === 'string') bv = bv.toLowerCase();
                if (av < bv) return sortDir === 'asc' ? -1 : 1;
                if (av > bv) return sortDir === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return data;
    }, [records, search, filterNetwork, filterCashback, filterDue, sortKey, sortDir]);

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortKey(key); setSortDir('asc'); }
    };

    const SortIcon = ({ col }: { col: string }) => {
        if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
        return sortDir === 'asc'
            ? <ChevronUp className="w-3 h-3 ml-1 text-primary" />
            : <ChevronDown className="w-3 h-3 ml-1 text-primary" />;
    };

    const openAddForm = () => {
        setEditingRecord(null);
        setForm(emptyForm);
        setFormOpen(true);
    };

    const openEditForm = (record: RechargeRecord) => {
        setEditingRecord(record);
        setForm({
            date: record.date,
            name: record.name,
            mobileNumber: record.mobileNumber,
            simNetwork: record.simNetwork,
            amount: record.amount,
            packageDuration: record.packageDuration,
            billSend: record.billSend,
            billInvoiceNo: record.billInvoiceNo,
            rechargeApp: record.rechargeApp,
            groupAdded: record.groupAdded,
            nextRechargeDate: record.nextRechargeDate,
            nextReminderDate: record.nextReminderDate,
            cashbackStatus: record.cashbackStatus,
            notes: record.notes || '',
        });
        setFormOpen(true);
    };

    const handleSave = async () => {
        if (!user) return;
        if (!form.name || !form.mobileNumber) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Name and mobile number are required.' });
            return;
        }
        setSaving(true);
        try {
            if (editingRecord?.id) {
                const res = await updateRechargeRecord(user.uid, editingRecord.id, form);
                if (res.success) {
                    toast({ title: 'Updated!', description: 'Record updated successfully.' });
                } else throw new Error(res.error);
            } else {
                const res = await addRechargeRecord(user.uid, form);
                if (res.success) {
                    toast({ title: 'Added!', description: 'Recharge record added.' });
                } else throw new Error(res.error);
            }
            setFormOpen(false);
            await loadRecords();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!user || !deletingId) return;
        const res = await deleteRechargeRecord(user.uid, deletingId);
        if (res.success) {
            toast({ title: 'Deleted', description: 'Record removed.' });
            setDeleteDialogOpen(false);
            await loadRecords();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: res.error });
        }
    };

    const handleBulkDelete = async () => {
        if (!user) return;
        const res = await bulkDeleteRechargeRecords(user.uid, Array.from(selected));
        if (res.success) {
            toast({ title: 'Deleted', description: `${selected.size} records removed.` });
            setSelected(new Set());
            setBulkDeleteOpen(false);
            await loadRecords();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: res.error });
        }
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const n = new Set(prev);
            n.has(id) ? n.delete(id) : n.add(id);
            return n;
        });
    };

    const toggleSelectAll = () => {
        if (selected.size === filteredRecords.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filteredRecords.map(r => r.id!).filter(Boolean)));
        }
    };

    const handleExportCSV = () => {
        const headers = ['S.No', 'Date', 'Name', 'Mobile', 'Network', 'Amount', 'Duration(days)', 'Bill Sent', 'Invoice No', 'Recharge App', 'Group Added', 'Next Recharge', 'Reminder Date', 'Days Remaining', 'Cashback Status', 'Notes'];
        const rows = filteredRecords.map(r => [
            r.sNo,
            r.date,
            r.name,
            r.mobileNumber,
            r.simNetwork,
            r.amount,
            r.packageDuration,
            r.billSend ? 'Yes' : 'No',
            r.billInvoiceNo,
            r.rechargeApp,
            r.groupAdded ? 'Yes' : 'No',
            r.nextRechargeDate,
            r.nextReminderDate,
            r.daysRemaining ?? calcDaysRemaining(r.nextRechargeDate),
            r.cashbackStatus,
            r.notes || '',
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recharge-records-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: 'Exported!', description: 'CSV file downloaded.' });
    };

    if (!isAdmin) {
        return (
            <AuthenticatedLayout pageTitle="Recharge Records">
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <AlertTriangle className="w-12 h-12 text-amber-500" />
                    <p className="text-lg font-semibold text-muted-foreground">Admin access only</p>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout pageTitle="BizRecharge Records">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            <Smartphone className="w-7 h-7 text-blue-600" />
                            Recharge Records
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Track and manage all mobile recharges — smarter than Excel
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={loadRecords} className="gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5" />
                            Refresh
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5">
                            <Download className="w-3.5 h-3.5" />
                            Export CSV
                        </Button>
                        <Button size="sm" onClick={openAddForm} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                            <Plus className="w-4 h-4" />
                            Add Record
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Total Records</span>
                            <Users className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{records.length}</div>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Total Revenue</span>
                            <Wallet className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">₹{stats.totalRevenue.toLocaleString()}</div>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 rounded-xl p-4 border border-red-200 dark:border-red-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-red-600 dark:text-red-400">Due Today</span>
                            <AlertTriangle className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.dueToday}</div>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Due in 7 Days</span>
                            <Bell className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.dueIn7}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-card rounded-xl border p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search name, mobile, invoice..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 h-9"
                            />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                </button>
                            )}
                        </div>
                        <Select value={filterNetwork} onValueChange={setFilterNetwork}>
                            <SelectTrigger className="w-[150px] h-9">
                                <SelectValue placeholder="All Networks" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Networks</SelectItem>
                                {SIM_NETWORKS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterDue} onValueChange={setFilterDue}>
                            <SelectTrigger className="w-[150px] h-9">
                                <SelectValue placeholder="All Due Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Due Status</SelectItem>
                                <SelectItem value="today">Due Today</SelectItem>
                                <SelectItem value="7days">Due in 7 Days</SelectItem>
                                <SelectItem value="expired">Expired</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={filterCashback} onValueChange={setFilterCashback}>
                            <SelectTrigger className="w-[150px] h-9">
                                <SelectValue placeholder="Cashback" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Cashback</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="received">Received</SelectItem>
                                <SelectItem value="na">N/A</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Showing {filteredRecords.length} of {records.length} records</span>
                        {selected.size > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="text-primary font-medium">{selected.size} selected</span>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setBulkDeleteOpen(true)}
                                    className="h-7 text-xs gap-1"
                                >
                                    <Trash2 className="w-3 h-3" /> Delete Selected
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/50 border-b">
                                    <th className="p-3 text-left w-10">
                                        <Checkbox
                                            checked={selected.size > 0 && selected.size === filteredRecords.length}
                                            onCheckedChange={toggleSelectAll}
                                            className="border-muted-foreground"
                                        />
                                    </th>
                                    {[
                                        { label: '#', key: 'sNo' },
                                        { label: 'Date', key: 'date' },
                                        { label: 'Name', key: 'name' },
                                        { label: 'Mobile', key: 'mobileNumber' },
                                        { label: 'Network', key: 'simNetwork' },
                                        { label: 'Amount', key: 'amount' },
                                        { label: 'Pkg (days)', key: 'packageDuration' },
                                        { label: 'Bill', key: 'billSend' },
                                        { label: 'Invoice No', key: 'billInvoiceNo' },
                                        { label: 'App', key: 'rechargeApp' },
                                        { label: 'Group', key: 'groupAdded' },
                                        { label: 'Next Recharge', key: 'nextRechargeDate' },
                                        { label: 'Reminder', key: 'nextReminderDate' },
                                        { label: 'Days Left', key: 'daysRemaining' },
                                        { label: 'Cashback', key: 'cashbackStatus' },
                                    ].map(col => (
                                        <th
                                            key={col.key}
                                            className="p-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap cursor-pointer hover:text-foreground select-none"
                                            onClick={() => handleSort(col.key as SortKey)}
                                        >
                                            <span className="flex items-center">
                                                {col.label}
                                                <SortIcon col={col.key} />
                                            </span>
                                        </th>
                                    ))}
                                    <th className="p-3 text-left text-xs font-semibold text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} className="border-b">
                                            {Array.from({ length: 17 }).map((_, j) => (
                                                <td key={j} className="p-3">
                                                    <div className="h-4 bg-muted animate-pulse rounded w-16" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : filteredRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={17} className="p-12 text-center text-muted-foreground">
                                            <Smartphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                            <p className="font-medium">No records found</p>
                                            <p className="text-xs mt-1">Add your first recharge record to get started</p>
                                            <Button size="sm" onClick={openAddForm} className="mt-4 gap-1.5">
                                                <Plus className="w-4 h-4" /> Add Record
                                            </Button>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRecords.map((record) => {
                                        const days = record.daysRemaining ?? calcDaysRemaining(record.nextRechargeDate);
                                        const isOverdue = days <= 0;
                                        return (
                                            <tr
                                                key={record.id}
                                                className={cn(
                                                    "border-b transition-colors hover:bg-muted/30",
                                                    selected.has(record.id!) && "bg-primary/5",
                                                    isOverdue && "bg-red-50/50 dark:bg-red-950/20"
                                                )}
                                            >
                                                <td className="p-3">
                                                    <Checkbox
                                                        checked={selected.has(record.id!)}
                                                        onCheckedChange={() => toggleSelect(record.id!)}
                                                        className="border-muted-foreground"
                                                    />
                                                </td>
                                                <td className="p-3 text-muted-foreground font-mono text-xs">{record.sNo}</td>
                                                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                                                    {record.date ? new Date(record.date).toLocaleDateString('en-IN') : '—'}
                                                </td>
                                                <td className="p-3 font-medium whitespace-nowrap">{record.name}</td>
                                                <td className="p-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{record.mobileNumber}</td>
                                                <td className="p-3">
                                                    <Badge variant="outline" className={cn("text-xs font-medium", getNetworkColor(record.simNetwork))}>
                                                        {record.simNetwork}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">₹{record.amount}</td>
                                                <td className="p-3 text-center text-xs text-muted-foreground">{record.packageDuration}</td>
                                                <td className="p-3 text-center">
                                                    {record.billSend
                                                        ? <Check className="w-4 h-4 text-green-600 mx-auto" />
                                                        : <X className="w-4 h-4 text-muted-foreground mx-auto" />
                                                    }
                                                </td>
                                                <td className="p-3 text-xs font-mono text-muted-foreground whitespace-nowrap">{record.billInvoiceNo || '—'}</td>
                                                <td className="p-3">
                                                    <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-800">{record.rechargeApp}</Badge>
                                                </td>
                                                <td className="p-3 text-center">
                                                    {record.groupAdded
                                                        ? <Check className="w-4 h-4 text-green-600 mx-auto" />
                                                        : <X className="w-4 h-4 text-muted-foreground mx-auto" />
                                                    }
                                                </td>
                                                <td className="p-3 text-xs whitespace-nowrap text-muted-foreground">
                                                    {record.nextRechargeDate ? new Date(record.nextRechargeDate).toLocaleDateString('en-IN') : '—'}
                                                </td>
                                                <td className="p-3 text-xs whitespace-nowrap text-muted-foreground">
                                                    {record.nextReminderDate ? new Date(record.nextReminderDate).toLocaleDateString('en-IN') : '—'}
                                                </td>
                                                <td className="p-3">{getDaysRemainingBadge(days)}</td>
                                                <td className="p-3">{getCashbackBadge(record.cashbackStatus)}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            onClick={() => openEditForm(record)}
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => { setDeletingId(record.id!); setDeleteDialogOpen(true); }}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    {filteredRecords.length > 0 && (
                        <div className="px-4 py-3 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
                            <span>{filteredRecords.length} records</span>
                            <span>Total: <strong className="text-foreground">₹{filteredRecords.reduce((s, r) => s + (r.amount || 0), 0).toLocaleString()}</strong></span>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={formOpen} onOpenChange={setFormOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Smartphone className="w-5 h-5 text-blue-600" />
                            {editingRecord ? 'Edit Recharge Record' : 'Add New Recharge Record'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                        {/* Date */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Recharge Date *</Label>
                            <Input
                                type="date"
                                value={form.date}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* Name */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Customer Name *</Label>
                            <Input
                                placeholder="Enter name"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* Mobile */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Mobile Number *</Label>
                            <Input
                                placeholder="10-digit number"
                                value={form.mobileNumber}
                                onChange={e => setForm(f => ({ ...f, mobileNumber: e.target.value }))}
                                maxLength={10}
                                className="h-9 text-sm font-mono"
                            />
                        </div>

                        {/* SIM Network */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">SIM Network</Label>
                            <Select value={form.simNetwork} onValueChange={v => setForm(f => ({ ...f, simNetwork: v }))}>
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {SIM_NETWORKS.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Amount */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Amount (₹)</Label>
                            <Input
                                type="number"
                                placeholder="e.g. 299"
                                value={form.amount || ''}
                                onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* Package Duration */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Package Duration (days)</Label>
                            <Select value={String(form.packageDuration)} onValueChange={v => setForm(f => ({ ...f, packageDuration: Number(v) }))}>
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PACKAGE_DURATIONS.map(d => <SelectItem key={d} value={String(d)}>{d} days</SelectItem>)}
                                    <SelectItem value="custom">Custom</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Recharge App */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Recharge App</Label>
                            <Select value={form.rechargeApp} onValueChange={v => setForm(f => ({ ...f, rechargeApp: v }))}>
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {RECHARGE_APPS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Invoice No */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Bill Invoice No</Label>
                            <Input
                                placeholder="Invoice number"
                                value={form.billInvoiceNo}
                                onChange={e => setForm(f => ({ ...f, billInvoiceNo: e.target.value }))}
                                className="h-9 text-sm font-mono"
                            />
                        </div>

                        {/* Next Recharge Date (auto-calculated) */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Next Recharge Date <span className="text-muted-foreground">(auto-calc)</span></Label>
                            <Input
                                type="date"
                                value={form.nextRechargeDate}
                                onChange={e => setForm(f => ({ ...f, nextRechargeDate: e.target.value }))}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* Reminder Date */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Next Reminder Date</Label>
                            <Input
                                type="date"
                                value={form.nextReminderDate}
                                onChange={e => setForm(f => ({ ...f, nextReminderDate: e.target.value }))}
                                className="h-9 text-sm"
                            />
                        </div>

                        {/* Cashback Status */}
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Cashback Status</Label>
                            <Select value={form.cashbackStatus} onValueChange={v => setForm(f => ({ ...f, cashbackStatus: v }))}>
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="pending">⏳ Pending</SelectItem>
                                    <SelectItem value="received">✓ Received</SelectItem>
                                    <SelectItem value="na">N/A</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Checkboxes */}
                        <div className="space-y-3 sm:col-span-2 flex items-center gap-8 pt-2">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="billSend"
                                    checked={form.billSend}
                                    onCheckedChange={v => setForm(f => ({ ...f, billSend: !!v }))}
                                />
                                <Label htmlFor="billSend" className="text-sm cursor-pointer">Bill Sent ✓</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="groupAdded"
                                    checked={form.groupAdded}
                                    onCheckedChange={v => setForm(f => ({ ...f, groupAdded: !!v }))}
                                />
                                <Label htmlFor="groupAdded" className="text-sm cursor-pointer">Group Added</Label>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label className="text-xs font-medium">Notes</Label>
                            <Textarea
                                placeholder="Any additional notes..."
                                value={form.notes}
                                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                className="text-sm resize-none"
                                rows={2}
                            />
                        </div>

                        {/* Preview calculated days */}
                        {form.nextRechargeDate && (
                            <div className="sm:col-span-2 p-3 bg-muted/50 rounded-lg flex items-center gap-2 text-sm">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Days remaining after save:</span>
                                <strong>{calcDaysRemaining(form.nextRechargeDate)} days</strong>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" disabled={saving}>Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {editingRecord ? 'Save Changes' : 'Add Record'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete this recharge record. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Bulk Delete Confirm */}
            <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selected.size} Records?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete {selected.size} selected records. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AuthenticatedLayout>
    );
}
