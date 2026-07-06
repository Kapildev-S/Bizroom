"use client";

import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, TrendingUp, Search, ArrowRight, DollarSign, Save } from 'lucide-react';
import type { Invoice, Product } from '@/lib/mockData';
import type { InvoiceProfit } from '@/lib/types/profit';
import { getAllProfits } from '@/lib/firebase/profitActions';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

export default function ProfitDashboard() {
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [profits, setProfits] = useState<InvoiceProfit[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Date filter for reports (defaults to today in YYYY-MM-DD)
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadData(currentUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      // Fetch invoices
      const invoicesQuery = query(collection(db, `users/${userId}/invoices`), orderBy('issueDate', 'desc'));
      const invoicesSnapshot = await getDocs(invoicesQuery);
      const invoicesData = invoicesSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
      setInvoices(invoicesData);

      // Fetch profits
      const profitsData = await getAllProfits(userId);
      setProfits(profitsData);

      // Fetch products
      const productsQuery = query(collection(db, `users/${userId}/products`));
      const productsSnapshot = await getDocs(productsQuery);
      const productsData = productsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      setProducts(productsData);

    } catch (error) {
      console.error("Error loading profit data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers for Profit Settings ---
  const handleProductProfitChange = (index: number, field: 'profitReferenceAmount' | 'profitReferenceProfit', value: string) => {
    const newProducts = [...products];
    newProducts[index] = {
      ...newProducts[index],
      [field]: value === '' ? undefined : parseFloat(value)
    };
    setProducts(newProducts);
  };

  const handleSaveProductProfit = async (product: Product) => {
    if (!user) return;
    try {
      const productRef = doc(db, `users/${user.uid}/products`, product.id);
      await updateDoc(productRef, {
        profitReferenceAmount: product.profitReferenceAmount || null,
        profitReferenceProfit: product.profitReferenceProfit || null
      });
      toast({ title: "Success", description: "Profit rule saved for " + product.name });
    } catch (error) {
      console.error("Error saving product profit:", error);
      toast({ title: "Error", description: "Failed to save profit rule", variant: "destructive" });
    }
  };

  // --- Calculations for Daily Report ---
  const dailyInvoices = invoices.filter(inv => {
    try {
      const d = typeof inv.issueDate === 'string' ? inv.issueDate : 
                (inv.issueDate as any)?.toDate ? (inv.issueDate as any).toDate().toISOString() : 
                new Date(inv.issueDate).toISOString();
      return d.startsWith(reportDate);
    } catch { return false; }
  });
  
  // Calculate dynamic profits for invoices that don't have a saved profit document
  const getDynamicProfit = (inv: Invoice) => {
    const savedProfit = profits.find(p => p.invoiceId === inv.id);
    if (savedProfit) return { val: savedProfit.totalProfit, type: 'Tracked' };
    
    let totalDynamicProfit = 0;
    let hasRules = false;
    inv.items.forEach(item => {
      const productDef = products.find(p => p.id === item.productId);
      if (productDef && productDef.profitReferenceAmount && productDef.profitReferenceProfit) {
        hasRules = true;
        const margin = productDef.profitReferenceProfit / productDef.profitReferenceAmount;
        totalDynamicProfit += (item.unitPrice * margin) * item.quantity;
      }
    });
    
    if (hasRules) return { val: totalDynamicProfit, type: 'Auto-Calculated' };
    return null;
  };

  const dailyProfitsWithDynamic = dailyInvoices.map(inv => ({
    invId: inv.id,
    profitInfo: getDynamicProfit(inv)
  }));
  
  const dailyRevenue = dailyInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const dailyTrackedProfit = dailyProfitsWithDynamic.reduce((sum, p) => sum + (p.profitInfo?.val || 0), 0);
  
  // Calculate total historical tracking for the Overview (including dynamic)
  const allProfitsWithDynamic = invoices.map(inv => getDynamicProfit(inv)).filter(Boolean);
  const totalProfit = allProfitsWithDynamic.reduce((sum, p) => sum + (p?.val || 0), 0);
  
  const totalRevenue = invoices.reduce((sum, inv) => {
    // Only count revenue if the invoice has profit tracked/calculated
    const pInfo = getDynamicProfit(inv);
    if (pInfo) return sum + inv.totalAmount;
    return sum;
  }, 0);

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AuthenticatedLayout pageTitle="Profit Dashboard">
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Profit Tracking</h2>
            <p className="text-muted-foreground">Configure product margins and view daily profit reports.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="report" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="report">Daily Report</TabsTrigger>
              <TabsTrigger value="settings">Profit Settings</TabsTrigger>
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
            </TabsList>

            {/* TAB 1: DAILY REPORT */}
            <TabsContent value="report" className="space-y-6">
              <div className="flex items-center gap-4 bg-card p-4 rounded-lg border shadow-sm w-fit">
                <label className="font-medium text-sm">Select Date:</label>
                <Input 
                  type="date" 
                  value={reportDate} 
                  onChange={(e) => setReportDate(e.target.value)} 
                  className="w-auto"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Daily Revenue ({reportDate})</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{dailyRevenue.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total sales for selected date</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Daily Profit</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">₹{dailyTrackedProfit.toFixed(2)}</div>
                    <p className="text-xs text-muted-foreground mt-1">Total profit for selected date</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Daily Margin</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dailyRevenue > 0 ? ((dailyTrackedProfit / dailyRevenue) * 100).toFixed(1) : "0.0"}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Average margin for the day</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Invoices on {reportDate}</CardTitle>
                  <CardDescription>Breakdown of profit for this specific day.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice No.</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Profit</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailyInvoices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                              No sales on this date.
                            </TableCell>
                          </TableRow>
                        ) : (
                          dailyInvoices.map(inv => {
                            const pInfo = getDynamicProfit(inv);
                            return (
                              <TableRow key={inv.id}>
                                <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                                <TableCell>{inv.customerName}</TableCell>
                                <TableCell className="text-right">₹{inv.totalAmount.toFixed(2)}</TableCell>
                                <TableCell className="text-right font-semibold text-green-600">
                                  {pInfo ? (
                                    <div className="flex flex-col items-end">
                                      <span>₹{pInfo.val.toFixed(2)}</span>
                                      <span className="text-[10px] text-muted-foreground font-normal">{pInfo.type}</span>
                                    </div>
                                  ) : 'Not tracked'}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: PROFIT SETTINGS */}
            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Product Profit Rules</CardTitle>
                  <CardDescription>
                    Define your profit margins here. For example: If Mobile Recharge of ₹1000 gives ₹30 profit, enter Reference Amount: 1000, Reference Profit: 30.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Reference Amount (₹)</TableHead>
                          <TableHead>Reference Profit (₹)</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                              No products found. Add products in the Inventory section first.
                            </TableCell>
                          </TableRow>
                        ) : (
                          products.map((product, index) => (
                            <TableRow key={product.id}>
                              <TableCell className="font-medium">{product.name}</TableCell>
                              <TableCell>₹{product.price}</TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  placeholder="e.g. 1000"
                                  value={product.profitReferenceAmount || ''}
                                  onChange={(e) => handleProductProfitChange(index, 'profitReferenceAmount', e.target.value)}
                                  className="w-32"
                                />
                              </TableCell>
                              <TableCell>
                                <Input 
                                  type="number" 
                                  placeholder="e.g. 30"
                                  value={product.profitReferenceProfit || ''}
                                  onChange={(e) => handleProductProfitChange(index, 'profitReferenceProfit', e.target.value)}
                                  className="w-32"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" onClick={() => handleSaveProductProfit(product)}>
                                  <Save className="w-4 h-4 mr-2" /> Save
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: INVOICES (Historical Data) */}
            <TabsContent value="invoices" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">All Time Profit Tracked</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">₹{totalProfit.toFixed(2)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">All Time Analyzed Revenue</CardTitle>
                    <DollarSign className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₹{totalRevenue.toFixed(2)}</div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Invoice History</CardTitle>
                  <CardDescription>Search and view profit details for specific invoices.</CardDescription>
                  <div className="mt-4 flex items-center">
                    <div className="relative flex-grow max-w-sm">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search invoices..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice No.</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Total Amount</TableHead>
                          <TableHead>Profit Status</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No invoices found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredInvoices.map((inv) => {
                            const pInfo = getDynamicProfit(inv);
                            return (
                              <TableRow key={inv.id}>
                                <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                                <TableCell>{new Date(inv.issueDate).toLocaleDateString()}</TableCell>
                                <TableCell>{inv.customerName}</TableCell>
                                <TableCell>₹{inv.totalAmount.toFixed(2)}</TableCell>
                                <TableCell>
                                  {pInfo ? (
                                    <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                      {pInfo.type} (₹{pInfo.val.toFixed(2)})
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">
                                      Not Tracked
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button asChild variant="ghost" size="sm">
                                    <Link href={`/profit/${inv.id}`}>
                                      {pInfo?.type === 'Tracked' ? 'View / Edit' : 'Calculate'} <ArrowRight className="ml-2 w-4 h-4" />
                                    </Link>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
