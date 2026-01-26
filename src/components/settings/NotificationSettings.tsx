
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { AppSettings, NotificationSettings } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const notificationSettingsSchema = z.object({
  email: z.boolean().default(false),
  paymentReminders: z.boolean().default(false),
  dailySummary: z.boolean().default(false),
});

interface NotificationSettingsProps {
  settings: NotificationSettings;
  onSave: (settings: Partial<AppSettings>) => Promise<void>;
}

export default function NotificationSettings({ settings, onSave }: NotificationSettingsProps) {
  const form = useForm<z.infer<typeof notificationSettingsSchema>>({
    resolver: zodResolver(notificationSettingsSchema),
    defaultValues: settings,
  });

  React.useEffect(() => {
    form.reset(settings);
  }, [settings, form]);

  const onSubmit = async (values: z.infer<typeof notificationSettingsSchema>) => {
    await onSave({ notificationSettings: values });
  };

  return (
    <Card className="shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>Manage how you receive notifications from BizRoom.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 opacity-50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">Email Notifications <Badge variant="outline">Coming Soon</Badge></FormLabel>
                    <FormDescription>Receive updates about invoices and payments via email.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="paymentReminders"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 opacity-50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">Payment Reminder Alerts <Badge variant="outline">Coming Soon</Badge></FormLabel>
                    <FormDescription>Get alerts via WhatsApp/SMS/Email for overdue invoices.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dailySummary"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 opacity-50">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base flex items-center gap-2">Daily Summary Toggle <Badge variant="outline">Coming Soon</Badge></FormLabel>
                    <FormDescription>Receive a summary of your daily business activity.</FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} disabled />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Notification Settings
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
