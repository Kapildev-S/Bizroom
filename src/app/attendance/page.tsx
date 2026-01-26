
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
import { CalendarIcon, Loader2, Users, Wallet, ChevronLeft, ChevronRight, PlusCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { format, addDays, getDaysInMonth, startOfMonth, endOfMonth } from "date-fns";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, addDoc, updateDoc, deleteDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

type Staff = { id: string; name: string; role: string; };
type AttendanceStatus = 'present' | 'absent' | 'unmarked';
type AttendanceRecord = { status: AttendanceStatus; expense: number };

const staffFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  role: z.string().min(2, { message: "Role is required." }),
});

type StaffFormValues = z.infer<typeof staffFormSchema>;


function StaffForm({ onSave, staff, onOpenChange }: { onSave: (data: StaffFormValues) => void, staff: Staff | null, onOpenChange: (open: boolean) => void }) {
    const form = useForm<StaffFormValues>({
        resolver: zodResolver(staffFormSchema),
        defaultValues: staff || { name: "", role: "" },
    });
    
    return (
         <DialogContent>
            <DialogHeader>
                <DialogTitle>{staff ? 'Edit Staff Member' : 'Add New Staff Member'}</DialogTitle>
                <DialogDescription>
                    {staff ? `Update the details for ${staff.name}.` : 'Enter the details for the new staff member.'}
                </DialogDescription>
            </DialogHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 py-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Staff Name</FormLabel>
                            <FormControl><Input placeholder="e.g. John Doe" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="role" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Role</FormLabel>
                            <FormControl><Input placeholder="e.g. Chef, Waiter" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </Form>
        </DialogContent>
    );
}

