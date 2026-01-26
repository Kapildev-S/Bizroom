
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { AppSettings, InvoiceCustomizationSettings as CustomizationSettingsType } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import InvoicePreview from './InvoicePreview';
import { Switch } from '../ui/switch';
import { colorOptions } from '@/lib/mockData';
import Image from 'next/image';

const customizationSchema = z.object({
  themeColor: z.string().optional(),
  template: z.string().optional(),
  showPartyBalance: z.boolean().default(false),
});

interface InvoiceCustomizationSettingsProps {
  settings: CustomizationSettingsType;
  onSave: (settings: Partial<AppSettings>) => Promise<void>;
}

export default function InvoiceCustomizationSettings({ settings, onSave }: InvoiceCustomizationSettingsProps) {
  const form = useForm<z.infer<typeof customizationSchema>>({
    resolver: zodResolver(customizationSchema),
    defaultValues: settings || { themeColor: 'Default', template: 'classic', showPartyBalance: false },
  });

  React.useEffect(() => {
    form.reset(settings || { themeColor: 'Default', template: 'classic', showPartyBalance: false });
  }, [settings, form]);

  const onSubmit = async (values: z.infer<typeof customizationSchema>) => {
    await onSave({ customizationSettings: values });
  };

  const watchedThemeColor = form.watch('themeColor');
  const watchedTemplate = form.watch('template');
  const colorValue = colorOptions.find(c => c.name === watchedThemeColor)?.value || 'hsl(var(--primary))';


  return (
    <Card className="shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle>Invoice Customization</CardTitle>
            <CardDescription>Personalize the appearance of your invoices.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="lg:order-2 space-y-8">
                <div>
                  <FormLabel>Themes</FormLabel>
                  <FormField
                    control={form.control}
                    name="template"
                    render={({ field }) => (
                      <FormItem>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-4 gap-3 mt-2"
                        >
                          <FormItem>
                            <FormLabel className="[&:has([data-state=checked])>div]:ring-2 ring-primary cursor-pointer">
                              <FormControl>
                                <RadioGroupItem value="classic" className="sr-only" />
                              </FormControl>
                              <div className="rounded-md p-3 h-16 flex items-center justify-center border border-border transition-all hover:shadow-lg hover:border-primary">
                                <span className="text-center text-xs font-medium">Classic</span>
                              </div>
                            </FormLabel>
                          </FormItem>
                          <FormItem>
                            <FormLabel className="[&:has([data-state=checked])>div]:ring-2 ring-primary cursor-pointer">
                              <FormControl>
                                <RadioGroupItem value="modern" className="sr-only" />
                              </FormControl>
                              <div className="rounded-md p-3 h-16 flex items-center justify-center border border-border transition-all hover:shadow-lg hover:border-primary">
                                <span className="text-center text-xs font-medium">Modern</span>
                              </div>
                            </FormLabel>
                          </FormItem>
                          <FormItem>
                            <FormLabel className="[&:has([data-state=checked])>div]:ring-2 ring-primary cursor-pointer">
                              <FormControl>
                                <RadioGroupItem value="stylish" className="sr-only" />
                              </FormControl>
                              <div className="rounded-md p-3 h-16 flex items-center justify-center border border-border transition-all hover:shadow-lg hover:border-primary">
                                <span className="text-center text-xs font-medium">Stylish</span>
                              </div>
                            </FormLabel>
                          </FormItem>
                          <FormItem>
                            <FormLabel className="[&:has([data-state=checked])>div]:ring-2 ring-primary cursor-pointer">
                              <FormControl>
                                <RadioGroupItem value="professional" className="sr-only" />
                              </FormControl>
                              <div className="rounded-md p-3 h-16 flex items-center justify-center border border-border transition-all hover:shadow-lg hover:border-primary">
                                <span className="text-center text-xs font-medium">Professional</span>
                              </div>
                            </FormLabel>
                          </FormItem>
                          <FormItem>
                            <FormLabel className="[&:has([data-state=checked])>div]:ring-2 ring-primary cursor-pointer">
                              <FormControl>
                                <RadioGroupItem value="minimal" className="sr-only" />
                              </FormControl>
                              <div className="rounded-md p-3 h-16 flex items-center justify-center border border-border transition-all hover:shadow-lg hover:border-primary">
                                <span className="text-center text-xs font-medium">Minimal</span>
                              </div>
                            </FormLabel>
                          </FormItem>
                          <FormItem>
                            <FormLabel className="[&:has([data-state=checked])>div]:ring-2 ring-primary cursor-pointer">
                              <FormControl>
                                <RadioGroupItem value="elegant" className="sr-only" />
                              </FormControl>
                              <div className="rounded-md p-3 h-16 flex items-center justify-center border border-border transition-all hover:shadow-lg hover:border-primary">
                                <span className="text-center text-xs font-medium">Elegant</span>
                              </div>
                            </FormLabel>
                          </FormItem>
                          <FormItem>
                            <FormLabel className="[&:has([data-state=checked])>div]:ring-2 ring-primary cursor-pointer">
                              <FormControl>
                                <RadioGroupItem value="bold" className="sr-only" />
                              </FormControl>
                              <div className="rounded-md p-3 h-16 flex items-center justify-center border border-border transition-all hover:shadow-lg hover:border-primary">
                                <span className="text-center text-xs font-medium">Bold</span>
                              </div>
                            </FormLabel>
                          </FormItem>
                          <FormItem>
                            <FormLabel className="[&:has([data-state=checked])>div]:ring-2 ring-primary cursor-pointer">
                              <FormControl>
                                <RadioGroupItem value="compact" className="sr-only" />
                              </FormControl>
                              <div className="rounded-md p-3 h-16 flex items-center justify-center border border-border transition-all hover:shadow-lg hover:border-primary">
                                <span className="text-center text-xs font-medium">Compact</span>
                              </div>
                            </FormLabel>
                          </FormItem>
                        </RadioGroup>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <FormLabel>Select Color</FormLabel>
                  <FormField
                    control={form.control}
                    name="themeColor"
                    render={({ field }) => (
                      <FormItem>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="grid grid-cols-8 gap-2 mt-2"
                        >
                          {colorOptions.map((color) => (
                            <FormItem key={color.name}>
                              <FormLabel className="[&:has([data-state=checked])]:ring-2 ring-primary rounded-full cursor-pointer">
                                <FormControl>
                                  <RadioGroupItem value={color.name} className="sr-only" />
                                </FormControl>
                                <div className="h-8 w-8 rounded-full" style={{ backgroundColor: color.value }} />
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div>
                  <FormLabel>Theme Settings</FormLabel>
                  <FormField
                    control={form.control}
                    name="showPartyBalance"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 mt-2">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">Show party balance in invoice</FormLabel>
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
                </div>
              </div>
              <div className="lg:order-1">
                <InvoicePreview themeColor={colorValue} template={watchedTemplate} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Customization
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
