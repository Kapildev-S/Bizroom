

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Invoice, AppSettings } from '@/lib/mockData';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, getDocs, doc, deleteDoc, updateDoc, Timestamp, getDoc, orderBy } from 'firebase/firestore';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Eye, Printer, CreditCard, Loader2, Share2, MessageCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from '@/components/shared/EmptyState';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getCurrencySymbol } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import Image from 'next/image';

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

export function InvoiceList() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const isMobile = useIsMobile();
  const enableAdvancedInvoiceSystem = settings?.invoiceSettings?.enableAdvancedInvoiceSystem;

  const fetchInvoicesAndSettings = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const invoicesCollectionRef = collection(db, `users/${userId}/invoices`);
      const q = query(invoicesCollectionRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const fetchedInvoices = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          issueDate: (data.issueDate as Timestamp).toDate().toISOString(),
          dueDate: (data.dueDate as Timestamp).toDate().toISOString(),
        } as Invoice;
      });

      // Default secondary sort by issueDate if createdAt is same
      fetchedInvoices.sort((a, b) => {
        const dateA = a.createdAt ? (a.createdAt as any).toDate?.()?.getTime() || new Date(a.issueDate).getTime() : new Date(a.issueDate).getTime();
        const dateB = b.createdAt ? (b.createdAt as any).toDate?.()?.getTime() || new Date(b.issueDate).getTime() : new Date(b.issueDate).getTime();
        return dateB - dateA;
      });

      setInvoices(fetchedInvoices);

       const settingsDocRef = doc(db, `users/${userId}/settings`, 'appSettings');
       const settingsSnap = await getDoc(settingsDocRef);
       if (settingsSnap.exists()) {
           setSettings(settingsSnap.data() as AppSettings);
       }

    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load invoices." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        fetchInvoicesAndSettings(user.uid);
      } else {
        setLoading(false);
        setInvoices([]);
        setSettings(null);
      }
    });
    return () => unsubscribe();
  }, [fetchInvoicesAndSettings]);
  
  const handleView = (id: string) => router.push(`/invoices/${id}`);
  const handleEdit = (id: string) => router.push(`/invoices/${id}/edit`);
  const handleDeleteClick = (invoice: Invoice) => setInvoiceToDelete(invoice);

  const confirmDelete = async () => {
    if (!invoiceToDelete || !currentUser) return;
    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/invoices`, invoiceToDelete.id));
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete.id));
      toast({ title: "Invoice Deleted", description: `Invoice "${invoiceToDelete.invoiceNumber}" has been deleted.` });
    } catch (error) {
       console.error("Failed to delete invoice:", error);
       toast({ variant: "destructive", title: "Error", description: "Could not delete invoice." });
    } finally {
       setInvoiceToDelete(null);
    }
  };
  
  const handleWhatsAppReminder = (invoice: Invoice) => {
    if (!invoice.customerPhone) {
        toast({ variant: 'destructive', title: 'No Phone Number', description: 'This customer does not have a phone number saved.' });
        return;
    }
    if (!currentUser) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to send reminders.' });
        return;
    }

    const businessName = settings?.businessProfile?.businessName || 'our business';
    const message = `Hello ${invoice.customerName}, this is a friendly reminder from ${businessName} regarding invoice ${invoice.invoiceNumber} for ${getCurrencySymbol(invoice.currency)}${invoice.totalAmount.toFixed(2)}. The due date was ${new Date(invoice.dueDate).toLocaleDateString()}. Thank you.`;
    
    const whatsappUrl = `https://wa.me/${invoice.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handleUpdateStatus = async (id: string, status: Invoice['status']) => {
    if (!currentUser) return;
    try {
      const invoiceDocRef = doc(db, `users/${currentUser.uid}/invoices`, id);
      await updateDoc(invoiceDocRef, { status });
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status } : inv));
      toast({ title: "Status Updated", description: `Invoice marked as ${status}.` });
    } catch (error) {
       console.error("Failed to update status:", error);
       toast({ variant: "destructive", title: "Error", description: "Could not update status." });
    }
  };

  const filteredInvoices = invoices.filter(invoice =>
    (invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
     invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (statusFilter === 'all' || invoice.status === statusFilter) &&
    (!enableAdvancedInvoiceSystem || typeFilter === 'all' || invoice.invoiceType === typeFilter)
  );

  const totalRetailSales = invoices
    .filter(inv => inv.invoiceType === 'Retail' && inv.status !== 'void')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const totalWholesaleSales = invoices
    .filter(inv => inv.invoiceType === 'Wholesale' && inv.status !== 'void')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const totalAllSales = invoices
    .filter(inv => inv.status !== 'void')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const gstSummary = filteredInvoices
    .filter(inv => inv.status !== 'void')
    .reduce((acc, inv) => {
        const type = inv.gstType || 'CGST_SGST';
        if (type === 'CGST_SGST') {
            acc.cgst += (inv.taxAmount || 0) / 2;
            acc.sgst += (inv.taxAmount || 0) / 2;
        } else if (type === 'IGST') {
            acc.igst += (inv.taxAmount || 0);
        }
        return acc;
    }, { cgst: 0, sgst: 0, igst: 0 });


  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading invoices...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <EmptyState title="Please Log In" description="Log in to manage your invoices.">
      <Image 
        src="https://placehold.co/300x240.png"
        width={300}
        height={240}
        alt="Login illustration"
        data-ai-hint="authentication security"
      />
    </EmptyState>;
  }
  
  if (invoices.length === 0 && searchTerm === '' && statusFilter === 'all') {
    return (
      <EmptyState
        title="No Invoices Yet"
        description="Create your first invoice to start billing your customers."
        actionText="Create New Invoice"
        actionLink="/invoices/new"
      >
        <Image 
          src="https://placehold.co/300x240.png"
          width={300}
          height={240}
          alt="Empty invoices list illustration"
          data-ai-hint="invoices empty"
        />
      </EmptyState>
    );
  }

  const renderActions = (invoice: Invoice) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleView(invoice.id)}><Eye className="mr-2 h-4 w-4" /> View / Share</DropdownMenuItem>
         {(invoice.status === 'draft' || invoice.status === 'sent') && (
          <DropdownMenuItem onClick={() => handleEdit(invoice.id)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
         {invoice.status !== 'paid' && invoice.status !== 'void' && (
            <DropdownMenuItem onClick={() => handleUpdateStatus(invoice.id, 'paid')}><CreditCard className="mr-2 h-4 w-4" /> Mark as Paid</DropdownMenuItem>
        )}
        {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <DropdownMenuItem onClick={() => handleWhatsAppReminder(invoice)}><MessageCircle className="mr-2 h-4 w-4" /> Remind on WhatsApp</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleDeleteClick(invoice)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="space-y-4">
        {enableAdvancedInvoiceSystem && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Sales (All)</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold text-primary">{getCurrencySymbol(settings?.invoiceSettings?.currency || 'INR')}{totalAllSales.toFixed(2)}</div>
                </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Retail Sales</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold text-primary">{getCurrencySymbol(settings?.invoiceSettings?.currency || 'INR')}{totalRetailSales.toFixed(2)}</div>
                </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Wholesale Sales</CardTitle>
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold text-primary">{getCurrencySymbol(settings?.invoiceSettings?.currency || 'INR')}{totalWholesaleSales.toFixed(2)}</div>
                </CardContent>
            </Card>
            <Card className="bg-indigo-50 border-indigo-200 md:col-span-3">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold text-indigo-700 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                        GST Tax Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground font-semibold">TOTAL CGST</p>
                            <p className="text-lg font-bold text-indigo-900">{getCurrencySymbol(settings?.invoiceSettings?.currency || 'INR')}{gstSummary.cgst.toFixed(2)}</p>
                        </div>
                        <div className="space-y-1 border-x px-4 border-indigo-100">
                            <p className="text-[10px] text-muted-foreground font-semibold">TOTAL SGST</p>
                            <p className="text-lg font-bold text-indigo-900">{getCurrencySymbol(settings?.invoiceSettings?.currency || 'INR')}{gstSummary.sgst.toFixed(2)}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-[10px] text-muted-foreground font-semibold">TOTAL IGST</p>
                            <p className="text-lg font-bold text-indigo-900">{getCurrencySymbol(settings?.invoiceSettings?.currency || 'INR')}{gstSummary.igst.toFixed(2)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {enableAdvancedInvoiceSystem ? (
            <div className="flex bg-muted p-1 rounded-lg">
                <Button 
                variant={typeFilter === 'all' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setTypeFilter('all')}
                className={typeFilter === 'all' ? 'bg-background shadow-sm' : ''}
                >
                All
                </Button>
                <Button 
                variant={typeFilter === 'Retail' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setTypeFilter('Retail')}
                className={typeFilter === 'Retail' ? 'bg-background shadow-sm' : ''}
                >
                Retail
                </Button>
                <Button 
                variant={typeFilter === 'Wholesale' ? 'secondary' : 'ghost'} 
                size="sm" 
                onClick={() => setTypeFilter('Wholesale')}
                className={typeFilter === 'Wholesale' ? 'bg-background shadow-sm' : ''}
                >
                Wholesale
                </Button>
            </div>
          ) : (
             <div />
          )}
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Input
              placeholder="Search invoices..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
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
        </div>

        {filteredInvoices.length > 0 ? (
          isMobile ? (
            <div className="space-y-4">
              {filteredInvoices.map(invoice => (
                <Card key={invoice.id} onClick={() => handleView(invoice.id)} className="cursor-pointer">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div>
                      <CardTitle className="text-sm font-medium text-primary">{invoice.invoiceNumber}</CardTitle>
                      <p className="text-sm text-muted-foreground">{invoice.customerName}</p>
                    </div>
                     <Badge variant={getStatusBadgeVariant(invoice.status)} className="capitalize">{invoice.status}</Badge>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                     <div className="text-lg font-bold">{getCurrencySymbol(invoice.currency)}{invoice.totalAmount.toFixed(2)}</div>
                     <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                      {renderActions(invoice)}
                     </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden shadow-sm bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    {enableAdvancedInvoiceSystem && <TableHead>Type</TableHead>}
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="cursor-pointer" onClick={() => handleView(invoice.id)}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.customerName}</TableCell>
                      <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                      {enableAdvancedInvoiceSystem && (
                        <TableCell>
                            <Badge variant="outline" className="font-normal">{invoice.invoiceType}</Badge>
                        </TableCell>
                      )}
                      <TableCell>{getCurrencySymbol(invoice.currency)}{invoice.totalAmount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(invoice.status)} className="capitalize">{invoice.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {renderActions(invoice)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No invoices found matching your criteria.</p>
          </div>
        )}
      </div>

      <AlertDialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the invoice "{invoiceToDelete?.invoiceNumber}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
    </>
  );
}
