
"use client";

import React, { useState } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, FormProvider } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Hash, User, FileText, Percent, StickyNote, Loader2, Phone, ChevronsUpDown, Check, Banknote } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn, getCurrencySymbol } from "@/lib/utils";
import type { Customer, Product, Invoice, AppSettings } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { InvoiceFormItems } from "./InvoiceFormItems";
import type { User as FirebaseUser } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { addDoc, collection, doc, Timestamp, runTransaction } from 'firebase/firestore';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const invoiceItemSchema = z.object({
  productId: z.string().min(1, "Product is required."),
  productName: z.string(),
  quantity: z.coerce.number().positive("Quantity must be greater than 0."),
  unitPrice: z.coerce.number().min(0, "Unit price cannot be negative."),
  totalPrice: z.coerce.number(),
  unit: z.string().optional(),
});

const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required."),
  customerId: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required."),
  customerPhone: z.string().optional(),
  issueDate: z.date({ required_error: "Issue date is required." }),
  dueDate: z.date({ required_error: "Due date is required." }),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required."),
  notes: z.string().optional(),
  currency: z.string().default('USD'),
  subtotal: z.coerce.number().default(0),
  discountType: z.enum(['percentage', 'fixed']).optional().default('fixed'),
  discountValue: z.coerce.number().min(0).optional(),
  discountAmount: z.coerce.number().default(0), // Calculated discount amount
  taxRate: z.coerce.number().min(0).max(100).default(0), // Now 0-100
  taxAmount: z.coerce.number().default(0),
  totalAmount: z.coerce.number().default(0),
}).refine(data => data.dueDate >= data.issueDate, {
  message: "Due date cannot be earlier than issue date.",
  path: ["dueDate"],
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  initialData?: Invoice | null;
  customers: Customer[];
  products: Product[];
  settings: AppSettings | null;
  currentUser: FirebaseUser | null;
  invoiceCount?: number;
}

export function InvoiceForm({ initialData, customers, products, settings, currentUser, invoiceCount }: InvoiceFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openCustomerCombobox, setOpenCustomerCombobox] = useState(false);

  const enableDiscounts = settings?.invoiceSettings?.enableDiscounts;
  const defaultDueDateDays = settings?.invoiceSettings?.defaultDueDateDays ?? 30;
  const defaultTaxRate = settings?.invoiceSettings?.defaultTaxRate ?? 8;
  const defaultCurrency = settings?.invoiceSettings?.currency ?? 'USD';

  const defaultValues = initialData ? {
    ...initialData,
    issueDate: new Date(initialData.issueDate),
    dueDate: new Date(initialData.dueDate),
    taxRate: initialData.taxRate * 100, // convert back to percentage for input
    customerPhone: initialData.customerPhone || '',
    discountType: initialData.discountType || 'fixed',
    discountValue: initialData.discountValue,
    discountAmount: initialData.discountAmount || 0,
  } : {
    invoiceNumber: `${settings?.businessProfile?.invoicePrefix || 'INV-'}${(invoiceCount! + 1).toString().padStart(5, '0')}`,
    customerId: "",
    customerName: "",
    customerPhone: "",
    issueDate: new Date(),
    dueDate: addDays(new Date(), defaultDueDateDays),
    items: [{ productId: "", productName: "", quantity: 1, unitPrice: 0, totalPrice: 0, unit: "" }],
    notes: "",
    currency: defaultCurrency,
    subtotal: 0,
    discountType: 'fixed',
    discountValue: undefined,
    discountAmount: 0,
    taxRate: defaultTaxRate,
    taxAmount: 0,
    totalAmount: 0,
  };

  const methods = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues,
  });

  const { handleSubmit, control, watch, setValue } = methods;

  const watchedCurrency = watch("currency");
  const currencySymbol = getCurrencySymbol(watchedCurrency);

  const onSubmit = async (values: InvoiceFormValues) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to create or update invoices." });
      return;
    }
    setIsSubmitting(true);

    let customerId = values.customerId;

    if (!customerId && values.customerName) {
      try {
        const customerCollectionRef = collection(db, `users/${currentUser.uid}/customers`);
        const newCustomerDoc = await addDoc(customerCollectionRef, {
          name: values.customerName,
          phone: values.customerPhone || '',
          email: '',
          address: '',
          createdAt: Timestamp.now(),
          userId: currentUser.uid,
        });
        customerId = newCustomerDoc.id;
        toast({ title: "New Customer Created", description: `${values.customerName} has been added to your customer list.` });
      } catch (error) {
        console.error("Error creating new customer:", error);
        toast({ variant: "destructive", title: "Customer Creation Failed", description: "Could not create the new customer. Invoice was not saved." });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      let finalInvoiceId = initialData?.id;

      await runTransaction(db, async (transaction) => {
        const productMap = new Map<string, { ref: any, oldQty: number, newQty: number, name: string }>();

        // Consolidate old items being returned to stock
        if (initialData) {
          for (const item of initialData.items) {
            const productRef = doc(db, `users/${currentUser.uid}/products`, item.productId);
            productMap.set(item.productId, { ref: productRef, oldQty: item.quantity, newQty: 0, name: item.productName });
          }
        }

        // Consolidate new items being removed from stock
        for (const item of values.items) {
          const product = products.find(p => p.id === item.productId);
          const productName = product ? product.name : 'Unknown Product';
          const productRef = doc(db, `users/${currentUser.uid}/products`, item.productId);
          if (productMap.has(item.productId)) {
            const existing = productMap.get(item.productId)!;
            existing.newQty = item.quantity;
          } else {
            productMap.set(item.productId, { ref: productRef, oldQty: 0, newQty: item.quantity, name: productName });
          }
        }

        // --- 1. All READS first ---
        const productRefsToRead = Array.from(productMap.values()).map(p => p.ref);
        const productDocs = productRefsToRead.length > 0 ? await Promise.all(productRefsToRead.map(ref => transaction.get(ref))) : [];

        const stockUpdates: { ref: any, newStock: number }[] = [];

        // --- 2. All calculations and validations second ---
        for (let i = 0; i < productDocs.length; i++) {
          const productDoc = productDocs[i];
          const productInfo = Array.from(productMap.values())[i];

          if (!productDoc.exists()) {
            throw new Error(`Product "${productInfo.name}" not found.`);
          }

          const productData = productDoc.data();
          if (productData.stock !== null) { // Only track stock if it's not unlimited
            const currentStock = productData.stock;
            const stockChange = productInfo.oldQty - productInfo.newQty;
            const newStock = currentStock + stockChange;

            if (newStock < 0) {
              throw new Error(`Not enough stock for ${productInfo.name}. Only ${currentStock} left, but ${productInfo.newQty} are required.`);
            }
            stockUpdates.push({ ref: productInfo.ref, newStock });
          }
        }

        // --- 3. All WRITES last ---
        for (const update of stockUpdates) {
          transaction.update(update.ref, { stock: update.newStock });
        }

        const dataToSubmit = {
          ...values,
          discountValue: values.discountValue || 0,
          discountAmount: values.discountAmount || 0,
          issueDate: Timestamp.fromDate(values.issueDate),
          dueDate: Timestamp.fromDate(values.dueDate),
          taxRate: values.taxRate / 100,
          items: values.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            return { ...item, productName: product ? product.name : 'Unknown Product' };
          }),
          customerId: customerId,
          status: initialData?.status || 'sent',
          userId: currentUser.uid,
        };

        delete (dataToSubmit as any).id; // Make sure we don't try to write the id field

        if (initialData?.id) {
          const invoiceDocRef = doc(db, `users/${currentUser.uid}/invoices`, initialData.id);
          transaction.update(invoiceDocRef, dataToSubmit);
        } else {
          const newInvoiceRef = doc(collection(db, `users/${currentUser.uid}/invoices`));
          transaction.set(newInvoiceRef, { ...dataToSubmit, createdAt: Timestamp.now() });
          finalInvoiceId = newInvoiceRef.id;
        }
      });

      toast({ title: initialData ? "Invoice Updated" : "Invoice Created", description: `Invoice ${values.invoiceNumber} has been successfully created and stock levels updated.` });

      if (finalInvoiceId) {
        router.refresh(); // Ensure the view page gets fresh data
        router.push(`/invoices/${finalInvoiceId}`);
      } else {
        router.refresh();
        router.push("/invoices");
      }
    } catch (error) {
      console.error("Error submitting invoice:", error);
      const errorMessage = (error as Error).message || "Could not save the invoice. Please try again.";
      let errorTitle = "Submission Error";

      if (errorMessage.startsWith("Not enough stock")) {
        errorTitle = "Inventory Error";
      }

      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchedItems = watch("items");
  const watchedTaxRate = watch("taxRate");
  const watchedDiscountType = watch("discountType");
  const watchedDiscountValue = watch("discountValue");

  React.useEffect(() => {
    let subtotal = 0;
    watchedItems.forEach(item => {
      subtotal += item.totalPrice || 0;
    });
    setValue("subtotal", subtotal);

    let calculatedDiscount = 0;
    if (watchedDiscountType === 'percentage') {
      calculatedDiscount = subtotal * ((watchedDiscountValue || 0) / 100);
    } else { // 'fixed'
      calculatedDiscount = watchedDiscountValue || 0;
    }

    if (calculatedDiscount > subtotal) {
      calculatedDiscount = subtotal;
    }

    setValue("discountAmount", calculatedDiscount);

    const subtotalAfterDiscount = subtotal - calculatedDiscount;

    const taxAmount = subtotalAfterDiscount > 0 ? subtotalAfterDiscount * (watchedTaxRate / 100 || 0) : 0;
    setValue("taxAmount", taxAmount);
    setValue("totalAmount", subtotalAfterDiscount + taxAmount);
  }, [
    JSON.stringify(watchedItems), // This ensures the effect runs on deep changes to items
    watchedTaxRate,
    watchedDiscountType,
    watchedDiscountValue,
    setValue
  ]);


  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-headline text-primary">
              {initialData ? "Edit Invoice" : "Create New Invoice"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={control}
                name="invoiceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <FormControl><Input {...field} className="pl-10" /></FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Select Registered Customer (Optional)</FormLabel>
                    <Popover open={openCustomerCombobox} onOpenChange={setOpenCustomerCombobox}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? customers.find(
                                (customer) => customer.id === field.value
                              )?.name
                              : "Select customer..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                        <Command>
                          <CommandInput placeholder="Search customer..." />
                          <CommandList>
                            <CommandEmpty>No customer found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="manual"
                                onSelect={() => {
                                  field.onChange('');
                                  setValue('customerName', '', { shouldValidate: true });
                                  setValue('customerPhone', '', { shouldValidate: true });
                                  setOpenCustomerCombobox(false);
                                }}
                              >
                                Enter customer manually
                              </CommandItem>
                              {customers.map((customer) => (
                                <CommandItem
                                  value={customer.name}
                                  key={customer.id}
                                  onSelect={() => {
                                    field.onChange(customer.id);
                                    setValue('customerName', customer.name, { shouldValidate: true });
                                    setValue('customerPhone', customer.phone, { shouldValidate: true });
                                    setOpenCustomerCombobox(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      customer.id === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {customer.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <FormControl><Input placeholder="Enter customer's name" {...field} className="pl-10" /></FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="customerPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Phone (Optional)</FormLabel>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <FormControl><Input type="tel" placeholder="Enter customer's phone" {...field} className="pl-10" /></FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Issue Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <InvoiceFormItems products={products} currencySymbol={currencySymbol} />

            <div className="grid md:grid-cols-2 gap-6 pt-6 border-t">
              {enableDiscounts && (
                <FormField
                  control={control}
                  name="discountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount</FormLabel>
                      <div className="flex gap-2">
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="fixed">{currencySymbol} Fixed</SelectItem>
                            <SelectItem value="percentage">% Percent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormField
                          control={control}
                          name="discountValue"
                          render={({ field: valueField }) => (
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="e.g. 10"
                                {...valueField}
                                onChange={e => valueField.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                value={valueField.value ?? ''}
                                className="flex-1"
                              />
                            </FormControl>
                          )}
                        />
                      </div>
                      <FormDescription>Discount is applied before tax.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={control}
                name="taxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Rate (%)</FormLabel>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <FormControl><Input type="number" step="0.01" placeholder="e.g. 18" {...field} className="pl-10" /></FormControl>
                    </div>
                    <FormDescription>Enter percentage e.g., 18 for 18%.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <div className="relative">
                      <StickyNote className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <FormControl><Textarea placeholder="Any additional notes for the customer..." {...field} className="pl-10 min-h-[100px]" /></FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Card className="mt-6 bg-secondary/50 shadow-inner">
              <CardHeader><CardTitle className="text-lg font-headline">Summary</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between"><span>Subtotal:</span><span>{currencySymbol}{watch("subtotal").toFixed(2)}</span></div>
                {enableDiscounts && (watch("discountValue") || 0) > 0 && (
                  <div className="flex justify-between text-destructive">
                    <span>Discount:</span>
                    <span>-{currencySymbol}{(watch("discountAmount") || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between"><span>Tax ({watch("taxRate")}%):</span><span>{currencySymbol}{watch("taxAmount").toFixed(2)}</span></div>
                <div className="flex justify-between font-bold text-lg text-primary"><span>Total Amount:</span><span>{currencySymbol}{watch("totalAmount").toFixed(2)}</span></div>
              </CardContent>
            </Card>

          </CardContent>
          <CardFooter className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting || !currentUser}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Save Changes" : "Create Invoice"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </FormProvider>
  );
}