function MonthlyReport({ staffMembers, currencySymbol, currentUser }: { staffMembers: Staff[], currencySymbol: string, currentUser: User | null }) {
  const [date, setDate] = useState(new Date());
  const [reportData, setReportData] = useState<any[]>([]);
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
        collection(db, `users/${currentUser.uid}/attendanceRecords`),
        where("date", ">=", Timestamp.fromDate(startDate)),
        where("date", "<=", Timestamp.fromDate(endDate))
      );
      const querySnapshot = await getDocs(q);
      
      const monthlyData: { [staffId: string]: { presentDays: number; absentDays: number; totalExpenses: number; } } = {};
      
      querySnapshot.forEach(doc => {
          const record = doc.data();
          if (!monthlyData[record.staffId]) {
              monthlyData[record.staffId] = { presentDays: 0, absentDays: 0, totalExpenses: 0 };
          }
          if (record.status === 'present') monthlyData[record.staffId].presentDays++;
          if (record.status === 'absent') monthlyData[record.staffId].absentDays++;
          monthlyData[record.staffId].totalExpenses += record.expense || 0;
      });

      const daysInMonth = getDaysInMonth(selectedDate);
      const newReportData = staffMembers.map(staff => {
        const data = monthlyData[staff.id] || { presentDays: 0, absentDays: 0, totalExpenses: 0 };
        return { ...staff, ...data };
      });
      setReportData(newReportData);

    } catch (error) {
      console.error("Error fetching monthly report data:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to load monthly report.' });
    } finally {
      setLoadingReport(false);
    }
  }, [currentUser, staffMembers, toast]);


  useEffect(() => {
    if (staffMembers.length > 0) {
      fetchReportData(date);
    }
  }, [date, staffMembers, fetchReportData]);
  
  const monthlySummary = useMemo(() => {
    const totalStaffExpenses = reportData.reduce((sum, staff) => sum + staff.totalExpenses, 0);
    const totalWorkingDays = reportData.reduce((sum, staff) => sum + staff.presentDays, 0);
    return { totalStaffExpenses, totalWorkingDays };
  }, [reportData]);


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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Staff Report</CardTitle>
        <CardDescription>An overview of staff attendance and expenses for the selected month.</CardDescription>
        <div className="flex items-center gap-2 pt-4">
          <Select value={date.getMonth().toString()} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Month" />
            </SelectTrigger>
            <SelectContent>
              {months.map(month => <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={date.getFullYear().toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Select Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Man-Days</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{monthlySummary.totalWorkingDays}</div><p className="text-xs text-muted-foreground">Total present days across all staff</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Monthly Expense</CardTitle><Wallet className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{currencySymbol}{monthlySummary.totalStaffExpenses.toLocaleString()}</div><p className="text-xs text-muted-foreground">Sum of all daily expenses</p></CardContent></Card>
        </div>
        
        {loadingReport ? (
             <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
            <div className="rounded-lg border overflow-hidden">
                <Table>
                    <TableHeader><TableRow><TableHead>Staff Member</TableHead><TableHead className="text-center">Present</TableHead><TableHead className="text-center">Absent</TableHead><TableHead className="text-right">Total Expense</TableHead></TableRow></TableHeader>
                    <TableBody>
                    {reportData.map(staff => (
                        <TableRow key={staff.id}>
                            <TableCell className="font-medium"><div>{staff.name}</div><div className="text-xs text-muted-foreground">{staff.role}</div></TableCell>
                            <TableCell className="text-center">{staff.presentDays}</TableCell>
                            <TableCell className="text-center">{staff.absentDays}</TableCell>
                            <TableCell className="text-right">{currencySymbol}{staff.totalExpenses.toLocaleString()}</TableCell>
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

function StaffManagementComponent() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date>(new Date());
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [isSaving, setIsSaving] = useState(false);
  const isMobile = useIsMobile();
  const currencySymbol = getCurrencySymbol('INR');
  const { toast } = useToast();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<Staff | null>(null);

  const fetchStaff = useCallback(async (userId: string) => {
      try {
          const staffCollectionRef = collection(db, `users/${userId}/staff`);
          const staffSnapshot = await getDocs(query(staffCollectionRef));
          const fetchedStaff = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Staff));
          setStaffMembers(fetchedStaff);
          return fetchedStaff;
      } catch (error) {
          console.error("Failed to fetch staff:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load staff members.' });
          return [];
      }
  }, [toast]);
  
  const fetchAttendanceForDate = useCallback(async (dateToFetch: Date, currentStaff: Staff[]) => {
      if (!currentUser || currentStaff.length === 0) {
        setAttendance({});
        return;
      }

      // Initialize with default values
      const defaultAttendance: Record<string, AttendanceRecord> = currentStaff.reduce((acc, staff) => {
        acc[staff.id] = { status: 'unmarked', expense: 0 };
        return acc;
      }, {} as Record<string, AttendanceRecord>);

      try {
          const q = query(
              collection(db, `users/${currentUser.uid}/attendanceRecords`),
              where("date", "==", Timestamp.fromDate(dateToFetch))
          );
          const querySnapshot = await getDocs(q);

          querySnapshot.forEach(doc => {
              const record = doc.data();
              if (defaultAttendance[record.staffId]) {
                  defaultAttendance[record.staffId] = { status: record.status, expense: record.expense };
              }
          });
          setAttendance(defaultAttendance);
      } catch (error) {
          console.error("Error fetching attendance data:", error);
          toast({ variant: "destructive", title: "Error", description: "Failed to load attendance for this date." });
          setAttendance(defaultAttendance);
      }
  }, [currentUser, toast]);


  useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
          setCurrentUser(user);
          if (user) {
              const staff = await fetchStaff(user.uid);
              await fetchAttendanceForDate(date, staff);
          } else {
              setStaffMembers([]);
              setAttendance({});
          }
          setLoading(false);
      });
      return () => unsubscribe();
  }, [fetchStaff, fetchAttendanceForDate]);

  useEffect(() => {
    if (currentUser && staffMembers.length > 0) {
        fetchAttendanceForDate(date, staffMembers);
    }
  }, [date, currentUser, staffMembers, fetchAttendanceForDate]);


  const handleStatusChange = (staffId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [staffId]: { ...prev[staffId], status } }));
  };

  const handleExpenseChange = (staffId: string, expenseValue: string) => {
    const expense = Number(expenseValue);
    if (!isNaN(expense) && expense >= 0) {
      setAttendance(prev => ({ ...prev, [staffId]: { ...prev[staffId], expense } }));
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setIsSaving(true);
    
    const batch = writeBatch(db);
    const dateString = format(date, 'yyyy-MM-dd');

    Object.entries(attendance).forEach(([staffId, record]) => {
        if(record.status !== 'unmarked' || record.expense > 0) {
            const docId = `${staffId}_${dateString}`;
            const docRef = doc(db, `users/${currentUser.uid}/attendanceRecords`, docId);
            batch.set(docRef, {
                staffId,
                date: Timestamp.fromDate(date),
                status: record.status,
                expense: record.expense
            });
        }
    });

    try {
        await batch.commit();
        toast({ title: "Success", description: "Attendance and expenses saved successfully!" });
    } catch (error) {
        console.error("Error saving attendance data:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save data. Please try again." });
    } finally {
        setIsSaving(false);
    }
  };
  
  const summary = useMemo(() => {
    const records = Object.values(attendance);
    const presentCount = records.filter(r => r.status === 'present').length;
    const totalExpenses = records.reduce((sum, r) => sum + r.expense, 0);
    return { presentCount, totalExpenses };
  }, [attendance]);

  const handlePreviousDay = () => setDate(prevDate => addDays(prevDate, -1));
  const handleNextDay = () => setDate(prevDate => addDays(prevDate, 1));
  
  const handleAddNewStaff = () => {
    setEditingStaff(null);
    setIsFormOpen(true);
  };

  const handleEditStaff = (staff: Staff) => {
    setEditingStaff(staff);
    setIsFormOpen(true);
  };
  
  const handleSaveStaff = async (data: StaffFormValues) => {
    if (!currentUser) return;
    
    try {
      if (editingStaff) {
        const staffDocRef = doc(db, `users/${currentUser.uid}/staff`, editingStaff.id);
        await updateDoc(staffDocRef, data);
        toast({ title: "Staff Updated", description: "Staff member details have been updated." });
      } else {
        const staffCollectionRef = collection(db, `users/${currentUser.uid}/staff`);
        await addDoc(staffCollectionRef, data);
        toast({ title: "Staff Added", description: "New staff member has been added." });
      }
      fetchStaff(currentUser.uid); // Refresh staff list
      setIsFormOpen(false);
    } catch (error) {
        console.error("Error saving staff:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not save staff member." });
    }
  };
  
  const confirmDelete = async () => {
    if (!deletingStaff || !currentUser) return;
    try {
        await deleteDoc(doc(db, `users/${currentUser.uid}/staff`, deletingStaff.id));
        toast({ title: "Staff Deleted", description: `${deletingStaff.name} has been removed.` });
        fetchStaff(currentUser.uid); // Refresh staff list
        setDeletingStaff(null);
    } catch (error) {
        console.error("Error deleting staff:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not delete staff member." });
    }
  };

  const renderStaffActions = (staff: Staff) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEditStaff(staff)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeletingStaff(staff)} className="text-destructive focus:text-destructive focus:bg-destructive/10"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading staff data...</p>
      </div>
    );
  }

  return (
    <>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <StaffForm onSave={handleSaveStaff} staff={editingStaff} onOpenChange={setIsFormOpen} />
        </Dialog>
        <AlertDialog open={!!deletingStaff} onOpenChange={() => setDeletingStaff(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This will permanently delete {deletingStaff?.name}. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <Tabs defaultValue="daily" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <TabsList>
                    <TabsTrigger value="daily">Daily View</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
                </TabsList>
                <Button onClick={handleAddNewStaff} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Staff
                </Button>
            </div>
            
            <TabsContent value="daily">
                <Card>
                <CardHeader>
                    <div>
                        <CardTitle>Daily Attendance & Expenses</CardTitle>
                        <CardDescription>Mark attendance and log daily expenses for your staff.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                        <Button variant="outline" size="icon" onClick={handlePreviousDay} aria-label="Previous day"><ChevronLeft className="h-4 w-4" /></Button>
                        <Popover>
                            <PopoverTrigger asChild>
                            <Button variant={"outline"} className={cn("flex-1 sm:w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, "PPP") : <span>Pick a date</span>}
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={(d) => setDate(d || new Date())} initialFocus /></PopoverContent>
                        </Popover>
                        <Button variant="outline" size="icon" onClick={handleNextDay} aria-label="Next day"><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Present Staff</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{summary.presentCount} / {staffMembers.length}</div></CardContent></Card>
                        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Expenses</CardTitle><Wallet className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{currencySymbol}{summary.totalExpenses.toLocaleString()}</div></CardContent></Card>
                    </div>

                    {staffMembers.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No staff members found. Add a new staff member to begin.</p>
                    ) : isMobile ? (
                        <div className="space-y-4">
                            {staffMembers.map(staff => (
                                <Card key={staff.id}>
                                    <CardHeader className="flex flex-row items-start justify-between pb-4">
                                        <div>
                                        <CardTitle className="text-base">{staff.name}</CardTitle>
                                        <CardDescription>{staff.role}</CardDescription>
                                        </div>
                                        {renderStaffActions(staff)}
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div>
                                            <Label className="text-sm font-medium">Attendance</Label>
                                            <RadioGroup value={attendance[staff.id]?.status || 'unmarked'} onValueChange={(value: AttendanceStatus) => handleStatusChange(staff.id, value)} className="flex gap-4 pt-2">
                                                <div className="flex items-center space-x-2"><RadioGroupItem value="present" id={`present-mob-${staff.id}`} /><Label htmlFor={`present-mob-${staff.id}`}>Present</Label></div>
                                                <div className="flex items-center space-x-2"><RadioGroupItem value="absent" id={`absent-mob-${staff.id}`} /><Label htmlFor={`absent-mob-${staff.id}`}>Absent</Label></div>
                                            </RadioGroup>
                                        </div>
                                        <div>
                                            <Label htmlFor={`expense-mob-${staff.id}`} className="text-sm font-medium">Daily Expense</Label>
                                            <div className="relative mt-2">
                                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">{currencySymbol}</span>
                                                <Input id={`expense-mob-${staff.id}`} type="number" value={attendance[staff.id]?.expense || ''} onChange={(e) => handleExpenseChange(staff.id, e.target.value)} placeholder="0" className="pl-7"/>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader><TableRow><TableHead>Staff Member</TableHead><TableHead>Status</TableHead><TableHead className="w-[150px]">Expense</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                                <TableBody>
                                {staffMembers.map(staff => (
                                    <TableRow key={staff.id}>
                                        <TableCell className="font-medium"><div>{staff.name}</div><div className="text-xs text-muted-foreground">{staff.role}</div></TableCell>
                                        <TableCell><RadioGroup value={attendance[staff.id]?.status || 'unmarked'} onValueChange={(value: AttendanceStatus) => handleStatusChange(staff.id, value)} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="present" id={`present-${staff.id}`} /><Label htmlFor={`present-${staff.id}`}>Present</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="absent" id={`absent-${staff.id}`} /><Label htmlFor={`absent-${staff.id}`}>Absent</Label></div></RadioGroup></TableCell>
                                        <TableCell><div className="relative"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">{currencySymbol}</span><Input type="number" value={attendance[staff.id]?.expense || ''} onChange={(e) => handleExpenseChange(staff.id, e.target.value)} placeholder="0" className="pl-7"/></div></TableCell>
                                        <TableCell className="text-right">{renderStaffActions(staff)}</TableCell>
                                    </TableRow>
                                ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button onClick={handleSave} disabled={isSaving || staffMembers.length === 0}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
                </Card>
            </TabsContent>
            <TabsContent value="monthly">
                 <MonthlyReport staffMembers={staffMembers} currencySymbol={currencySymbol} currentUser={currentUser} />
            </TabsContent>
        </Tabs>
    </>
  );
}

export default function StaffManagementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Management"
        description="Manage daily attendance, expenses, and staff profiles."
      />
      <StaffManagementComponent />
    </div>
  );
}

    