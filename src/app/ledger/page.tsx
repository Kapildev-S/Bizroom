
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CalendarIcon, Loader2, PlusCircle, MoreHorizontal, Edit, Trash2, ArrowDownCircle, ArrowUpCircle, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { format, startOfDay, endOfDay, addDays, startOfMonth, endOfMonth } from "date-fns";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs, doc, addDoc, updateDoc, deleteDoc, Timestamp, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Types
type LedgerEntry = {
  id: string;
  amount: number;
  type: 'in' | 'out';
  purpose: string;
  notes?: string;
  date: Timestamp;
};

// Zod Schema for the form
const transactionFormSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be greater than 0." }),
  type: z.enum(['in', 'out'], { required_error: "Transaction type is required." }),
  purpose: z.string().min(2, { message: "Purpose must be at least 2 characters." }),
  notes: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

// Transaction Form Component
function TransactionForm({ onSave, transaction, onOpenChange }: { onSave: (data: TransactionFormValues) => void, transaction: Omit<LedgerEntry, 'date'> | null, onOpenChange: (open: boolean) => void }) {
    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionFormSchema),
        defaultValues: transaction ? {
            ...transaction,
            amount: transaction.amount || 0,
            type: transaction.type || 'out',
            purpose: transaction.purpose || '',
            notes: transaction.notes || '',
        } : { amount: 0, type: 'out', purpose: '', notes: '' },
    });
    
    return (
         <DialogContent>
            <DialogHeader>
                <DialogTitle>{transaction ? 'Edit Transaction' : 'Add New Transaction'}</DialogTitle>
                <DialogDescription>
                    {transaction ? 'Update the details for this transaction.' : 'Record a new cash-in or cash-out transaction.'}
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 py-4">
                    <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Transaction Type</FormLabel>
                            <FormControl>
                               <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl><RadioGroupItem value="in" /></FormControl>
                                        <FormLabel className="font-normal">Cash In</FormLabel>
                                    </FormItem>
                                     <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl><RadioGroupItem value="out" /></FormControl>
                                        <FormLabel className="font-normal">Cash Out</FormLabel>
                                    </FormItem>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                     <FormField control={form.control} name="amount" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Amount</FormLabel>
                            <FormControl><Input type="number" placeholder="e.g. 500" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="purpose" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Purpose</FormLabel>
                            <FormControl><Input placeholder="e.g. Sales, Purchase, Expense" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                     <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Notes (Optional)</FormLabel>
                            <FormControl><Textarea placeholder="Add any relevant notes here." {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Save Transaction</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    );
}

