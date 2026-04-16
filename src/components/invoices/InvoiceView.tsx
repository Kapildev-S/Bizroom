"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Invoice, Customer, AppSettings } from '@/lib/mockData';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer, Edit, Trash2, CreditCard, Loader2, Share2, FileImage, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
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

  // Orientation management
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // State management for dialogs and exports
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isPreparingShare, setIsPreparingShare] = useState(false);
  const [isReadyToShare, setIsReadyToShare] = useState(false);
  const [shareableFile, setShareableFile] = useState<File | null>(null);

  // Inject dynamic @page styles
  useEffect(() => {
    const styleId = 'dynamic-print-styles';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement;
    
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      document.head.appendChild(styleElement);
    }

    const isLandscape = orientation === 'landscape';
    const paperSize = settings?.customizationSettings?.paperSize || 'A4';
    
    let sizeValue = 'A4';
    if (paperSize === 'A5') sizeValue = 'A5';
    else if (paperSize === 'Thermal80') sizeValue = '80mm 297mm';
    else if (paperSize === 'Thermal58') sizeValue = '58mm 297mm';

    styleElement.innerHTML = `
      @media print {
        @page { 
          size: ${sizeValue} ${isLandscape ? 'landscape' : 'portrait'}; 
          margin: 0 !important;
        }
      }
    `;

    return () => {
      // Keep it or clean it - usually better to keep for the duration of the view
    };
  }, [orientation, settings?.customizationSettings?.paperSize]);

  // State for reliable generation
  // State for reliable generation
  const [isLogoLoaded, setIsLogoLoaded] = useState(!logoDataUri);
  const [areFontsReady, setAreFontsReady] = useState(false);

  const selectedColorName = settings?.customizationSettings?.themeColor || 'Default';
  const themeColor = colorOptions.find(c => c.name === selectedColorName)?.value || 'hsl(var(--primary))';

  const handleLogoLoad = useCallback(() => setIsLogoLoaded(true), []);
  const handleLogoError = useCallback(() => setIsLogoLoaded(true), []);

  useEffect(() => {
    if (logoDataUri) setIsLogoLoaded(false);
    else setIsLogoLoaded(true);
  }, [logoDataUri]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const checkFonts = () => {
      if (typeof document !== 'undefined' && document.fonts) {
        document.fonts.ready.then(() => setAreFontsReady(true)).catch(() => setAreFontsReady(true));
      } else {
        setAreFontsReady(true);
      }
    };
    checkFonts();
    timeoutId = setTimeout(() => setAreFontsReady(true), 1500);
    return () => clearTimeout(timeoutId);
  }, []);

  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-fit logic: Calculates the exact scale needed to fit the 280mm invoice into the available screen width
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      
      const availableWidth = containerRef.current.offsetWidth - 48; // Space minus padding
      const targetWidthPx = 280 * 3.7795275591; // 280mm to Pixels at 96dpi
      
      if (availableWidth < targetWidthPx) {
        const newScale = availableWidth / targetWidthPx;
        setScale(Math.max(newScale, 0.4)); // Don't scale below 40% to keep it readable
      } else {
        setScale(1);
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    const timer = setTimeout(updateScale, 500); // Initial adjustment
    
    return () => {
      window.removeEventListener('resize', updateScale);
      clearTimeout(timer);
    };
  }, []);

  const getPaperSizeStyle = () => {
    return { width: '280mm', minHeight: '200mm' };
  };

  const getPaperClass = () => {
    return 'paper-a4-landscape orientation-landscape';
  };

  const isReady = isLogoLoaded && areFontsReady;
  const preparingMessage = !areFontsReady ? "Preparing fonts..." : (!isLogoLoaded ? "Preparing logo..." : "");

  const generateImageFile = async (): Promise<File | null> => {
    if (!isReady) return null;
    const input = document.getElementById('invoice-root');
    if (!input) return null;

    // Snapshot Mode: Reset scale to 1:1 for perfect pixel alignment during capture
    const originalTransform = input.style.transform;
    input.style.transform = 'none';

    try {
      // Ensure we are at the top to avoid capture offset bugs
      window.scrollTo(0, 0);

      const canvas = await html2canvas(input, {
        scale: 3, 
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        allowTaint: true,
      });

      // Restore original scale immediately
      input.style.transform = originalTransform;

      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png', 1.0));
      if (!blob) throw new Error('Could not create image blob.');

      return new File([blob], `invoice-${invoice.invoiceNumber}.png`, { type: 'image/png' });
    } catch (error) {
      console.error("Image generation failed:", error);
      input.style.transform = originalTransform;
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
      link.click();
      URL.revokeObjectURL(link.href);
    }
  };

  const handleDownloadPdf = async () => {
    if (!isReady) return;
    const input = document.getElementById('invoice-root');
    if (!input) return;

    setIsDownloadingPdf(true);
    
    // Snapshot Mode: Reset scale to 1:1
    const originalTransform = input.style.transform;
    input.style.transform = 'none';

    try {
      window.scrollTo(0, 0);

      const canvas = await html2canvas(input, {
        scale: 2, // Slight reduction for PDF size, but scale must be solid
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Restore transform
      input.style.transform = originalTransform;

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'l',
        unit: 'mm',
        format: 'a4'
      });

      pdf.addImage(imgData, 'PNG', 0, 0, 297, 210);
      pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      console.error("PDF failed:", error);
      input.style.transform = originalTransform;
    } finally {
      setIsDownloadingPdf(false);
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
        setIsReadyToShare(false);
      } else {
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
        const productRefs = invoice.items.map(item => doc(db, `users/${currentUser.uid}/products`, item.productId));
        const productDocSnaps = await Promise.all(productRefs.map(ref => transaction.get(ref)));

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
      toast({ title: "Invoice Deleted", description: "The invoice has been deleted." });
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
    const templateProps = {
      invoice,
      customer,
      settings,
      logoDataUri,
      onImageLoad: handleLogoLoad,
      onImageError: handleLogoError
    };

    return (
      <Card 
        id="invoice-root" 
        className={`flex-shrink-0 bg-white shadow-none ring-0 ${getPaperClass()}`}
        style={{
          ...getPaperSizeStyle(),
          transform: `scale(${scale})`,
          transformOrigin: 'top center'
        }} 
      >
        {template === 'gst' ? <GstTaxInvoice {...templateProps} /> : (
          template === 'modern' ? <ModernInvoice {...templateProps} /> : (
            template === 'stylish' ? <StylishInvoice {...templateProps} /> : (
              template === 'professional' ? <ProfessionalInvoice {...templateProps} /> : <ClassicInvoice {...templateProps} />
            )
          )
        )}
      </Card>
    );
  };

  useEffect(() => {
    const isLandscape = orientation === 'landscape' || template === 'gst';
    if (isLandscape) document.body.classList.add('force-landscape');
    else document.body.classList.remove('force-landscape');
    return () => document.body.classList.remove('force-landscape');
  }, [orientation, template]);

  return (
    <>
      <div id="invoice-content" className="w-full flex flex-col items-center gap-8 py-8 animate-in fade-in duration-500">
        
        {/* Paper View Area */}
        <div className="w-full flex justify-center px-4" ref={containerRef}>
          <div 
            className="w-full max-w-full overflow-x-auto pb-10 pt-4 no-print flex justify-center bg-slate-50/50 rounded-3xl border border-slate-100 shadow-inner"
            style={{ minHeight: `${200 * scale}mm` }}
          >
            {renderTemplate()}
          </div>
        </div>

        {/* Hidden Print Area */}
        <div className="hidden print:block">
          {renderTemplate()}
        </div>
        
        {/* Professional Action Bar */}
        <div id="invoice-action-buttons" className="w-full max-w-[1000px] px-4 no-print sticky bottom-6 z-50">
          <Card className="bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl rounded-3xl p-4 flex flex-col md:flex-row items-center gap-6 justify-between overflow-hidden">
            
            <div className="flex items-center gap-5 w-full md:w-auto border-b md:border-b-0 pb-4 md:pb-0 border-slate-100">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold ml-1">Document Status</span>
                <Badge variant={getStatusBadgeVariant(invoice.status)} className="px-4 py-1.5 text-sm font-bold shadow-sm">
                  {invoice.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 w-full md:w-auto">
              {invoice.status !== 'paid' && (
                <Button 
                  variant="outline" 
                  onClick={() => onUpdateStatus('paid')} 
                  className="h-12 px-6 rounded-2xl border-emerald-200 text-emerald-600 hover:bg-emerald-600 hover:text-white font-bold transition-all"
                >
                  <CreditCard className="mr-2 h-5 w-5" /> Paid
                </Button>
              )}

              <Button 
                variant="outline" 
                onClick={() => window.print()}
                className="h-12 px-5 rounded-2xl bg-neutral-900 text-white hover:bg-black font-bold"
              >
                <Printer className="mr-2 h-5 w-5" /> Print
              </Button>

              <div className="h-8 w-px bg-slate-100 mx-1 hidden sm:block"></div>

              {isReadyToShare ? (
                <Button 
                  variant="default" 
                  onClick={handleNativeShare} 
                  className="h-12 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-bold"
                >
                  <Share2 className="h-5 w-5" /> Send
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={handlePrepareShare} 
                  disabled={isPreparingShare || isDownloading || !isReady}
                  className="h-12 px-5 rounded-2xl font-bold border-slate-200"
                >
                  {isPreparingShare ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Share2 className="mr-2 h-5 w-5" />}
                  Share
                </Button>
              )}

              <Button 
                variant="outline" 
                onClick={handleDownloadImage} 
                disabled={isDownloading || !isReady}
                className="h-12 px-5 rounded-2xl font-bold border-slate-200"
              >
                {isDownloading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileImage className="mr-2 h-5 w-5 text-blue-500" />}
                Image
              </Button>

              <Button 
                variant="outline" 
                onClick={handleDownloadPdf} 
                disabled={isDownloadingPdf || !isReady}
                className="h-12 px-5 rounded-2xl font-bold border-slate-200"
              >
                {isDownloadingPdf ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileText className="mr-2 h-5 w-5 text-red-500" />}
                PDF
              </Button>

              <Button variant="default" asChild style={{ backgroundColor: themeColor }} className="h-12 px-4 rounded-2xl shadow-lg">
                <Link href={`/invoices/${invoice.id}/edit`}><Edit className="h-5 w-5" /></Link>
              </Button>

              <Button variant="destructive" size="icon" onClick={() => setIsDeleteDialogOpen(true)} className="h-12 w-12 rounded-2xl">
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove invoice <b>{invoice.invoiceNumber}</b>. This action cannot be reversed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600 rounded-2xl font-bold">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
