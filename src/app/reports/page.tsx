"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, FileText, BarChart as BarChartIcon, AlertCircle, Download, Share2, PieChart, TrendingUp, Filter, Calendar, ArrowUpRight, RefreshCw, Users, Package, ShoppingBag, ArrowUpDown } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, PieChart as RePieChart, Pie, Cell, AreaChart, Area, Tooltip, Legend } from "recharts";
import { getCurrencySymbol } from '@/lib/utils';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, getDoc, collection, query, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import type { AppSettings, Invoice } from '@/lib/mockData';
import { DatePickerWithRange } from '@/components/shared/DatePickerWithRange';
import type { DateRange } from 'react-day-picker';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/shared/EmptyState';
import Image from 'next/image';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

const COLORS = {
  primary: '#0f6f80',
  secondary: '#19CB97',
  accent: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  indigo: '#6366f1',
  teal: '#14b8a6',
  orange: '#f97316',
  chart: ['#0f6f80', '#19CB97', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6', '#f97316'],
};

const getStatusBadgeVariant = (status: Invoice['status']) => {
  switch (status) {
    case 'paid': return 'default';
    case 'sent': return 'secondary';
    case 'overdue': return 'destructive';
    case 'draft': return 'outline';
    case 'void': return 'outline';
    default: return 'secondary';
  }
};

export default function ReportsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const reportRef = useRef<HTMLDivElement>(null);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [productSortKey, setProductSortKey] = useState<'revenue' | 'qty'>('revenue');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setLoading(true);
        try {
          const settingsDocRef = doc(db, `users/${user.uid}/settings`, 'appSettings');
          const settingsSnap = await getDoc(settingsDocRef);
          if (settingsSnap.exists()) {
            setSettings(settingsSnap.data() as AppSettings);
          }

          const invoicesCollectionRef = collection(db, `users/${user.uid}/invoices`);
          const invoicesSnap = await getDocs(query(invoicesCollectionRef, orderBy("issueDate", "desc")));
          const fetchedInvoices = invoicesSnap.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              issueDate: data.issueDate?.toDate ? data.issueDate.toDate().toISOString() : data.issueDate,
              dueDate: data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : data.dueDate,
            } as Invoice;
          });
          setInvoices(fetchedInvoices);

          const productsCollectionRef = collection(db, `users/${user.uid}/products`);
          const productsSnap = await getDocs(productsCollectionRef);
          setTotalProducts(productsSnap.size);
        } catch (error) {
          console.error("Error fetching report data:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(invoice => {
      const issueDate = new Date(invoice.issueDate);
      const isAfterFrom = !dateRange?.from || issueDate >= dateRange.from;
      const isBeforeTo = !dateRange?.to || issueDate <= dateRange.to;
      const matchesStatus =
        statusFilter === 'all' ||
        statusFilter === 'sent' ||
        invoice.status === statusFilter;
      const matchesType = typeFilter === 'all' || invoice.invoiceType === typeFilter;
      return isAfterFrom && isBeforeTo && matchesStatus && matchesType;
    });
  }, [invoices, dateRange, statusFilter, typeFilter]);

  const reportData = useMemo(() => {
    const totalCreatedValue = filteredInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
    const totalInvoices = filteredInvoices.length;
    const averageInvoiceValue = totalInvoices > 0 ? totalCreatedValue / totalInvoices : 0;
    const overdueCount = filteredInvoices.filter(inv => inv.status === 'overdue').length;
    const paidCount = filteredInvoices.filter(inv => inv.status === 'paid').length;
    const sentCount = filteredInvoices.filter(inv => inv.status === 'sent').length;
    const draftCount = filteredInvoices.filter(inv => inv.status === 'draft').length;
    const paidRevenue = filteredInvoices.filter(inv => inv.status === 'paid').reduce((acc, inv) => acc + inv.totalAmount, 0);

    // Segregate by Category
    const retailInvoices = filteredInvoices.filter(inv => inv.invoiceType === 'Retail');
    const wholesaleInvoices = filteredInvoices.filter(inv => inv.invoiceType === 'Wholesale');
    const retailRevenue = retailInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
    const wholesaleRevenue = wholesaleInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);

    // Sales by month
    const salesByMonth: { [key: string]: { name: string, sales: number, count: number } } = {};
    filteredInvoices.forEach(inv => {
      const d = new Date(inv.issueDate);
      const month = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      const key = `${month} ${year}`;
      if (!salesByMonth[key]) {
        salesByMonth[key] = { name: key, sales: 0, count: 0 };
      }
      salesByMonth[key].sales += inv.totalAmount;
      salesByMonth[key].count += 1;
    });

    // Status distribution
    const statusDistribution = [
      { name: 'Paid', value: paidCount, color: '#19CB97' },
      { name: 'Sent', value: sentCount, color: '#0f6f80' },
      { name: 'Overdue', value: overdueCount, color: '#ef4444' },
      { name: 'Draft', value: draftCount, color: '#94a3b8' },
    ].filter(s => s.value > 0);

    // Top customers
    const salesByCustomer: { [name: string]: number } = {};
    filteredInvoices.forEach(inv => {
      if (!salesByCustomer[inv.customerName]) {
        salesByCustomer[inv.customerName] = 0;
      }
      salesByCustomer[inv.customerName] += inv.totalAmount;
    });
    const topCustomers = Object.entries(salesByCustomer)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, sales]) => ({ name, sales }));

    // Payment status summary
    const totalPaid = filteredInvoices.filter(i => i.status === 'paid').reduce((a, i) => a + i.totalAmount, 0);
    const totalUnpaid = filteredInvoices.filter(i => i.status !== 'paid').reduce((a, i) => a + i.totalAmount, 0);

    // Payment mode breakdown
    let cashRevenue = 0;
    let upiRevenue = 0;
    let cashCount = 0;
    let upiCount = 0;
    filteredInvoices.forEach(inv => {
      const mode = inv.paymentMode?.toLowerCase() || (inv.notes?.toLowerCase().includes('upi') ? 'upi' : 'cash');
      if (mode === 'upi') {
        upiRevenue += inv.totalAmount;
        upiCount += 1;
      } else {
        cashRevenue += inv.totalAmount;
        cashCount += 1;
      }
    });

    // Product sales aggregation (works for both regular invoices and POS bills)
    const productMap: Record<string, { name: string; qty: number; revenue: number; invoiceCount: number }> = {};
    filteredInvoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        const key = item.productName || item.productId || 'Unknown';
        if (!productMap[key]) {
          productMap[key] = { name: key, qty: 0, revenue: 0, invoiceCount: 0 };
        }
        productMap[key].qty += Number(item.quantity) || 0;
        productMap[key].revenue += Number(item.totalPrice) || 0;
        productMap[key].invoiceCount += 1;
      });
    });
    const productSales = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);

    return {
      totalRevenue: totalCreatedValue,
      totalInvoices,
      averageInvoiceValue,
      overdueCount,
      paidCount,
      sentCount,
      draftCount,
      paidRevenue,
      retailRevenue,
      wholesaleRevenue,
      retailCount: retailInvoices.length,
      wholesaleCount: wholesaleInvoices.length,
      chartData: Object.values(salesByMonth),
      topCustomers,
      statusDistribution,
      totalPaid,
      totalUnpaid,
      productSales,
      cashRevenue,
      upiRevenue,
      cashCount,
      upiCount,
    };
  }, [filteredInvoices]);

  const currencySymbol = getCurrencySymbol(settings?.invoiceSettings?.currency);
  const chartConfig = {
    sales: { label: "Revenue", color: "#0f6f80" },
    count: { label: "Invoices", color: "#19CB97" },
  };
  const enableAdvancedInvoiceSystem = settings?.invoiceSettings?.enableAdvancedInvoiceSystem;

  const handleExportCSV = useCallback(() => {
    setExporting(true);
    try {
      const headers = ['Invoice #', 'Customer', 'Date', 'Type', 'Status', 'Items', 'Subtotal', 'Tax', 'Total', 'Currency'];
      const rows = filteredInvoices.map(inv => [
        inv.invoiceNumber,
        inv.customerName,
        new Date(inv.issueDate).toLocaleDateString(),
        inv.invoiceType || 'N/A',
        inv.status,
        inv.items.length,
        inv.subtotal.toFixed(2),
        inv.taxAmount.toFixed(2),
        inv.totalAmount.toFixed(2),
        inv.currency || 'INR',
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `bizroom-report-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast({ title: 'Report Exported', description: 'CSV file has been downloaded.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not export the report.' });
    } finally {
      setExporting(false);
    }
  }, [filteredInvoices, toast]);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'BizRoom Sales Report',
          text: `Revenue: ${currencySymbol}${reportData.totalRevenue.toFixed(2)}\nInvoices: ${reportData.totalInvoices}\nPaid: ${reportData.paidCount}\nOverdue: ${reportData.overdueCount}`,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          toast({ variant: 'destructive', title: 'Share Failed', description: 'Could not share the report.' });
        }
      }
    } else {
      // Fallback: copy to clipboard
      const summary = `📊 BizRoom Report\n━━━━━━━━━━━━━━━\nRevenue: ${currencySymbol}${reportData.totalRevenue.toFixed(2)}\nInvoices: ${reportData.totalInvoices}\nAvg Value: ${currencySymbol}${reportData.averageInvoiceValue.toFixed(2)}\nPaid: ${reportData.paidCount} | Overdue: ${reportData.overdueCount}`;
      await navigator.clipboard.writeText(summary);
      toast({ title: 'Copied to Clipboard', description: 'Report summary copied. Share it anywhere!' });
    }
  }, [reportData, currencySymbol, toast]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-[#0f6f80]/10 blur-3xl" />
          <Loader2 className="relative h-12 w-12 animate-spin text-[#0f6f80]" />
        </div>
        <p className="mt-4 text-sm text-slate-500">Loading your reports...</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <EmptyState
        title="No Data for Reports"
        description="Generate your first report by adding customers and products, then creating an invoice."
        actions={(
          <>
            <Button asChild variant="outline"><Link href="/customers/new">Add Customer</Link></Button>
            <Button asChild variant="outline"><Link href="/products/new">Add Product</Link></Button>
            <Button asChild><Link href="/invoices/new">Create Invoice</Link></Button>
          </>
        )}
      >
        <Image
          src="https://placehold.co/300x240.png"
          width={300}
          height={240}
          alt="Empty reports illustration"
          data-ai-hint="reports analysis"
        />
      </EmptyState>
    );
  }

  return (
    <motion.div
      ref={reportRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Comprehensive view of your business performance</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV} disabled={exporting || filteredInvoices.length === 0} className="rounded-xl border-slate-200">
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export CSV
          </Button>
          <Button onClick={handleShare} className="rounded-xl bg-[#0f6f80] hover:bg-[#0b5f6e] text-white">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-slate-200 shadow-sm rounded-2xl">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-[#0f6f80]" />
            <span className="text-sm font-semibold text-slate-700">Filters</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <div className="sm:col-span-2 md:col-span-2">
              <label className="text-xs font-medium mb-1.5 block text-slate-600">Date Range</label>
              <DatePickerWithRange onDateChange={setDateRange} initialDateRange={dateRange} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block text-slate-600">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="void">Void</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {enableAdvancedInvoiceSystem && (
              <div>
                <label className="text-xs font-medium mb-1.5 block text-slate-600">Invoice Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Retail">Retail</SelectItem>
                    <SelectItem value="Wholesale">Wholesale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-l-4 border-l-[#0f6f80] shadow-sm rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Revenue</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{currencySymbol}{reportData.totalRevenue.toFixed(2)}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-[#0f6f80]/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-[#0f6f80]" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">{reportData.totalInvoices} invoices in period</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-l-4 border-l-[#19CB97] shadow-sm rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Collected</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{currencySymbol}{reportData.totalPaid.toFixed(2)}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">{reportData.paidCount} paid invoices</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-l-4 border-l-[#f59e0b] shadow-sm rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Value</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{currencySymbol}{reportData.averageInvoiceValue.toFixed(2)}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <BarChartIcon className="h-5 w-5 text-amber-500" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">per invoice average</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-l-4 border-l-[#8b5cf6] shadow-sm rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Invoices</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{reportData.totalInvoices}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-purple-500" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">{reportData.sentCount} sent, {reportData.draftCount ? `${reportData.draftCount} draft` : ''}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card className={`border-l-4 ${reportData.overdueCount > 0 ? 'border-l-red-500' : 'border-l-slate-300'} shadow-sm rounded-2xl`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overdue</p>
                  <p className={`text-2xl font-bold mt-1 ${reportData.overdueCount > 0 ? 'text-red-600' : 'text-slate-900'}`}>{reportData.overdueCount}</p>
                </div>
                <div className={`h-10 w-10 rounded-xl ${reportData.overdueCount > 0 ? 'bg-red-50' : 'bg-slate-50'} flex items-center justify-center`}>
                  <AlertCircle className={`h-5 w-5 ${reportData.overdueCount > 0 ? 'text-red-500' : 'text-slate-400'}`} />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">{reportData.overdueCount > 0 ? 'Requires attention' : 'All clear'}</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="border-l-4 border-l-[#14b8a6] shadow-sm rounded-2xl">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Products</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{totalProducts}</p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center">
                  <Package className="h-5 w-5 text-teal-500" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">total in catalogue</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="rounded-2xl bg-slate-100 p-1 flex-wrap h-auto">
          <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
          <TabsTrigger value="revenue" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Revenue Trend</TabsTrigger>
          <TabsTrigger value="distribution" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Distribution</TabsTrigger>
          <TabsTrigger value="products" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-1.5">
            <ShoppingBag className="h-3.5 w-3.5" /> Products
          </TabsTrigger>
          <TabsTrigger value="details" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            {/* Revenue Bar Chart */}
            <Card className="lg:col-span-4 shadow-sm rounded-2xl border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Revenue Overview</CardTitle>
                    <CardDescription>Monthly revenue for the selected period</CardDescription>
                  </div>
                  <TrendingUp className="h-5 w-5 text-[#0f6f80]" />
                </div>
              </CardHeader>
              <CardContent className="pl-2">
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <ResponsiveContainer>
                    <BarChart data={reportData.chartData} barCategoryGap="20%">
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} stroke="#94a3b8" fontSize={12} />
                      <YAxis tickFormatter={(value) => `${currencySymbol}${(value / 1000).toFixed(0)}k`} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent currency={currencySymbol} />} cursor={{ fill: 'rgba(15,111,128,0.08)' }} />
                      <Bar dataKey="sales" fill="#0f6f80" radius={[6, 6, 0, 0]} maxBarSize={60}>
                        {reportData.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Status Distribution Pie Chart */}
            <Card className="lg:col-span-3 shadow-sm rounded-2xl border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Status Distribution</CardTitle>
                    <CardDescription>Breakdown by payment status</CardDescription>
                  </div>
                  <PieChart className="h-5 w-5 text-[#0f6f80]" />
                </div>
              </CardHeader>
              <CardContent>
                {reportData.statusDistribution.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <div className="w-[180px] h-[180px] flex-shrink-0">
                      <ChartContainer config={{}} className="h-full w-full">
                        <ResponsiveContainer>
                          <RePieChart>
                            <Pie
                              data={reportData.statusDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {reportData.statusDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RePieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                    <div className="flex-1 space-y-2">
                      {reportData.statusDistribution.map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-slate-600">{item.name}</span>
                          </div>
                          <span className="font-semibold text-slate-900">{item.value}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between text-sm font-bold">
                          <span className="text-slate-800">Total</span>
                          <span className="text-slate-900">{filteredInvoices.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-10">No data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown & Top Customers */}
          <div className="grid gap-6 md:grid-cols-2">
            {enableAdvancedInvoiceSystem && (
              <>
                <Card className="bg-gradient-to-br from-indigo-50 to-indigo-50/30 border-indigo-100 shadow-sm rounded-2xl">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold text-indigo-900">Retail Sales</CardTitle>
                        <CardDescription className="text-xs text-indigo-600">Performance in Retail segment</CardDescription>
                      </div>
                      <Badge className="bg-indigo-600 rounded-full">Retail</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-2xl font-black text-indigo-950">{currencySymbol}{reportData.retailRevenue.toFixed(2)}</div>
                        <p className="text-xs text-indigo-700 font-medium">{reportData.retailCount} Invoices</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-tighter font-bold text-indigo-400">Contribution</span>
                        <div className="text-sm font-bold text-indigo-800">
                          {reportData.totalRevenue > 0 ? ((reportData.retailRevenue / reportData.totalRevenue) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 w-full bg-indigo-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-indigo-600 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${reportData.totalRevenue > 0 ? (reportData.retailRevenue / reportData.totalRevenue) * 100 : 0}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-50/30 border-emerald-100 shadow-sm rounded-2xl">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold text-emerald-900">Wholesale Sales</CardTitle>
                        <CardDescription className="text-xs text-emerald-600">Performance in Wholesale segment</CardDescription>
                      </div>
                      <Badge className="bg-emerald-600 rounded-full">Wholesale</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="text-2xl font-black text-emerald-950">{currencySymbol}{reportData.wholesaleRevenue.toFixed(2)}</div>
                        <p className="text-xs text-emerald-700 font-medium">{reportData.wholesaleCount} Invoices</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-tighter font-bold text-emerald-400">Contribution</span>
                        <div className="text-sm font-bold text-emerald-800">
                          {reportData.totalRevenue > 0 ? ((reportData.wholesaleRevenue / reportData.totalRevenue) * 100).toFixed(1) : 0}%
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-2 w-full bg-emerald-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-600 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${reportData.totalRevenue > 0 ? (reportData.wholesaleRevenue / reportData.totalRevenue) * 100 : 0}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            <Card className={`shadow-sm rounded-2xl border-slate-200 ${enableAdvancedInvoiceSystem ? '' : 'md:col-span-2'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Top Customers</CardTitle>
                    <CardDescription>By revenue in selected period</CardDescription>
                  </div>
                  <Users className="h-5 w-5 text-[#0f6f80]" />
                </div>
              </CardHeader>
              <CardContent>
                {reportData.topCustomers.length > 0 ? (
                  <div className="space-y-3">
                    {reportData.topCustomers.map((customer, index) => {
                      const maxSales = reportData.topCustomers[0].sales;
                      const barWidth = (customer.sales / maxSales) * 100;
                      return (
                        <div key={customer.name} className="group">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <div className="flex items-center gap-2">
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                                {index + 1}
                              </span>
                              <span className="font-medium text-slate-700 truncate max-w-[150px]">{customer.name}</span>
                            </div>
                            <span className="font-semibold text-slate-900">{currencySymbol}{customer.sales.toFixed(2)}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ backgroundColor: COLORS.chart[index] }}
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{ duration: 0.8, delay: index * 0.1, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">No invoices in this period to rank customers.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Revenue Trend</CardTitle>
                  <CardDescription>Monthly revenue performance with area fill</CardDescription>
                </div>
                <TrendingUp className="h-5 w-5 text-[#0f6f80]" />
              </div>
            </CardHeader>
            <CardContent className="pl-2">
              <ChartContainer config={chartConfig} className="h-[400px] w-full">
                <ResponsiveContainer>
                  <AreaChart data={reportData.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0f6f80" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0f6f80" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} stroke="#94a3b8" fontSize={12} />
                    <YAxis tickFormatter={(value) => `${currencySymbol}${(value / 1000).toFixed(0)}k`} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent currency={currencySymbol} />} />
                    <Area type="monotone" dataKey="sales" stroke="#0f6f80" strokeWidth={3} fill="url(#revenueGradient)" dot={{ fill: '#0f6f80', stroke: 'white', strokeWidth: 2, r: 4 }} activeDot={{ fill: '#0f6f80', stroke: 'white', strokeWidth: 3, r: 6 }} />
                    <Area type="monotone" dataKey="count" stroke="#19CB97" strokeWidth={2} fill="none" strokeDasharray="5 5" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribution" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Donut Chart - Status Distribution */}
            <Card className="shadow-sm rounded-2xl border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Status Distribution</CardTitle>
                    <CardDescription>Invoice breakdown by status</CardDescription>
                  </div>
                  <PieChart className="h-5 w-5 text-[#0f6f80]" />
                </div>
              </CardHeader>
              <CardContent>
                {reportData.statusDistribution.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <div className="h-[250px] w-full">
                      <ChartContainer config={{}} className="h-full w-full">
                        <ResponsiveContainer>
                          <RePieChart>
                            <Pie
                              data={reportData.statusDistribution}
                              cx="50%"
                              cy="50%"
                              innerRadius={70}
                              outerRadius={110}
                              paddingAngle={3}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={true}
                            >
                              {reportData.statusDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RePieChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-3 w-full mt-2">
                      {reportData.statusDistribution.map((item) => (
                        <div key={item.name} className="flex items-center gap-2 text-sm bg-slate-50 rounded-xl px-3 py-2">
                          <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-600">{item.name}</span>
                          <span className="ml-auto font-semibold text-slate-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-10">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* Revenue vs Collected */}
            <Card className="shadow-sm rounded-2xl border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Revenue vs Collected</CardTitle>
                    <CardDescription>Total billing vs amount received</CardDescription>
                  </div>
                  <BarChartIcon className="h-5 w-5 text-[#0f6f80]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ChartContainer config={{
                    billed: { label: "Billed", color: "#0f6f80" },
                    collected: { label: "Collected", color: "#19CB97" },
                  }} className="h-full w-full">
                    <ResponsiveContainer>
                      <BarChart data={[
                        { name: 'Billed', value: reportData.totalRevenue },
                        { name: 'Collected', value: reportData.totalPaid },
                        { name: 'Uncollected', value: reportData.totalRevenue - reportData.totalPaid },
                      ]} barCategoryGap="30%">
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} stroke="#94a3b8" fontSize={12} />
                        <YAxis tickFormatter={(value) => `${currencySymbol}${(value / 1000).toFixed(0)}k`} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent currency={currencySymbol} />} cursor={{ fill: 'rgba(15,111,128,0.08)' }} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80}>
                          <Cell fill="#0f6f80" />
                          <Cell fill="#19CB97" />
                          <Cell fill="#f59e0b" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-900">{currencySymbol}{(reportData.totalRevenue - reportData.totalPaid).toFixed(2)}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Outstanding</p>
                  </div>
                  <div className="text-center border-x border-slate-200">
                    <p className="text-lg font-bold text-[#0f6f80]">{currencySymbol}{reportData.totalRevenue.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-500 uppercase">Total Billed</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-emerald-600">{reportData.totalRevenue > 0 ? ((reportData.totalPaid / reportData.totalRevenue) * 100).toFixed(1) : 0}%</p>
                    <p className="text-[10px] text-slate-500 uppercase">Collection Rate</p>
                  </div>
                </div>
              </CardContent>
            {/* Payment Method Distribution */}
            <Card className="shadow-sm rounded-2xl border-slate-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">Payment Methods</CardTitle>
                    <CardDescription>Breakdown by payment mode (Cash vs UPI)</CardDescription>
                  </div>
                  <Smartphone className="h-5 w-5 text-[#0f6f80]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center bg-slate-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-[#E87B1E]" />
                      <span className="font-semibold text-slate-700">Cash</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{currencySymbol}{reportData.cashRevenue.toFixed(2)}</div>
                      <div className="text-xs text-slate-500">{reportData.cashCount} Invoices</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-purple-600" />
                      <span className="font-semibold text-slate-700">UPI</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{currencySymbol}{reportData.upiRevenue.toFixed(2)}</div>
                      <div className="text-xs text-slate-500">{reportData.upiCount} Invoices</div>
                    </div>
                  </div>
                  {/* Progress bar contribution */}
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>Cash vs UPI Share</span>
                      <span>
                        {reportData.cashRevenue + reportData.upiRevenue > 0
                          ? ((reportData.upiRevenue / (reportData.cashRevenue + reportData.upiRevenue)) * 100).toFixed(0)
                          : 0}% UPI
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-[#E87B1E] rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-purple-600"
                        style={{
                          width: `${
                            reportData.cashRevenue + reportData.upiRevenue > 0
                              ? (reportData.upiRevenue / (reportData.cashRevenue + reportData.upiRevenue)) * 100
                              : 0
                          }%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          {reportData.productSales.length === 0 ? (
            <Card className="shadow-sm rounded-2xl border-slate-200">
              <CardContent className="py-16 text-center">
                <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">No product sales data for the selected period.</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your date range or status filter.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Top Products Bar Chart */}
              <Card className="shadow-sm rounded-2xl border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">Top Products by Revenue</CardTitle>
                      <CardDescription>Top 10 products sold in the selected period</CardDescription>
                    </div>
                    <Package className="h-5 w-5 text-[#14b8a6]" />
                  </div>
                </CardHeader>
                <CardContent className="pl-2">
                  <ChartContainer config={{ revenue: { label: 'Revenue', color: '#14b8a6' }, qty: { label: 'Qty', color: '#0f6f80' } }} className="h-[300px] w-full">
                    <ResponsiveContainer>
                      <BarChart
                        data={reportData.productSales.slice(0, 10).map(p => ({ name: p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name, revenue: p.revenue, qty: p.qty, fullName: p.name }))}
                        barCategoryGap="20%"
                        margin={{ top: 10, right: 16, left: 0, bottom: 40 }}
                      >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={11} angle={-35} textAnchor="end" interval={0} />
                        <YAxis tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip
                          formatter={(value: any, name: string) => [
                            name === 'revenue' ? `${currencySymbol}${Number(value).toFixed(2)}` : value,
                            name === 'revenue' ? 'Revenue' : 'Qty Sold'
                          ]}
                          labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                          contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                        />
                        <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={50}>
                          {reportData.productSales.slice(0, 10).map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS.chart[index % COLORS.chart.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              {/* Full Product Sales Table */}
              <Card className="shadow-sm rounded-2xl border-slate-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900">All Product Sales</CardTitle>
                      <CardDescription>{reportData.productSales.length} unique products sold in this period</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Sort by:</span>
                      <button
                        onClick={() => setProductSortKey(productSortKey === 'revenue' ? 'qty' : 'revenue')}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                          productSortKey === 'revenue'
                            ? 'bg-[#14b8a6]/10 text-[#14b8a6] border-[#14b8a6]/30'
                            : 'bg-[#0f6f80]/10 text-[#0f6f80] border-[#0f6f80]/30'
                        }`}
                      >
                        <ArrowUpDown className="h-3 w-3" />
                        {productSortKey === 'revenue' ? 'Revenue' : 'Qty Sold'}
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 hover:bg-slate-50">
                          <TableHead className="font-semibold text-slate-700 w-8">#</TableHead>
                          <TableHead className="font-semibold text-slate-700">Product Name</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-right">Qty Sold</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-right">Revenue</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-right">Avg Unit Price</TableHead>
                          <TableHead className="font-semibold text-slate-700 text-right">Bills</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...reportData.productSales]
                          .sort((a, b) => productSortKey === 'qty' ? b.qty - a.qty : b.revenue - a.revenue)
                          .map((product, index) => {
                            const maxRevenue = reportData.productSales[0]?.revenue || 1;
                            const barW = Math.round((product.revenue / maxRevenue) * 100);
                            const avgPrice = product.qty > 0 ? product.revenue / product.qty : 0;
                            return (
                              <TableRow key={product.name} className="hover:bg-slate-50/70 transition-colors">
                                <TableCell className="text-xs text-slate-400 font-medium">{index + 1}</TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-slate-800 text-sm">{product.name}</p>
                                    <div className="mt-1 h-1.5 w-full max-w-[160px] rounded-full bg-slate-100 overflow-hidden">
                                      <motion.div
                                        className="h-full rounded-full bg-[#14b8a6]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${barW}%` }}
                                        transition={{ duration: 0.6, delay: index * 0.03, ease: 'easeOut' }}
                                      />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Badge variant="secondary" className="rounded-full font-semibold tabular-nums">{product.qty % 1 === 0 ? product.qty : product.qty.toFixed(2)}</Badge>
                                </TableCell>
                                <TableCell className="text-right font-bold text-slate-900 tabular-nums">
                                  {currencySymbol}{product.revenue.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right text-slate-500 text-sm tabular-nums">
                                  {currencySymbol}{avgPrice.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right text-slate-400 text-xs">{product.invoiceCount}</TableCell>
                              </TableRow>
                            );
                          })
                        }
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="details">
          <Card className="shadow-sm rounded-2xl border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">Detailed Invoice List</CardTitle>
                  <CardDescription>{filteredInvoices.length} invoices matching your filter criteria</CardDescription>
                </div>
                <Badge variant="outline" className="rounded-full bg-slate-50">{filteredInvoices.length} results</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredInvoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="font-semibold text-slate-700">Invoice #</TableHead>
                        <TableHead className="font-semibold text-slate-700">Customer</TableHead>
                        <TableHead className="font-semibold text-slate-700">Date</TableHead>
                        {enableAdvancedInvoiceSystem && <TableHead className="font-semibold text-slate-700">Type</TableHead>}
                        <TableHead className="font-semibold text-slate-700 text-right">Total</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id} onClick={() => router.push(`/invoices/${invoice.id}`)} className="cursor-pointer hover:bg-slate-50 transition-colors">
                          <TableCell className="font-medium text-[#0f6f80]">{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.customerName}</TableCell>
                          <TableCell className="text-slate-500">{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                          {enableAdvancedInvoiceSystem && (
                            <TableCell>
                              <Badge variant="outline" className="font-normal rounded-full">{invoice.invoiceType}</Badge>
                            </TableCell>
                          )}
                          <TableCell className="text-right font-semibold">{getCurrencySymbol(invoice.currency)}{invoice.totalAmount.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={getStatusBadgeVariant(invoice.status)} className="capitalize rounded-full">{invoice.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-10">
                  <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">No invoices found matching your criteria.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
