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
    case 'void': return 'outline';
    default: return 'secondary';
  }
};

export const InvoiceView: React.FC<InvoiceViewProps> = ({ invoice, customer, settings, logoDataUri, onUpdateStatus, onDelete, currentUser }) => {
  const { toast } = useToast();
  const invoiceContentRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreparingShare, setIsPreparingShare] = useState(false);
  const [shareableFile, setShareableFile] = useState<File | null>(null);
  
  // State for reliable generation
  const [isLogoLoaded, setIsLogoLoaded] = useState(!logoDataUri); 
  const [areFontsReady, setAreFontsReady] = useState(false);
  
  const selectedColorName = settings?.customizationSettings?.themeColor || 'Default';
  const themeColor = colorOptions.find(c => c.name === selectedColorName)?.value || 'hsl(var(--primary))';
  
  const handleLogoLoad = useCallback(() => {
    setIsLogoLoaded(true);
  }, []);

  useEffect(() => {
    document.fonts.ready.then(() => {
      setAreFontsReady(true);
    });
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
    
    // Add a small delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      const canvas = await html2canvas(input, {
        scale: 2, // Use a higher scale for better quality
        useCORS: true, // Important for external images like logos
        logging: false,
        letterRendering: true,
        windowWidth: 1024, // Force a desktop-like width for consistent rendering
        ignoreElements: (element) => element.id === 'invoice-action-buttons',
      });
      
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 0.95)); // Use PNG for better quality and compatibility
      
      if (!blob) {
        throw new Error('Could not create image blob.');
      }
      
      return new File([blob], `invoice-${invoice.invoiceNumber}.png`, { type: 'image/png' });
    } catch (error) {
        console.error("Image generation failed:", error);
        toast({ variant: 'destructive', title: 'Image Generation Failed', description: 'An error occurred while creating the image.' });
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

  const prepareForShare = async () => {
    setIsPreparingShare(true);
    const file = await generateImageFile();
    setIsPreparingShare(false);

    if (file) {
      setShareableFile(file);
    }
  };

  const executeShare = async () => {
    if (!shareableFile) return;

    try {
      if (navigator.share && navigator.canShare({ files: [shareableFile] })) {
        await navigator.share({
          files: [shareableFile],
          title: `Invoice ${invoice.invoiceNumber}`,
        });
      } else {
        toast({ title: 'Cannot Share', description: 'Your browser does not support sharing files.' });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        toast({ variant: 'destructive', title: 'Sharing Failed', description: 'Could not share the image.' });
      }
    } finally {
      setShareableFile(null); // Reset after sharing attempt
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

  const renderTemplate = () => {
    const templateProps = { invoice, customer, settings, logoDataUri, onImageLoad: handleLogoLoad };

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

          {shareableFile ? (
            <Button variant="outline" onClick={executeShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share Now
            </Button>
            ) : (
            <Button variant="outline" onClick={prepareForShare} disabled={isPreparingShare || isDownloading || !isReady}>
                {isPreparingShare ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
                {isPreparingShare ? 'Preparing...' : 'Share as Image'}
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
