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

      // Safety timeout: Longer for mobile devices (15s vs 8s)
      const timeoutDuration = isMobile ? 15000 : 8000;

      // Much lower scale for mobile to prevent timeout
      const canvasPromise = html2canvas(input, {
        scale: isMobile ? 1.0 : 2,
        useCORS: true,
        logging: false, // Disable for performance
        windowWidth: isMobile ? window.innerWidth : 1024,
        allowTaint: false, // Changed to false to prevent tainted canvas errors on export
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: -window.scrollY,
        imageTimeout: 0, // Don't wait for external images
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('invoice-content-render');
          if (el) {
            el.style.transform = 'none';
            el.style.margin = '0';
            el.style.padding = '32px';
            // Ensure font loading in clone if possible, or just rely on main doc
          }
        }
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Generation timed out. Please try again.')), timeoutDuration)
      );

      const canvas = await Promise.race([canvasPromise, timeoutPromise]);

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.95)); // Use PNG for better quality and compatibility

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
      if (navigator.share && navigator.canShare({ files: [shareableFile] })) {
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
        for (const item of invoice.items) {
          const productRef = doc(db, `users/${currentUser.uid}/products`, item.productId);
          const productDoc = await transaction.get(productRef);
          if (productDoc.exists()) {
            const productData = productDoc.data();
            if (productData.stock !== null) {
              transaction.update(productRef, { stock: productData.stock + item.quantity });
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
      case 'classic':
      default:
        return <ClassicInvoice {...templateProps} />;
    }
  };

  return (
    <>
      <div id="invoice-content" className="max-w-4xl mx-auto font-sans">
        <Card ref={invoiceContentRef} id="invoice-content-render" className="shadow-xl bg-white text-gray-800 mx-auto w-full">
          {renderTemplate()}
        </Card>
        <div id="invoice-action-buttons" className="p-6 flex flex-wrap justify-end gap-2 no-print bg-card border rounded-b-lg">
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
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
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
