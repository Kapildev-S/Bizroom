
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
import { Switch } from "@/components/ui/switch";
import { CalendarIcon, Hash, User, FileText, Percent, StickyNote, Loader2, Phone, ChevronsUpDown, Check, Banknote } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn, getCurrencySymbol } from "@/lib/utils";
import { Customer, Product, Invoice, AppSettings, INDIAN_STATES } from "@/lib/mockData";
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
  mrp: z.coerce.number().min(0).optional().default(0), // Display only — no calculation role
  totalPrice: z.coerce.number(),
  unit: z.string().optional(),
  hsnCode: z.string().optional(),
  gstRate: z.coerce.number().optional(),
  taxAmount: z.coerce.number().optional(),
});

const invoiceFormSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required."),
  customerId: z.string().optional(),
  customerName: z.string().min(1, "Customer name is required."),
  customerPhone: z.string().optional(),
  issueDate: z.date({ required_error: "Issue date is required." }).refine(date => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date <= today;
  }, "Issue date cannot be in the future."),
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
  invoiceType: z.enum(['Retail', 'Wholesale']).default('Retail'),
  gstType: z.enum(['CGST_SGST', 'IGST']).optional(),
  placeOfSupply: z.string().optional(),
  customerGstin: z.string().optional(),
  reverseCharge: z.boolean().default(false),
  isTaxInclusive: z.boolean().default(false),
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
  const enableAdvancedInvoiceSystem = settings?.invoiceSettings?.enableAdvancedInvoiceSystem;

  const defaultValues = initialData ? {
    ...initialData,
    issueDate: new Date(initialData.issueDate),
    dueDate: new Date(initialData.dueDate),
    taxRate: initialData.taxRate * 100, // convert back to percentage for input
    customerPhone: initialData.customerPhone || '',
    discountType: (initialData.discountType || 'fixed') as 'percentage' | 'fixed',
    discountValue: initialData.discountValue,
    discountAmount: initialData.discountAmount || 0,
    invoiceType: (initialData.invoiceType || 'Retail') as 'Retail' | 'Wholesale',
    gstType: initialData.gstType,
    placeOfSupply: initialData.placeOfSupply || '',
    customerGstin: initialData.customerGstin || '',
    reverseCharge: initialData.reverseCharge || false,
  } : {
    invoiceNumber: `${settings?.businessProfile?.invoicePrefix ?? 'INV'}${(invoiceCount! + 1).toString().padStart(3, '0')}`,
    customerId: "",
    customerName: "",
    customerPhone: "",
    issueDate: new Date(),
    dueDate: addDays(new Date(), defaultDueDateDays),
    items: [{ productId: "", productName: "", quantity: 1, unitPrice: 0, mrp: 0, totalPrice: 0, unit: "", gstRate: 0, taxAmount: 0 }],
    notes: "",
    currency: defaultCurrency,
    subtotal: 0,
    discountType: 'fixed' as const,
    discountValue: undefined,
    discountAmount: 0,
    taxRate: defaultTaxRate,
    taxAmount: 0,
    invoiceType: 'Retail' as const,
    gstType: undefined,
    placeOfSupply: settings?.businessProfile?.state || 'Tamil Nadu',
    customerGstin: '',
    reverseCharge: false,
    isTaxInclusive: settings?.invoiceSettings?.defaultInvoiceType === 'gst' ? true : false, // Default to true if GST is enabled usually
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
      // Declared in outer scope so it's accessible in the toast after the transaction commits
      let nextInvoiceNumber = values.invoiceNumber;

      await runTransaction(db, async (transaction) => {
        // --- 1. Counter Logic (READ counter) ---
        let counterUpdate: { ref: any, newId: number } | null = null;
        if (!initialData) {
          const counterDocRef = doc(db, `users/${currentUser.uid}/counters`, 'invoices');
          const counterSnap = await transaction.get(counterDocRef);
          let lastId = 0;
          if (counterSnap.exists()) {
            lastId = counterSnap.data().lastId || 0;
          } else {
            // Counter doc doesn't exist yet — bootstrap from the highest existing invoice number
            // to avoid duplicate numbers when advanced mode is first turned on.
            // Note: We can't do getDocs inside a transaction, so we rely on invoiceCount
            // passed from the parent page, which already computed the max.
            lastId = invoiceCount ?? 0;
          }

          const invoicePrefix = settings?.businessProfile?.invoicePrefix ?? 'INV';
          const defaultPreviewNumber = `${invoicePrefix}${((invoiceCount ?? 0) + 1).toString().padStart(3, '0')}`;
          
          // If the user hasn't changed the invoice number from the default preview,
          // or if it's empty, use the authoritative auto-increment logic.
          if (values.invoiceNumber === defaultPreviewNumber || !values.invoiceNumber) {
            const newId = lastId + 1;
            nextInvoiceNumber = `${invoicePrefix}${newId.toString().padStart(3, '0')}`;
            counterUpdate = { ref: counterDocRef, newId };
          } else {
            // User provided a custom invoice number, use it directly.
            nextInvoiceNumber = values.invoiceNumber;
            
            // Try to extract a number from the custom invoice number to keep the counter in sync
            // if they're using a similar format (e.g., INV005).
            const match = nextInvoiceNumber.match(/(\d+)$/);
            if (match) {
              const customId = parseInt(match[1], 10);
              if (customId > lastId) {
                counterUpdate = { ref: counterDocRef, newId: customId };
              }
            }
          }
        }

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

        // --- 2. All READS first ---
        const productRefsToRead = Array.from(productMap.values()).map(p => p.ref);
        const productDocs = productRefsToRead.length > 0 ? await Promise.all(productRefsToRead.map(ref => transaction.get(ref))) : [];

        const stockUpdates: { ref: any, newStock: number }[] = [];

        // --- 3. All calculations and validations second ---
        for (let i = 0; i < productDocs.length; i++) {
          const productDoc = productDocs[i];
          const productInfo = Array.from(productMap.values())[i];

          if (!productDoc.exists()) {
            throw new Error(`Product "${productInfo.name}" not found.`);
          }

          const productData = productDoc.data() as Product;
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

        // --- 4. All WRITES last ---
        if (counterUpdate) {
          transaction.set(counterUpdate.ref, { lastId: counterUpdate.newId }, { merge: true });
        }

        for (const update of stockUpdates) {
          transaction.update(update.ref, { stock: update.newStock });
        }

        const dataToSubmit = {
          ...values,
          invoiceNumber: nextInvoiceNumber,
          discountValue: values.discountValue || 0,
          discountAmount: values.discountAmount || 0,
          issueDate: Timestamp.fromDate(values.issueDate),
          dueDate: Timestamp.fromDate(values.dueDate),
          taxRate: values.taxRate / 100,
          items: values.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            return { 
              ...item, 
              productName: product ? product.name : 'Unknown Product',
            };
          }),
          customerId: customerId,
          status: initialData?.status || 'sent',
          userId: currentUser.uid,
          invoiceType: values.invoiceType,
          gstType: values.gstType,
          placeOfSupply: values.placeOfSupply,
          customerGstin: values.customerGstin,
          reverseCharge: values.reverseCharge,
        };

        // Clean data for Firestore (remove undefined values recursively)
        const cleanFirestoreData = (obj: any): any => {
          if (Array.isArray(obj)) return obj.map(cleanFirestoreData);
          if (obj !== null && typeof obj === 'object' && !obj.seconds && !obj.nanoseconds) {
            const newObj: any = {};
            for (const key in obj) {
              if (obj[key] !== undefined) {
                newObj[key] = cleanFirestoreData(obj[key]);
              }
            }
            return newObj;
          }
          return obj;
        };

        const cleanData = cleanFirestoreData(dataToSubmit);
        delete cleanData.id;

        if (initialData?.id) {
          const invoiceDocRef = doc(db, `users/${currentUser.uid}/invoices`, initialData.id);
          transaction.update(invoiceDocRef, cleanData);
        } else {
          const newInvoiceRef = doc(collection(db, `users/${currentUser.uid}/invoices`));
          transaction.set(newInvoiceRef, { ...cleanData, createdAt: Timestamp.now() });
          finalInvoiceId = newInvoiceRef.id;
        }
      });

      toast({ title: initialData ? "Invoice Updated" : "Invoice Created", description: `Invoice ${nextInvoiceNumber} has been successfully ${initialData ? 'updated' : 'created'}.` });

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
  const watchedPlaceOfSupply = watch("placeOfSupply");

  // Auto-detect GST Type
  React.useEffect(() => {
    if (enableAdvancedInvoiceSystem && watchedPlaceOfSupply) {
      const businessState = settings?.businessProfile?.state;
      if (businessState && watchedPlaceOfSupply === businessState) {
        setValue('gstType', 'CGST_SGST');
      } else if (businessState) {
        setValue('gstType', 'IGST');
      }
    }
  }, [enableAdvancedInvoiceSystem, watchedPlaceOfSupply, settings?.businessProfile?.state, setValue]);

  const watchedIsTaxInclusive = watch("isTaxInclusive");

  React.useEffect(() => {
    let totalAmount = 0;
    let totalTaxableValue = 0;
    let totalTax = 0;

    watchedItems.forEach((item, index) => {
      const itemQuantity = item.quantity || 0;
      const itemUnitPrice = item.unitPrice || 0;
      const itemGstRate = item.gstRate || 0;
      const itemTotal = itemQuantity * itemUnitPrice;

      if (watchedIsTaxInclusive) {
        // Inclusive: Rate includes Tax
        // Taxable Value = Total / (1 + Rate/100)
        const taxableValue = itemTotal / (1 + itemGstRate / 100);
        const taxAmount = itemTotal - taxableValue;
        
        totalAmount += itemTotal;
        totalTaxableValue += taxableValue;
        totalTax += taxAmount;

        // Update individual item tax if needed for the template
        if (watchedItems[index].taxAmount !== taxAmount) {
            setValue(`items.${index}.taxAmount`, taxAmount);
        }
      } else {
        // Exclusive: Rate is base price
        const taxAmount = (itemTotal * itemGstRate) / 100;
        
        totalAmount += itemTotal + taxAmount;
        totalTaxableValue += itemTotal;
        totalTax += taxAmount;

        if (watchedItems[index].taxAmount !== taxAmount) {
            setValue(`items.${index}.taxAmount`, taxAmount);
        }
      }
    });

    // Apply Discount
    let calculatedDiscount = 0;
    if (watchedDiscountType === 'percentage') {
      calculatedDiscount = totalTaxableValue * ((watchedDiscountValue || 0) / 100);
    } else {
      calculatedDiscount = watchedDiscountValue || 0;
    }

    if (calculatedDiscount > totalTaxableValue) {
      calculatedDiscount = totalTaxableValue;
    }

    setValue("discountAmount", calculatedDiscount);
    
    // Subtotal in our app means "Taxable Value"
    setValue("subtotal", totalTaxableValue);
    
    // Re-calculate tax if discount changed the taxable value? 
    // Usually GST is on (Taxable Value - Discount).
    const finalTaxableValue = totalTaxableValue - calculatedDiscount;
    
    // If inclusive, we need to adjust the total too
    if (watchedIsTaxInclusive) {
        // In inclusive mode, discount reduces the total directly? 
        // Or it reduces taxable value? 
        // Let's keep it simple: Total = Taxable + Tax.
        // If we discount, we reduce both proportionally.
        const discountFactor = totalTaxableValue > 0 ? (finalTaxableValue / totalTaxableValue) : 1;
        const finalTax = totalTax * discountFactor;
        const finalTotal = finalTaxableValue + finalTax;
        
        setValue("taxAmount", finalTax);
        setValue("totalAmount", finalTotal);
    } else {
        // Exclusive: Total = (Taxable - Discount) + Tax
        // Note: Currently tax is calculated on the subtotal after discount in the previous code.
        const finalTax = finalTaxableValue * (watchedTaxRate / 100 || 0); // This uses global tax rate if set, but we use per-item GST.
        
        // If items have individual GST, we should sum them.
        // For now, let's stick to the per-item tax sum.
        const itemTaxSum = totalTax * (totalTaxableValue > 0 ? (finalTaxableValue / totalTaxableValue) : 1);
        
        setValue("taxAmount", itemTaxSum);
        setValue("totalAmount", finalTaxableValue + itemTaxSum);
    }
  }, [
    JSON.stringify(watchedItems.map(i => ({ q: i.quantity, p: i.unitPrice, g: i.gstRate }))), // Watch only relevant fields to prevent loop
    watchedIsTaxInclusive,
    watchedTaxRate,
    watchedDiscountType,
    watchedDiscountValue,
    watch("gstType"),
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
                      <FormControl><Input {...field} className="pl-10" placeholder="e.g. INV001" /></FormControl>
                    </div>
                    <FormDescription>
                      This will auto-increment by default, but you can manually override it.
                    </FormDescription>
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
                                    if (enableAdvancedInvoiceSystem && customer.gstin) {
                                      setValue('customerGstin', customer.gstin, { shouldValidate: true });
                                    }
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
              {enableAdvancedInvoiceSystem && (
                <>
                  <FormField
                    control={control}
                    name="invoiceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Retail">Retail</SelectItem>
                            <SelectItem value="Wholesale">Wholesale</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="placeOfSupply"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Place of Supply (State)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INDIAN_STATES.map((state) => (
                              <SelectItem key={state.code} value={state.name}>
                                {state.code} - {state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="customerGstin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer GSTIN</FormLabel>
                        <FormControl><Input placeholder="Buyer's GSTIN" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              {enableAdvancedInvoiceSystem && (
                <>
                  <FormField
                    control={control}
                    name="reverseCharge"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Tax Payable on Reverse Charge</FormLabel>
                          <FormDescription>
                            Select if the recipient is liable to pay tax.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={control}
                    name="isTaxInclusive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-primary/5 border-primary/20">
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-primary font-bold">Prices include GST</FormLabel>
                          <FormDescription>
                            When ON, the total for an item is Qty × Rate. GST is calculated backwards.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>
            <div className="grid md:grid-cols-2 gap-6">
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
                            {field.value ? format(field.value, "dd/MM/yy") : <span>Pick a date</span>}
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
                            {field.value ? format(field.value, "dd/MM/yy") : <span>Pick a date</span>}
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

            <InvoiceFormItems 
              products={products} 
              currencySymbol={currencySymbol} 
              enableAdvancedInvoiceSystem={enableAdvancedInvoiceSystem} 
              isTaxInclusive={watchedIsTaxInclusive}
            />

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
                <div className="flex justify-between">
                  <span>{enableAdvancedInvoiceSystem ? "Total Tax (GST):" : `Tax (${watch("taxRate")}%):`}</span>
                  <span>{currencySymbol}{watch("taxAmount").toFixed(2)}</span>
                </div>
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
