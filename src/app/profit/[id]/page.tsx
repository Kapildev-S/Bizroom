"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import type { Invoice } from '@/lib/mockData';
import type { InvoiceProfit, InvoiceProfitItem } from '@/lib/types/profit';
import { getInvoiceProfit, saveInvoiceProfit } from '@/lib/firebase/profitActions';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';

export default function ProfitEntryPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [profitItems, setProfitItems] = useState<InvoiceProfitItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await loadData(currentUser.uid, params.id);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [params.id]);

  const loadData = async (userId: string, invoiceId: string) => {
    setLoading(true);
    try {
      // Fetch invoice
      const invoiceRef = doc(db, `users/${userId}/invoices`, invoiceId);
      const invoiceSnap = await getDoc(invoiceRef);
      
      if (!invoiceSnap.exists()) {
        toast({ title: "Error", description: "Invoice not found", variant: "destructive" });
        router.push('/profit');
        return;
      }
      
      const invData = invoiceSnap.data() as Invoice;
      setInvoice({ ...invData, id: invoiceId });

      // Fetch existing profit
      const existingProfit = await getInvoiceProfit(userId, invoiceId);
      
      if (existingProfit && existingProfit.items.length > 0) {
        setProfitItems(existingProfit.items);
      } else {
        // Initialize empty profit items based on invoice items
        const initialItems: InvoiceProfitItem[] = invData.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          costPrice: 0,
          profit: item.unitPrice * item.quantity // default profit assumes cost is 0
        }));
        setProfitItems(initialItems);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Error", description: "Failed to load invoice data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCostChange = (index: number, value: string) => {
    const cost = parseFloat(value) || 0;
    const newItems = [...profitItems];
    const item = newItems[index];
    
    item.costPrice = cost;
    item.profit = (item.unitPrice - item.costPrice) * item.quantity;
    
    setProfitItems(newItems);
  };

  const handleSave = async () => {
    if (!user || !invoice) return;
    setSaving(true);
    
    try {
      const totalCost = profitItems.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
      const totalProfit = profitItems.reduce((sum, item) => sum + item.profit, 0);

      const profitData: InvoiceProfit = {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate,
        customerName: invoice.customerName,
        totalInvoiceAmount: invoice.totalAmount,
        items: profitItems,
        totalCost,
        totalProfit,
        updatedAt: new Date().toISOString()
      };

      await saveInvoiceProfit(user.uid, profitData);
      
      toast({ title: "Success", description: "Profit tracked successfully!" });
      router.push('/profit');
    } catch (error) {
      console.error("Error saving profit:", error);
      toast({ title: "Error", description: "Failed to save profit data", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout pageTitle="Profit Calculation">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!invoice) return null;

  const totalCost = profitItems.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);
  const totalProfit = profitItems.reduce((sum, item) => sum + item.profit, 0);
  const profitMargin = invoice.totalAmount > 0 ? ((totalProfit / invoice.totalAmount) * 100).toFixed(1) : 0;

  return (
    <AuthenticatedLayout pageTitle={`Profit Calculation - ${invoice.invoiceNumber}`}>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/profit">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Invoice {invoice.invoiceNumber}</h2>
            <p className="text-muted-foreground">Customer: {invoice.customerName} | Date: {new Date(invoice.issueDate).toLocaleDateString()}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Item Costs</CardTitle>
            <CardDescription>Enter the purchase cost for each item to calculate profit.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Selling Price (per unit)</TableHead>
                    <TableHead>Cost Price (per unit)</TableHead>
                    <TableHead className="text-right">Total Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>₹{item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          className="w-32"
                          value={item.costPrice || ''}
                          onChange={(e) => handleCostChange(index, e.target.value)}
                          placeholder="Cost"
                        />
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        ₹{item.profit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Revenue: <span className="font-semibold text-foreground">₹{invoice.totalAmount.toFixed(2)}</span></p>
              <p className="text-sm text-muted-foreground">Total Cost: <span className="font-semibold text-foreground">₹{totalCost.toFixed(2)}</span></p>
            </div>
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Net Profit ({profitMargin}%)</p>
                <p className="text-2xl font-bold text-green-600">₹{totalProfit.toFixed(2)}</p>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Profit Data
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}
