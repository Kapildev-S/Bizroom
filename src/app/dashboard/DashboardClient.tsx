"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Banknote, Users, FileText, Loader2 } from "lucide-react";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { db } from '@/lib/firebase'; // auth is now handled by useAuth
import { collection, query, getDocs, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import type { Invoice, Customer, AppSettings } from '@/lib/mockData';
import { getCurrencySymbol } from '@/lib/utils';
import { EmptyState } from '@/components/shared/EmptyState';
import Image from 'next/image';
import { useAuth } from "@/lib/useAuth";

// Helper to get status badge variant
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

export default function DashboardClient() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [settings, setSettings] = useState<AppSettings | null>(null);

    // Use the new useAuth hook
    const { user: currentUser, loading: authLoading } = useAuth();
    const [dataLoading, setDataLoading] = useState(true);

    const router = useRouter();

    useEffect(() => {
        // Only fetch data if we have a user
        if (!authLoading && currentUser) {
            const fetchData = async () => {
                try {
                    // Fetch all invoices for stats
                    const allInvoicesQuery = query(collection(db, `users/${currentUser.uid}/invoices`), orderBy("issueDate", "desc"));
                    const allInvoicesSnapshot = await getDocs(allInvoicesQuery);
                    const allFetchedInvoices = allInvoicesSnapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            issueDate: (data.issueDate as Timestamp).toDate().toISOString(),
                            dueDate: (data.dueDate as Timestamp).toDate().toISOString(),
                        } as Invoice;
                    });
                    setInvoices(allFetchedInvoices);

                    // Fetch all customers for stats
                    const customersQuery = query(collection(db, `users/${currentUser.uid}/customers`));
                    const customersSnapshot = await getDocs(customersQuery);
                    const fetchedCustomers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
                    setCustomers(fetchedCustomers);

                    // Fetch settings
                    const settingsDocRef = doc(db, `users/${currentUser.uid}/settings`, 'appSettings');
                    const settingsSnap = await getDoc(settingsDocRef);
                    if (settingsSnap.exists()) {
                        setSettings(settingsSnap.data() as AppSettings);
                    }
                } catch (error) {
                    console.error("Error fetching dashboard data:", error);
                } finally {
                    setDataLoading(false);
                }
            };

            fetchData();
        } else if (!authLoading && !currentUser) {
            // Redirect or handle unauthenticated state?
            // For now, loading state covers it until the hook resolves
            setDataLoading(false);
        }
    }, [currentUser, authLoading]);

    const loading = authLoading || (currentUser && dataLoading);

    const stats = React.useMemo(() => {
        const totalRevenue = invoices
            .filter(inv => inv.status === 'paid')
            .reduce((acc, inv) => acc + inv.totalAmount, 0);

        const outstandingAmount = invoices
            .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
            .reduce((acc, inv) => acc + inv.totalAmount, 0);

        const customerCount = customers.length;
        const defaultCurrency = settings?.invoiceSettings?.currency || 'INR';

        // Data for the bar chart (sales per month for the last 6 months)
        const salesByMonth: { [key: string]: { name: string, sales: number } } = {};
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);

        for (let i = 0; i < 6; i++) {
            const d = new Date(sixMonthsAgo);
            d.setMonth(d.getMonth() + i);
            const monthKey = d.toLocaleString('default', { month: 'short', year: '2-digit' });
            const monthName = d.toLocaleString('default', { month: 'short' });
            salesByMonth[monthKey] = { name: monthName, sales: 0 };
        }

        invoices
            .filter(inv => new Date(inv.issueDate) >= sixMonthsAgo && inv.status === 'paid')
            .forEach(inv => {
                const d = new Date(inv.issueDate);
                const monthKey = d.toLocaleString('default', { month: 'short', year: '2-digit' });
                if (salesByMonth[monthKey]) {
                    salesByMonth[monthKey].sales += inv.totalAmount;
                }
            });

        const chartData = Object.values(salesByMonth);

        return {
            totalRevenue,
            outstandingAmount,
            customerCount,
            currencySymbol: getCurrencySymbol(defaultCurrency),
            chartData
        };
    }, [invoices, customers, settings]);

    const recentInvoices = invoices.slice(0, 5);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading dashboard...</p>
            </div>
        );
    }

    if (!currentUser) {
        // Should ideally redirect, but following existing pattern or returning null
        // router.push('/auth/login'); // Optional
        return null;
    }

    if (invoices.length === 0 && customers.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight font-headline">Welcome, {currentUser?.displayName || 'User'}!</h2>
                        <p className="text-muted-foreground">Your business overview will appear here once you have some data.</p>
                    </div>
                </div>
                <EmptyState
                    title="Your Dashboard is Empty"
                    description="Create your first invoice to see your business analytics and recent transactions."
                    actionText="Create New Invoice"
                    actionLink="/invoices/new"
                >
                    <Image
                        src="https://placehold.co/300x240.png"
                        width={300}
                        height={240}
                        alt="Empty dashboard illustration"
                        data-ai-hint="dashboard empty"
                    />
                </EmptyState>
            </div>
        );
    }

    const chartConfig = {
        sales: {
            label: "Sales",
            color: "hsl(var(--primary))",
        },
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h2>
                    <p className="text-muted-foreground">Here's a quick overview of your business.</p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.currencySymbol}{stats.totalRevenue.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Total from all paid invoices</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                        <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.currencySymbol}{stats.outstandingAmount.toFixed(2)}</div>
                        <p className="text-xs text-muted-foreground">Amount yet to be collected</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+{stats.customerCount}</div>
                        <p className="text-xs text-muted-foreground">Total clients registered</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{invoices.filter(i => i.status === 'overdue').length}</div>
                        <p className="text-xs text-muted-foreground">Invoices past their due date</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <Card className="lg:col-span-4">
                    <CardHeader>
                        <CardTitle>Sales Overview</CardTitle>
                        <CardDescription>Your paid invoice revenue over the last 6 months.</CardDescription>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ChartContainer config={chartConfig} className="h-[300px] w-full">
                            <ResponsiveContainer>
                                <BarChart data={stats.chartData}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis dataKey="name" tickLine={false} tickMargin={10} axisLine={false} stroke="#888888" fontSize={12} />
                                    <YAxis tickFormatter={(value) => `${stats.currencySymbol}${(value as number / 1000).toFixed(0)}k`} stroke="#888888" fontSize={12} />
                                    <ChartTooltip content={<ChartTooltipContent currency={stats.currencySymbol} />} />
                                    <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Recent Transactions</CardTitle>
                        <CardDescription>Your 5 most recent invoices.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {recentInvoices.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentInvoices.map((invoice) => (
                                        <TableRow key={invoice.id} onClick={() => router.push(`/invoices/${invoice.id}`)} className="cursor-pointer">
                                            <TableCell>
                                                <div className="font-medium">{invoice.customerName}</div>
                                                <div className="hidden text-sm text-muted-foreground md:inline">{new Date(invoice.issueDate).toLocaleDateString()}</div>
                                            </TableCell>
                                            <TableCell>{getCurrencySymbol(invoice.currency)}{invoice.totalAmount.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusBadgeVariant(invoice.status)} className="capitalize">{invoice.status}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <p className="text-sm text-muted-foreground py-4">No transactions found.</p>
                        )}
                        <Button asChild size="sm" className="mt-4 w-full">
                            <Link href="/invoices">View All Invoices</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
