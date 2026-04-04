"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Invoice, Customer, AppSettings } from '@/lib/mockData';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Edit, Trash2, CreditCard, Loader2, Share2, FileImage } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
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
import { colorOptions } from '@/lib/mockData';
import html2canvas from 'html2canvas';
import { db } from '@/lib/firebase';
import { doc, runTransaction } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { User } from 'firebase/auth';

import ClassicInvoice from './templates/ClassicInvoice';
import ModernInvoice from './templates/ModernInvoice';
import StylishInvoice from './templates/StylishInvoice';
import ProfessionalInvoice from './templates/ProfessionalInvoice';
import GstTaxInvoice from './templates/GstTaxInvoice';
import { getCurrencySymbol } from '@/lib/utils';


interface InvoiceViewProps {
  invoice: Invoice;
  customer: Customer | null;
  settings: AppSettings | null;
  logoDataUri: string | null;
  onUpdateStatus: (newStatus: Invoice['status']) => void;
  onDelete: () => void;
  currentUser: User | null;
}

const getStatusBadgeVariant = (status: Invoice['status']) => {
  switch (status) {
    case 'paid': return 'default';
    case 'sent': return 'secondary';
    case 'overdue': return 'destructive';
    case 'draft': return 'outline';
  }
};

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
};

export const InvoiceView: React.FC<InvoiceViewProps> = ({ invoice, customer, settings, logoDataUri, onUpdateStatus, onDelete, currentUser }) => {
  const { toast } = useToast();
  const invoiceContentRef = useRef<HTMLDivElement>(null);

  // State management
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreparingShare, setIsPreparingShare] = useState(false);
  const [isReadyToShare, setIsReadyToShare] = useState(false);
  const [shareableFile, setShareableFile] = useState<File | null>(null);

  // State for reliable generation
  const [isLogoLoaded, setIsLogoLoaded] = useState(false);
  const [areFontsReady, setAreFontsReady] = useState(false);

  const selectedColorName = settings?.customizationSettings?.themeColor || 'Default';
  const themeColor = colorOptions.find(c => c.name === selectedColorName)?.value || 'hsl(var(--primary))';

  const handleLogoLoad = useCallback(() => {
    setIsLogoLoaded(true);
  }, []);

  useEffect(() => {
    if (!logoDataUri) {
      setIsLogoLoaded(true);
    } else {
      setIsLogoLoaded(false);
    }
  }, [logoDataUri]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    document.fonts.ready.then(() => {
      setAreFontsReady(true);
    }).catch(() => {
      setAreFontsReady(true); // Proceed anyway on error
    });

    // Fallback: set fonts as ready after 1 second anyway to not block the user forever
    timeoutId = setTimeout(() => {
      setAreFontsReady(true);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, []);

  const isReady = isLogoLoaded && areFontsReady;

  const generateImageFile = async (): Promise<File | null> => {
    if (!isReady) {
      toast({ description: "Please wait, preparing document..." });
      return null;
    }

    const input = invoiceContentRef.current;
    if (!input) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not find invoice content to render.' });
      return null;
    }

    // Add a slightly larger delay for mobile to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, isMobileDevice() ? 300 : 100));

    try {
      const isMobile = window.innerWidth <= 768;

      // Safety timeout: Longer for mobile devices (20s vs 10s)
      const timeoutDuration = isMobile ? 20000 : 10000;

      const canvasPromise = html2canvas(input, {
        scale: isMobile ? 1.5 : 2, // Slight increase for mobile quality but stay safe
        useCORS: true,
        logging: false,
        windowWidth: isMobile ? 1024 : 1024, // Use a consistent width for rendering
        allowTaint: true,
        backgroundColor: "#ffffff",
        imageTimeout: 15000, // Give it time to load the logo
        removeContainer: true,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('invoice-content-render');
          if (el) {
            el.style.transform = 'none';
            el.style.margin = '0 auto';
            el.style.padding = '32px';
            el.style.boxShadow = 'none';
            el.style.borderRadius = '0';
          }
        }
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Generation timed out. Please try again.')), timeoutDuration)
      );

      const canvas = await Promise.race([canvasPromise, timeoutPromise]);

      // Use toDataURL as a fallback/alternative for iOS if toBlob fails
      let blob: Blob | null = null;
      try {
        blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.9));
        if (!blob) {
          // Fallback for older Safari or if toBlob fails
          const dataUrl = canvas.toDataURL('image/png');
          const res = await fetch(dataUrl);
          blob = await res.blob();
        }
      } catch (blobError) {
        console.warn("toBlob failed, trying toDataURL fallback", blobError);
        const dataUrl = canvas.toDataURL('image/png');
        const res = await fetch(dataUrl);
        blob = await res.blob();
      }

      if (!blob) {
        throw new Error('Could not create image blob.');
      }

      return new File([blob], `invoice-${invoice.invoiceNumber}.png`, { type: 'image/png' });
    } catch (error: any) {
      console.error("Image generation failed:", error);
      // Show the actual error message on mobile to help debug
      alert(`Debug Error: ${error.message || error}`);
      toast({
        variant: 'destructive',
        title: 'Image Generation Failed',
        description: error.message || 'Unknown error occurred'
      });
      return null;
    }
  };

  const handleDownloadImage = async () => {
    setIsDownloading(true);
    const file = await generateImageFile();
    setIsDownloading(false);

    if (file) {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(file);
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    }
  };

  const handlePrepareShare = async () => {
    setIsPreparingShare(true);
    setIsReadyToShare(false);
    const file = await generateImageFile();
    setIsPreparingShare(false);

    if (file) {
      setShareableFile(file);
      setIsReadyToShare(true);
      toast({ title: 'Invoice Prepared', description: 'Tap "Send Invoice" to finish sharing.' });
    }
  };

  const handleNativeShare = async () => {
    if (!shareableFile) return;
    try {
      const canShare = navigator.canShare ? navigator.canShare({ files: [shareableFile] }) : true;
      if (navigator.share && canShare) {
        await navigator.share({
          files: [shareableFile],
          title: `Invoice ${invoice.invoiceNumber}`,
        });
        setIsReadyToShare(false); // Reset after successful share
      } else {
        // Fallback to download
        handleDownloadImage();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Sharing failed:", error);
        toast({ variant: 'destructive', title: 'Sharing Failed', description: 'Could not share the image.' });
      }
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !invoice) return;
    try {
      await runTransaction(db, async (transaction) => {
        // --- 1. All READS first ---
        const productRefs = invoice.items.map(item => doc(db, `users/${currentUser.uid}/products`, item.productId));
        const productDocSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));

        // --- 2. All WRITES last ---
        for (let i = 0; i < invoice.items.length; i++) {
          const item = invoice.items[i];
          const productRef = productRefs[i];
          const productDoc = productDocSnaps[i];

          if (productDoc.exists()) {
            const productData = productDoc.data();
            if (productData.stock !== null) {
              transaction.update(productRef, { stock: (productData.stock || 0) + item.quantity });
            }
          }
        }
        const invoiceDocRef = doc(db, `users/${currentUser.uid}/invoices`, invoice.id);
        transaction.delete(invoiceDocRef);
      });
      toast({ title: "Invoice Deleted", description: "The invoice has been deleted and stock restored." });
      onDelete();
    } catch (error) {
      console.error("Failed to delete invoice:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not delete the invoice." });
    } finally {
      setIsDeleteDialogOpen(false);
    }
  };

  const template = settings?.customizationSettings?.template || 'classic';
  const paperSize = settings?.customizationSettings?.paperSize || 'A4';

  const getPaperSizeStyle = () => {
    if (paperSize === 'custom' && settings?.customizationSettings?.customWidth) {
      const width = settings.customizationSettings.customWidth;
      const height = settings.customizationSettings.customHeight;
      const unit = settings.customizationSettings.unit || 'in';
      return { 
        width: `${width}${unit}`, 
        minHeight: height ? `${height}${unit}` : 'auto' 
      };
    }
    switch (paperSize) {
      case 'Thermal80': return { width: '80mm', minHeight: '80mm' };
      case 'Thermal58': return { width: '58mm', minHeight: '58mm' };
      case '4x3': return { width: '4in', minHeight: '3in' };
      case '4x6': return { width: '4in', minHeight: '6in' };
      default: return { width: '100%', maxWidth: '800px' };
    }
  };

  const handleLogoError = useCallback(() => {
    console.warn("Logo failed to load");
    setIsLogoLoaded(true); // Proceed anyway
  }, []);

  const renderTemplate = () => {
    const templateProps = {
      invoice,
      customer,
      settings,
      logoDataUri,
      onImageLoad: handleLogoLoad,
      onImageError: handleLogoError
    };

    switch (template) {
      case 'modern':
        return <ModernInvoice {...templateProps} />;
      case 'stylish':
        return <StylishInvoice {...templateProps} />;
      case 'professional':
        return <ProfessionalInvoice {...templateProps} />;
      case 'gst':
        return <GstTaxInvoice {...templateProps} />;
      case 'classic':
      default:
        return <ClassicInvoice {...templateProps} />;
    }
  };

  return (
    <>
      <div id="invoice-content" className="max-w-4xl mx-auto font-sans flex flex-col items-center gap-6 p-4">
        <Card 
          ref={invoiceContentRef} 
          id="invoice-content-render" 
          className="shadow-2xl bg-white text-gray-800"
          style={getPaperSizeStyle()}
        >
          {renderTemplate()}
        </Card>
        
        <div id="invoice-action-buttons" className="w-full max-w-[800px] p-6 flex flex-wrap items-center justify-end gap-3 no-print bg-card border rounded-xl shadow-lg">
          <div className="mr-auto">
            <Badge variant={getStatusBadgeVariant(invoice.status)} className="text-base px-4 py-1 capitalize">
              Status: {invoice.status}
            </Badge>
          </div>
          {invoice.status !== 'paid' && invoice.status !== 'void' && (
            <Button variant="outline" onClick={() => onUpdateStatus('paid')} className="hover:bg-green-500/10 hover:text-green-600 hover:border-green-500">
              <CreditCard className="mr-2 h-4 w-4" /> Mark as Paid
            </Button>
          )}

          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>

          {isReadyToShare ? (
            <Button variant="default" onClick={handleNativeShare} className="gap-2 bg-indigo-600 hover:bg-indigo-700 animate-bounce">
              <Share2 className="h-4 w-4" /> Send Now
            </Button>
          ) : (
            <Button variant="outline" onClick={handlePrepareShare} disabled={isPreparingShare || isDownloading || !isReady}>
              {isPreparingShare ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
              {isPreparingShare ? 'Preparing...' : 'Share Image'}
            </Button>
          )}

          <Button variant="outline" onClick={handleDownloadImage} disabled={isDownloading || isPreparingShare || !isReady}>
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileImage className="mr-2 h-4 w-4" />}
            {isDownloading ? "Generating..." : "Download Image"}
          </Button>

          {(invoice.status === 'draft' || invoice.status === 'sent') && (
            <Button variant="default" asChild style={{ backgroundColor: themeColor }} className="text-primary-foreground">
              <Link href={`/invoices/${invoice.id}/edit`}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Link>
            </Button>
          )}
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} className="gap-2">
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete invoice {invoice.invoiceNumber} and restore stock levels.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
