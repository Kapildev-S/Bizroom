
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { AppSettings, InvoiceSettings } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

const invoiceSettingsSchema = z.object({
  defaultInvoiceType: z.enum(['gst', 'non-gst']).default('gst'),
  footerNote: z.string().optional(),
  enableDiscounts: z.boolean().default(true),
  currency: z.string().min(1, "Currency is required.").default('INR'),
  defaultTaxRate: z.coerce.number().min(0).max(100).optional(),
  defaultDueDateDays: z.coerce.number().int().min(0).optional(),
});

interface InvoiceSettingsProps {
  settings: InvoiceSettings;
  onSave: (settings: Partial<AppSettings>) => Promise<void>;
}

export default function InvoiceSettings({ settings, onSave }: InvoiceSettingsProps) {
  const form = useForm<z.infer<typeof invoiceSettingsSchema>>({
    resolver: zodResolver(invoiceSettingsSchema),
    defaultValues: settings,
  });

  React.useEffect(() => {
    form.reset(settings);
  }, [settings, form]);

  const onSubmit = async (values: z.infer<typeof invoiceSettingsSchema>) => {
    // Sanitize data to ensure no 'undefined' values are sent to Firestore
    const dataToSave = {
        ...values,
        footerNote: values.footerNote || '',
    };
    await onSave({ invoiceSettings: dataToSave });
  };

  return (
    <Card className="shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Invoice Settings</CardTitle>
            <CardDescription>Set defaults for all new invoices you create.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="defaultInvoiceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Invoice Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="gst">GST Invoice</SelectItem>
                        <SelectItem value="non-gst">Non-GST Invoice</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="INR">₹ INR</SelectItem>
                            <SelectItem value="USD">$ USD</SelectItem>
                            <SelectItem value="EUR">€ EUR</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="defaultTaxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Tax Rate (%)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g. 18" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="defaultDueDateDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Due Period</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g. 7" {...field} /></FormControl>
                     <FormDescription>Due in X days from issue date.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="footerNote"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Footer Note / Terms & Conditions</FormLabel>
                    <FormControl><Textarea placeholder="e.g. Thank you for your business. Please pay within the specified due date." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
             <FormField
              control={form.control}
              name="enableDiscounts"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable Discount Fields</FormLabel>
                    <FormDescription>
                      Show fields for adding discounts on invoices.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Invoice Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
