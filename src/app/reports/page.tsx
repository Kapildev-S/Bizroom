
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, DollarSign, FileText, BarChart as BarChartIcon, AlertCircle } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date(),
  });
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

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
              issueDate: (data.issueDate as Timestamp).toDate().toISOString(),
              dueDate: (data.dueDate as Timestamp).toDate().toISOString(),
            } as Invoice;
          });
          setInvoices(fetchedInvoices);
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
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
      const matchesType = typeFilter === 'all' || invoice.invoiceType === typeFilter;
      return isAfterFrom && isBeforeTo && matchesStatus && matchesType;
    });
  }, [invoices, dateRange, statusFilter]);

  const reportData = useMemo(() => {
    const paidInvoices = filteredInvoices.filter(inv => inv.status === 'paid');
    const totalRevenue = paidInvoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
    const totalInvoices = filteredInvoices.length;
    const averageInvoiceValue = paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0;
    const overdueCount = filteredInvoices.filter(inv => inv.status === 'overdue').length;

    // Chart data (sales by month)
    const salesByMonth: { [key: string]: { name: string, sales: number } } = {};
    paidInvoices.forEach(inv => {
      const month = new Date(inv.issueDate).toLocaleString('default', { month: 'short' });
      if (!salesByMonth[month]) {
        salesByMonth[month] = { name: month, sales: 0 };
      }
      salesByMonth[month].sales += inv.totalAmount;
    });

    // Top customers
    const salesByCustomer: { [name: string]: number } = {};
    paidInvoices.forEach(inv => {
        if (!salesByCustomer[inv.customerName]) {
            salesByCustomer[inv.customerName] = 0;
        }
        salesByCustomer[inv.customerName] += inv.totalAmount;
    });
    const topCustomers = Object.entries(salesByCustomer)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, sales]) => ({ name, sales }));

    return {
      totalRevenue,
      totalInvoices,
      averageInvoiceValue,
      overdueCount,
      chartData: Object.values(salesByMonth),
      topCustomers
    };
  }, [filteredInvoices]);

  const currencySymbol = getCurrencySymbol(settings?.invoiceSettings?.currency);
  const chartConfig = { sales: { label: "Sales", color: "hsl(var(--primary))" } };
  const enableAdvancedInvoiceSystem = settings?.invoiceSettings?.enableAdvancedInvoiceSystem;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading report data...</p>
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
      )
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-primary">Report Filters</CardTitle>
          <CardDescription>Select criteria to view your sales report.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="sm:col-span-2 md:col-span-2">
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <DatePickerWithRange onDateChange={setDateRange} initialDateRange={dateRange} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
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
                <label className="text-sm font-medium mb-2 block">Invoice Type</label>
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
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{reportData.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From paid invoices in period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.totalInvoices}</div>
             <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Invoice Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currencySymbol}{reportData.averageInvoiceValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">For paid invoices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportData.overdueCount}</div>
            <p className="text-xs text-muted-foreground">In selected period</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
            <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>Paid invoice revenue over the selected period.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                    <ResponsiveContainer>
                        <BarChart data={reportData.chartData}>
                            <CartesianGrid vertical={false} />
                            <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} stroke="#888888" fontSize={12} />
                            <YAxis tickFormatter={(value) => `${currencySymbol}${(value as number / 1000).toFixed(0)}k`} stroke="#888888" fontSize={12} />
                            <ChartTooltip content={<ChartTooltipContent currency={currencySymbol} />} />
                            <Bar dataKey="sales" fill="hsl(var(--primary))" radius={4} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Top Customers by Revenue</CardTitle>
                <CardDescription>Top 5 customers in the selected period.</CardDescription>
            </CardHeader>
            <CardContent>
              {reportData.topCustomers.length > 0 ? (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {reportData.topCustomers.map((customer) => (
                        <TableRow key={customer.name}>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell className="text-right">{currencySymbol}{customer.sales.toFixed(2)}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
              ) : (
                 <p className="text-sm text-muted-foreground py-4 text-center">No paid invoices in this period to rank customers.</p>
              )}
            </CardContent>
        </Card>
      </div>

       <Card>
        <CardHeader>
            <CardTitle>Detailed Invoice List</CardTitle>
            <CardDescription>All invoices matching your filter criteria.</CardDescription>
        </CardHeader>
        <CardContent>
            {filteredInvoices.length > 0 ? (
                <div className="rounded-lg border overflow-hidden shadow-sm bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Issue Date</TableHead>
                            {enableAdvancedInvoiceSystem && <TableHead>Type</TableHead>}
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredInvoices.map((invoice) => (
                        <TableRow key={invoice.id} onClick={() => router.push(`/invoices/${invoice.id}`)} className="cursor-pointer">
                            <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                            <TableCell>{invoice.customerName}</TableCell>
                            <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                            {enableAdvancedInvoiceSystem && (
                                <TableCell>
                                    <Badge variant="outline" className="font-normal">{invoice.invoiceType}</Badge>
                                </TableCell>
                            )}
                            <TableCell>{getCurrencySymbol(invoice.currency)}{invoice.totalAmount.toFixed(2)}</TableCell>
                            <TableCell>
                                <Badge variant={getStatusBadgeVariant(invoice.status)} className="capitalize">{invoice.status}</Badge>
                            </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No invoices found matching your criteria.</p>
            )}
        </CardContent>
       </Card>
    </div>
  );
}
