
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { AppSettings, PaymentSettings } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

const paymentSettingsSchema = z.object({
  upiId: z.string().optional(),
  bankDetails: z.string().optional(),
  acceptedPaymentModes: z.array(z.string()).optional(),
  enablePaymentReminders: z.boolean().default(false),
});

const paymentModes = [
    { id: 'Cash', label: 'Cash' },
    { id: 'UPI', label: 'UPI / QR Code' },
    { id: 'Card', label: 'Credit/Debit Card' },
    { id: 'Bank Transfer', label: 'Bank Transfer' },
];

interface PaymentSettingsProps {
  settings: PaymentSettings;
  onSave: (settings: Partial<AppSettings>) => Promise<void>;
}

export default function PaymentSettings({ settings, onSave }: PaymentSettingsProps) {
  const form = useForm<z.infer<typeof paymentSettingsSchema>>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
        upiId: settings.upiId || '',
        bankDetails: settings.bankDetails || '',
        acceptedPaymentModes: settings.acceptedPaymentModes || [],
        enablePaymentReminders: settings.enablePaymentReminders || false,
    },
  });

  React.useEffect(() => {
    form.reset({
        upiId: settings.upiId || '',
        bankDetails: settings.bankDetails || '',
        acceptedPaymentModes: settings.acceptedPaymentModes || [],
        enablePaymentReminders: settings.enablePaymentReminders || false,
    });
  }, [settings, form]);


  const onSubmit = async (values: z.infer<typeof paymentSettingsSchema>) => {
    // Sanitize data to ensure no 'undefined' values are sent to Firestore
    const dataToSave = {
        ...values,
        upiId: values.upiId || '',
        bankDetails: values.bankDetails || '',
    };
    await onSave({ paymentSettings: dataToSave });
  };

  return (
    <Card className="shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Payment Settings</CardTitle>
            <CardDescription>Configure how you receive payments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="upiId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>UPI ID (for QR Code)</FormLabel>
                  <FormControl><Input placeholder="yourname@bank" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bankDetails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Account Details</FormLabel>
                  <FormControl><Textarea placeholder="Bank Name, Account Number, IFSC Code" {...field} /></FormControl>
                  <FormDescription>This will be displayed on your invoices.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="acceptedPaymentModes"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Accepted Payment Modes</FormLabel>
                    <FormDescription>Select which payment methods you accept.</FormDescription>
                  </div>
                  {paymentModes.map((item) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      name="acceptedPaymentModes"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={item.id}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...(field.value || []), item.id])
                                    : field.onChange(
                                        (field.value || []).filter(
                                          (value) => value !== item.id
                                        )
                                      )
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal">{item.label}</FormLabel>
                          </FormItem>
                        )
                      }}
                    />
                  ))}
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="enablePaymentReminders"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Auto Payment Reminders</FormLabel>
                    <FormDescription>
                      Automatically send reminders for overdue invoices.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Payment Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