// Monthly Report Component
function MonthlyLedgerReport({ currentUser, currencySymbol }: { currentUser: User | null, currencySymbol: string }) {
  const [date, setDate] = useState(new Date());
  const [reportData, setReportData] = useState<{ purpose: string; totalIn: number; totalOut: number; }[]>([]);
  const [monthlyTotals, setMonthlyTotals] = useState({ totalIn: 0, totalOut: 0 });
  const [loadingReport, setLoadingReport] = useState(false);
  const { toast } = useToast();

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const fetchReportData = useCallback(async (selectedDate: Date) => {
    if (!currentUser) return;
    setLoadingReport(true);

    const startDate = startOfMonth(selectedDate);
    const endDate = endOfMonth(selectedDate);

    try {
      const q = query(
        collection(db, `users/${currentUser.uid}/ledgerEntries`),
        where("date", ">=", Timestamp.fromDate(startDate)),
        where("date", "<=", Timestamp.fromDate(endDate))
      );
      const querySnapshot = await getDocs(q);
      
      const transactionsByPurpose: { [purpose: string]: { totalIn: number; totalOut: number; } } = {};
      let totalIn = 0;
      let totalOut = 0;
      
      querySnapshot.forEach(doc => {
          const entry = doc.data() as Omit<LedgerEntry, 'id'>;
          if (!transactionsByPurpose[entry.purpose]) {
              transactionsByPurpose[entry.purpose] = { totalIn: 0, totalOut: 0 };
          }
          if (entry.type === 'in') {
            transactionsByPurpose[entry.purpose].totalIn += entry.amount;
            totalIn += entry.amount;
          } else {
            transactionsByPurpose[entry.purpose].totalOut += entry.amount;
            totalOut += entry.amount;
          }
      });
      
      const newReportData = Object.entries(transactionsByPurpose)
          .map(([purpose, data]) => ({ purpose, ...data }))
          .sort((a, b) => (b.totalIn + b.totalOut) - (a.totalIn + a.totalOut)); // Sort by total activity

      setReportData(newReportData);
      setMonthlyTotals({ totalIn, totalOut });

    } catch (error) {
      console.error("Error fetching monthly report data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load monthly report.' });
    } finally {
      setLoadingReport(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchReportData(date);
  }, [date, fetchReportData]);

  const handleMonthChange = (monthValue: string) => {
    const newDate = new Date(date);
    newDate.setMonth(parseInt(monthValue, 10));
    setDate(newDate);
  };
  
  const handleYearChange = (yearValue: string) => {
    const newDate = new Date(date);
    newDate.setFullYear(parseInt(yearValue, 10));
    setDate(newDate);
  };
  
  const netBalance = monthlyTotals.totalIn - monthlyTotals.totalOut;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Ledger Report</CardTitle>
        <CardDescription>An overview of cash flow, summarized by purpose for the selected month.</CardDescription>
        <div className="flex items-center gap-2 pt-4">
            <Select value={date.getMonth().toString()} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select Month" /></SelectTrigger>
                <SelectContent>{months.map(month => <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={date.getFullYear().toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Select Year" /></SelectTrigger>
                <SelectContent>{years.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}</SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-green-600">Total Cash In</CardTitle><ArrowDownCircle className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{currencySymbol}{monthlyTotals.totalIn.toLocaleString()}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-red-600">Total Cash Out</CardTitle><ArrowUpCircle className="h-4 w-4 text-red-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{currencySymbol}{monthlyTotals.totalOut.toLocaleString()}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Month's Balance</CardTitle><Wallet className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-primary' : 'text-destructive'}`}>{currencySymbol}{netBalance.toLocaleString()}</div></CardContent></Card>
        </div>

        {loadingReport ? (
             <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : reportData.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No transactions found for this month.</p>
        ) : (
            <div className="rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader><TableRow><TableHead>Purpose</TableHead><TableHead className="text-right">Total In</TableHead><TableHead className="text-right">Total Out</TableHead></TableRow></TableHeader>
                    <TableBody>
                    {reportData.map(item => (
                        <TableRow key={item.purpose}>
                            <TableCell className="font-medium">{item.purpose}</TableCell>
                            <TableCell className="text-right text-green-600">{currencySymbol}{item.totalIn.toLocaleString()}</TableCell>
                            <TableCell className="text-right text-red-600">{currencySymbol}{item.totalOut.toLocaleString()}</TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            </div>
        )}
      </CardContent>
    </Card>
  );
}


// Daily Ledger Component
function DailyLedgerComponent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date>(new Date());
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const isMobile = useIsMobile();
  const currencySymbol = getCurrencySymbol('INR'); // Or fetch from settings
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Omit<LedgerEntry, 'date'> | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<LedgerEntry | null>(null);
  const [purposeFilter, setPurposeFilter] = useState('all');

  const fetchTransactions = useCallback(async (userId: string, dateToFetch: Date) => {
    setLoading(true);
    const dayStart = startOfDay(dateToFetch);
    const dayEnd = endOfDay(dateToFetch);

    try {
        const q = query(
            collection(db, `users/${userId}/ledgerEntries`),
            where("date", ">=", Timestamp.fromDate(dayStart)),
            where("date", "<=", Timestamp.fromDate(dayEnd)),
            orderBy("date", "desc")
        );
        const querySnapshot = await getDocs(q);
        const fetchedTransactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LedgerEntry));
        setTransactions(fetchedTransactions);
    } catch (error) {
        console.error("Failed to fetch transactions:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load ledger entries.' });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        if (user) {
            fetchTransactions(user.uid, date);
        } else {
            setTransactions([]);
            setLoading(false);
        }
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if(currentUser) {
        fetchTransactions(currentUser.uid, date);
    }
  }, [date, currentUser, fetchTransactions])
  
  const dailySummary = useMemo(() => {
    const cashIn = transactions.filter(t => t.type === 'in').reduce((sum, t) => sum + t.amount, 0);
    const cashOut = transactions.filter(t => t.type === 'out').reduce((sum, t) => sum + t.amount, 0);
    const balance = cashIn - cashOut;
    return { cashIn, cashOut, balance };
  }, [transactions]);
  
  const uniquePurposes = useMemo(() => {
    return ['all', ...new Set(transactions.map(t => t.purpose))];
  }, [transactions]);
  
  const filteredTransactions = useMemo(() => {
      if (purposeFilter === 'all') return transactions;
      return transactions.filter(t => t.purpose === purposeFilter);
  }, [transactions, purposeFilter]);


  const handleSaveTransaction = async (data: TransactionFormValues) => {
    if (!currentUser) return;
    
    const transactionData = {
        ...data,
        date: Timestamp.fromDate(date), // Use selected date for the transaction
    };

    try {
      if (editingTransaction) {
        const transactionDocRef = doc(db, `users/${currentUser.uid}/ledgerEntries`, editingTransaction.id);
        await updateDoc(transactionDocRef, data);
        toast({ title: "Transaction Updated", description: "The transaction has been updated." });
      } else {
        const collectionRef = collection(db, `users/${currentUser.uid}/ledgerEntries`);
        await addDoc(collectionRef, transactionData);
        toast({ title: "Transaction Added", description: "The transaction has been recorded." });
      }
      fetchTransactions(currentUser.uid, date); // Refresh list
      setIsFormOpen(false);
      setEditingTransaction(null);
    } catch (error) {
        console.error("Error saving transaction:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save the transaction." });
    }
  };
  
  const confirmDelete = async () => {
    if (!deletingTransaction || !currentUser) return;
    try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/ledgerEntries`, deletingTransaction.id));
        toast({ title: "Transaction Deleted", description: `The transaction has been removed.` });
        fetchTransactions(currentUser.uid, date); // Refresh list
        setDeletingTransaction(null);
    } catch (error) {
        console.error("Error deleting transaction:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not delete transaction." });
    }
  };

  const handleAddNewTransaction = () => {
    setEditingTransaction(null);
    setIsFormOpen(true);
  };
  
  const handleEditTransaction = (transaction: LedgerEntry) => {
    const { date, ...editablePart } = transaction;
    setEditingTransaction(editablePart);
    setIsFormOpen(true);
  };

  const handlePreviousDay = () => setDate(prevDate => addDays(prevDate, -1));
  const handleNextDay = () => setDate(prevDate => addDays(prevDate, 1));
  
  const renderActions = (transaction: LedgerEntry) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditTransaction(transaction)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeletingTransaction(transaction)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <TransactionForm onSave={handleSaveTransaction} transaction={editingTransaction} onOpenChange={setIsFormOpen} />
      </Dialog>
      <AlertDialog open={!!deletingTransaction} onOpenChange={() => setDeletingTransaction(null)}>
            <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this transaction. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily View</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
        </TabsList>
        <TabsContent value="daily">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                        <CardTitle>Daily Transactions</CardTitle>
                        <CardDescription>Record all your cash-in and cash-out transactions for the selected day.</CardDescription>
                        </div>
                        <Button onClick={handleAddNewTransaction} className="w-full sm:w-auto">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                        <Button variant="outline" size="icon" onClick={handlePreviousDay} aria-label="Previous day"><ChevronLeft className="h-4 w-4" /></Button>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("flex-1 sm:w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />{date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={(d) => setDate(d || new Date())} initialFocus /></PopoverContent>
                        </Popover>
                        <Button variant="outline" size="icon" onClick={handleNextDay} aria-label="Next day"><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-green-600">Total Cash In</CardTitle><ArrowDownCircle className="h-4 w-4 text-green-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{currencySymbol}{dailySummary.cashIn.toLocaleString()}</div></CardContent></Card>
                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium text-red-600">Total Cash Out</CardTitle><ArrowUpCircle className="h-4 w-4 text-red-600" /></CardHeader><CardContent><div className="text-2xl font-bold">{currencySymbol}{dailySummary.cashOut.toLocaleString()}</div></CardContent></Card>
                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Day's Balance</CardTitle><Wallet className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className={`text-2xl font-bold ${dailySummary.balance >= 0 ? 'text-primary' : 'text-destructive'}`}>{currencySymbol}{dailySummary.balance.toLocaleString()}</div></CardContent></Card>
                    </div>

                    <div className="flex justify-end">
                        <Select value={purposeFilter} onValueChange={setPurposeFilter}>
                            <SelectTrigger className="w-full sm:w-[240px]"><SelectValue placeholder="Filter by purpose..." /></SelectTrigger>
                            <SelectContent>{uniquePurposes.map(p => <SelectItem key={p} value={p}>{p === 'all' ? 'All Purposes' : p}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>

                    {loading ? (
                        <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                    ) : filteredTransactions.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No transactions recorded for this day. Add a new one to begin.</p>
                    ) : isMobile ? (
                        <div className="space-y-4">
                            {filteredTransactions.map(t => (
                                <Card key={t.id} className={cn('border-l-4', t.type === 'in' ? 'border-green-500' : 'border-red-500')}>
                                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                                        <div>
                                            <CardTitle className="text-base">{t.purpose}</CardTitle>
                                            <CardDescription className="text-sm font-bold">{currencySymbol}{t.amount.toLocaleString()}</CardDescription>
                                        </div>
                                        {renderActions(t)}
                                    </CardHeader>
                                    {t.notes && <CardContent className="pt-0 pb-2"><p className="text-xs text-muted-foreground">{t.notes}</p></CardContent>}
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Purpose</TableHead><TableHead>Notes</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                {filteredTransactions.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell><Badge variant={t.type === 'in' ? 'default' : 'destructive'} className={cn('capitalize', t.type === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}>{t.type === 'in' ? 'Cash In' : 'Cash Out'}</Badge></TableCell>
                                        <TableCell className="font-medium">{t.purpose}</TableCell>
                                        <TableCell className="text-muted-foreground">{t.notes || '-'}</TableCell>
                                        <TableCell className="text-right font-bold">{currencySymbol}{t.amount.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{renderActions(t)}</TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="monthly">
            <MonthlyLedgerReport currentUser={currentUser} currencySymbol={currencySymbol} />
        </TabsContent>
      </Tabs>
    </>
  );
}


export default function DailyLedgerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Ledger"
        description="Track your daily cash flow with ease."
      />
      <DailyLedgerComponent />
    </div>
  );
}
