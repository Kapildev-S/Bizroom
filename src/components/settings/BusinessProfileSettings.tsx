
"use client";

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { AppSettings, BusinessProfile, INDIAN_STATES } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, Building2, Camera, MapPin } from 'lucide-react';
import { Separator } from '../ui/separator';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const businessProfileSchema = z.object({
  businessName: z.string().min(2, "Business name is required.").optional(),
  gstNumber: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email("Invalid email address.").optional().or(z.literal('')),
  phone: z.string().optional(),
  logoUrl: z.string().optional().or(z.literal('')),
  invoicePrefix: z.string().optional(),
  state: z.string().optional(),
});

interface BusinessProfileSettingsProps {
  settings: BusinessProfile;
  onSave: (settings: Partial<AppSettings>) => Promise<void>;
}

export default function BusinessProfileSettings({ settings, onSave }: BusinessProfileSettingsProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const form = useForm<z.infer<typeof businessProfileSchema>>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      businessName: settings.businessName || '',
      gstNumber: settings.gstNumber || '',
      address: settings.address || '',
      email: settings.email || '',
      phone: settings.phone || '',
      logoUrl: settings.logoUrl || '',
      invoicePrefix: settings.invoicePrefix || '',
      state: settings.state || 'Tamil Nadu',
    },
  });

  React.useEffect(() => {
    form.reset({
      businessName: settings.businessName || '',
      gstNumber: settings.gstNumber || '',
      address: settings.address || '',
      email: settings.email || '',
      phone: settings.phone || '',
      logoUrl: settings.logoUrl || '',
      invoicePrefix: settings.invoicePrefix || '',
      state: settings.state || 'Tamil Nadu',
    });
  }, [settings, form]);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, etc.)',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setSelectedFile(file);

    toast({
      title: 'Image selected',
      description: 'Click "Save Business Profile" to apply changes.',
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleRemoveLogo = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    form.setValue('logoUrl', '');
  };

  const onSubmit = async (values: z.infer<typeof businessProfileSchema>) => {
    console.log('[BusinessProfile] onSubmit called');
    setIsSaving(true);

    try {
      let logoUrl = values.logoUrl || '';

      // If a new file is selected, use its base64 preview URL directly
      // This bypasses Firebase Storage and stores in Firestore
      if (selectedFile && previewUrl) {
        console.log('[BusinessProfile] Using base64 preview URL for logo');
        logoUrl = previewUrl;
      }

      console.log('[BusinessProfile] Calling onSave');
      await onSave({ businessProfile: { ...values, logoUrl } });
      console.log('[BusinessProfile] onSave completed successfully');

      // Clear state after successful save
      setSelectedFile(null);
      setPreviewUrl(null);
      form.setValue('logoUrl', logoUrl);

      toast({
        title: 'Profile Saved',
        description: 'Your business profile has been updated.',
      });

    } catch (error) {
      console.error('[BusinessProfile] Error in onSubmit:', error);
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: 'Could not save your profile. Please try again.',
      });
    } finally {
      console.log('[BusinessProfile] Setting isSaving to false');
      setIsSaving(false);
    }
  };

  const displayLogoUrl = previewUrl || form.watch('logoUrl');
  const hasNewImage = !!selectedFile;

  return (
    <Card className="shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Profile
            </CardTitle>
            <CardDescription>This information will appear on your invoices.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Logo Upload Section - Minimal Design */}
            <div className="flex items-center gap-6 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
              <div
                className={cn(
                  "relative group flex-shrink-0 h-20 w-20 rounded-full overflow-hidden border-2 flex items-center justify-center transition-colors cursor-pointer",
                  isDragging ? "border-primary bg-primary/5" : "border-muted bg-muted/30",
                  !displayLogoUrl && "border-dashed hover:border-muted-foreground/50"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                {displayLogoUrl ? (
                  <>
                    <Image
                      src={displayLogoUrl}
                      alt="Business Logo"
                      fill
                      className="object-cover"
                      unoptimized={!!previewUrl}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="h-6 w-6 text-white" />
                    </div>
                  </>
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground/50" />
                )}

                {hasNewImage && (
                  <div className="absolute bottom-0 inset-x-0 bg-green-500/90 h-1.5" />
                )}
              </div>

              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Business Logo</h4>
                    <p className="text-xs text-muted-foreground">Appears on your invoices and documents.</p>
                  </div>
                  {hasNewImage && (
                    <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-1 rounded-full animate-in fade-in slide-in-from-left-2">
                      Ready to save
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 text-xs"
                  >
                    {displayLogoUrl ? 'Change Logo' : 'Upload Logo'}
                  </Button>

                  {displayLogoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="h-8 text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </Button>
                  )}

                  <span className="text-[10px] text-muted-foreground ml-auto hidden sm:inline-block">
                    Max 5MB • Square recommended
                  </span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Business Details */}
            <div className="grid md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl><Input placeholder="Your Company LLC" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gstNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST Number (Optional)</FormLabel>
                    <FormControl><Input placeholder="Your GSTIN" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Email</FormLabel>
                    <FormControl><Input type="email" placeholder="contact@yourcompany.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Phone</FormLabel>
                    <FormControl><Input placeholder="+1 (555) 123-4567" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="invoicePrefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Prefix</FormLabel>
                    <FormControl><Input placeholder="INV-" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business State (for GST)</FormLabel>
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
            </div>
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl><Textarea placeholder="123 Business Rd, Suite 400, Businesstown" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <Button type="submit" disabled={isSaving} className="ml-auto">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? 'Saving...' : 'Save Business Profile'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
