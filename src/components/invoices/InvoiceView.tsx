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

const getPaperDimensions = (paperSize: string, isLandscape: boolean) => {
  let width = 210; // mm
  let height = 297; // mm

  if (paperSize === 'A5') {
    width = isLandscape ? 210 : 148;
    height = isLandscape ? 148 : 210;
  } else if (paperSize === 'Thermal80') {
    width = 80;
    height = 297;
  } else if (paperSize === 'Thermal58') {
    width = 58;
    height = 297;
  } else if (paperSize === '4x3') {
    width = 101.6;
    height = 76.2;
  } else if (paperSize === '4x6') {
    width = 101.6;
    height = 152.4;
  } else if (paperSize === 'A4_LANDSCAPE') {
    width = 297;
    height = 210;
  } else {
    width = isLandscape ? 297 : 210;
    height = isLandscape ? 210 : 297;
  }
  return { width, height };
};

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

const isIOSDevice = () => {
  if (typeof window === 'undefined') return false;
  // iPadOS 13+ reports as "MacIntel" but with touch support, unlike real Macs.
  return /iPhone|iPad|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

// Guards against operations that can silently hang instead of rejecting (e.g. the
// iOS canvas.toBlob() bug below) by racing them against a hard timeout, so the UI
// can always recover with an error instead of spinning forever.
const withTimeout = <T,>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(timeoutMessage)), ms)),
  ]);
};

// iOS Safari (and any WebKit-based browser on iOS, since they all share the same
// engine) does not honor the `download` attribute on anchor tags for blob: URLs -
// clicking such a link just silently does nothing or navigates away. The only way
// to let the user save the image there is to open it in a new tab so they can
// long-press -> "Save Image" or "Add to Photos". Also, the object URL must stay
// alive long enough for that new tab to actually load it, so it can't be revoked
// synchronously like on other platforms.
const saveGeneratedFile = (file: File) => {
  const url = URL.createObjectURL(file);

  if (isIOSDevice()) {
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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

    const paperSize = settings?.customizationSettings?.paperSize || 'A4';
    const isLandscape = orientation === 'landscape' || (paperSize === 'A4_LANDSCAPE');

    let sizeValue = 'A4';
    if (paperSize === 'A5') sizeValue = 'A5';
    else if (paperSize === 'Thermal80') sizeValue = '80mm 297mm';
    else if (paperSize === 'Thermal58') sizeValue = '58mm 297mm';
    else if (paperSize === '4x3') sizeValue = '4in 3in';
    else if (paperSize === '4x6') sizeValue = '4in 6in';
    else if (paperSize === 'A4_LANDSCAPE') sizeValue = 'A4 landscape';

    const baseWidth = isLandscape || (paperSize === '4x3') ? 297 : 210;
    const { width: paperWidth } = getPaperDimensions(paperSize, isLandscape);
    const printZoom = paperWidth / baseWidth;

    styleElement.innerHTML = `
      @media print {
        @page {
          size: ${sizeValue} ${isLandscape && paperSize !== 'A4_LANDSCAPE' && paperSize !== '4x3' ? 'landscape' : 'portrait'};
          margin: 0;
        }

        html, body {
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          background: white !important;
        }

        /* Force exact colors */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }

        /* Hide specific UI elements */
        nav, header, footer, aside,
        [data-sidebar], .sidebar,
        .no-print,
        #invoice-content,
        #invoice-action-buttons {
          display: none !important;
        }

        /* Print wrapper: fixed overlay covering the full page */
        .invoice-print-wrapper {
          display: block !important;
          position: fixed !important;
          inset: 0 !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          z-index: 2147483647 !important;
          background: white !important;
          overflow: visible !important;
        }

        /* Invoice container: full width, no extra spacing */
        .invoice-container {
          width: 100% !important;
          min-height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          background: white !important;
        }

        /* Card wrapper: scale the content to fit the target paper size */
        #invoice-print-root {
          display: block !important;
          width: ${baseWidth}mm !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
          transform: none !important;
          box-shadow: none !important;
          border: none !important;
          border-radius: 0 !important;
          background: white !important;
          zoom: ${printZoom} !important;
        }

        /* Prevent double scaling in templates */
        #invoice-root {
          display: block !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
          zoom: 1 !important;
          background: white !important;
        }

        /* Tables full width */
        #invoice-print-root table {
          width: 100% !important;
          border-collapse: collapse !important;
          page-break-inside: auto !important;
        }

        tr {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      }
    `;

    return () => {
      // Keep it
    };
  }, [orientation, settings?.customizationSettings?.paperSize]);

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

  // Auto-fit logic: Calculates the exact scale needed to fit the invoice into the available screen width
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;

      const paperSize = settings?.customizationSettings?.paperSize || 'A4';
      const isLandscape = orientation === 'landscape' || (paperSize === 'A4_LANDSCAPE');
      const { width: paperWidth } = getPaperDimensions(paperSize, isLandscape);

      const availableWidth = containerRef.current.offsetWidth - 48; // Space minus padding
      const targetWidthPx = paperWidth * 3.7795275591; // mm to Pixels at 96dpi

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
  }, [settings?.customizationSettings?.paperSize, orientation]);

  const getPaperClass = () => {
    const paperSize = settings?.customizationSettings?.paperSize || 'A4';
    const isLandscape = orientation === 'landscape' || (paperSize === 'A4_LANDSCAPE');
    return `paper-${paperSize.toLowerCase()} orientation-${isLandscape ? 'landscape' : 'portrait'}`;
  };

  const isReady = isLogoLoaded && areFontsReady;

  const generateImageFile = async (): Promise<File | null> => {
    if (!isReady) return null;
    const input = document.getElementById('invoice-root');
    if (!input) return null;

    const paperSize = settings?.customizationSettings?.paperSize || 'A4';
    const isLandscape = orientation === 'landscape' || (paperSize === 'A4_LANDSCAPE');
    const baseWidth = isLandscape || (paperSize === '4x3') ? 297 : 210;
    const baseHeight = isLandscape || (paperSize === '4x3') ? 210 : 297;

    // Snapshot Mode: Reset scale to 1:1 for perfect pixel alignment during capture
    const originalTransform = input.style.transform;
    input.style.transform = 'none';

    const parent = input.parentElement;
    const originalParentStyle = parent ? parent.getAttribute('style') : null;
    if (parent) {
      parent.style.width = `${baseWidth}mm`;
      parent.style.height = `${baseHeight}mm`;
      parent.style.overflow = 'visible';
    }

    try {
      // Ensure we are at the top to avoid capture offset bugs
      window.scrollTo(0, 0);

      // iOS Safari has much tighter canvas memory/rasterization limits than desktop
      // browsers - a scale of 3 on a full A4/landscape page can silently hang WebKit
      // instead of throwing, which is what caused capture to get stuck loading there.
      const canvas = await withTimeout(
        html2canvas(input, {
          scale: isIOSDevice() ? 2 : 3,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          allowTaint: true,
        }),
        20000,
        'Rendering the invoice took too long.'
      );

      // Restore original styles immediately
      input.style.transform = originalTransform;
      if (parent && originalParentStyle !== null) {
        parent.setAttribute('style', originalParentStyle);
      }

      // canvas.toBlob() has a long-standing WebKit/iOS bug where its callback can
      // simply never fire (the promise hangs forever, which is the "stuck loading"
      // symptom). toDataURL() is synchronous and reliably supported everywhere,
      // including iOS - converting that to a Blob via fetch() avoids toBlob entirely.
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const blob = await withTimeout(fetch(dataUrl).then(res => res.blob()), 10000, 'Could not finalize the image.');

      return new File([blob], `invoice-${invoice.invoiceNumber}.jpg`, { type: 'image/jpeg' });
    } catch (error) {
      console.error("Image generation failed:", error);
      input.style.transform = originalTransform;
      if (parent && originalParentStyle !== null) {
        parent.setAttribute('style', originalParentStyle);
      }
      toast({
        variant: 'destructive',
        title: 'Could not generate invoice image',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
      return null;
    }
  };

  const handleDownloadImage = async () => {
    setIsDownloading(true);
    const file = await generateImageFile();
    setIsDownloading(false);
    if (file) {
      saveGeneratedFile(file);
      if (isIOSDevice()) {
        toast({ title: 'Invoice opened in a new tab', description: 'Press and hold the image, then tap "Add to Photos" or "Save Image" to download it.' });
      }
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
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      // Restore transform
      input.style.transform = originalTransform;

      const imgData = canvas.toDataURL('image/png', 1.0);

      const isLandscape = orientation === 'landscape' || (settings?.customizationSettings?.paperSize === 'A4_LANDSCAPE');
      const paperSize = settings?.customizationSettings?.paperSize || 'A4';
      const { width: pdfWidth, height: pdfHeight } = getPaperDimensions(paperSize, isLandscape);

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? 'l' : 'p',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${invoice.invoiceNumber}.pdf`);
    } catch (error) {
      console.error("PDF failed:", error);
      input.style.transform = originalTransform;
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && isReady) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('download') === 'pdf') {
        const timer = setTimeout(() => {
          handleDownloadPdf();
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [isReady]);

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
      // Try to share the image file directly (works on Android, some iOS versions)
      const canShareFiles = navigator.canShare ? navigator.canShare({ files: [shareableFile] }) : false;

      if (navigator.share && canShareFiles) {
        await navigator.share({
          files: [shareableFile],
          title: `Invoice ${invoice.invoiceNumber}`,
        });
        setIsReadyToShare(false);
        return;
      }

      // If file sharing isn't supported (e.g., older iOS Safari), fall back to opening/
      // downloading the image so the user can save it, then let them share manually.
      saveGeneratedFile(shareableFile);
      if (isIOSDevice()) {
        toast({ title: 'Invoice opened in a new tab', description: 'Press and hold the image to save it, then share it from Photos.' });
      }

      // Then try native share with text only (user can attach the saved image)
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Invoice ${invoice.invoiceNumber}`,
            text: `Invoice ${invoice.invoiceNumber} from BizRoom`,
          });
        } catch (_) {
          // Ignore abort errors
        }
      }

      setIsReadyToShare(false);
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        // Fallback: just download
        handleDownloadImage();
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

  const [contentHeight, setContentHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = document.getElementById('invoice-root');
    if (!el) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContentHeight(entry.target.scrollHeight);
      }
    });
    
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const template = settings?.customizationSettings?.template || 'classic';

  const renderInvoice = (forPrint: boolean = false) => {
    const templateProps = {
      invoice,
      customer,
      settings,
      logoDataUri,
      onImageLoad: handleLogoLoad,
      onImageError: handleLogoError
    };

    const paperSize = settings?.customizationSettings?.paperSize || 'A4';
    const isLandscape = orientation === 'landscape' || (paperSize === 'A4_LANDSCAPE');

    const baseWidth = isLandscape || (paperSize === '4x3') ? 297 : 210;
    const baseHeight = isLandscape || (paperSize === '4x3') ? 210 : 297;

    const { width: paperWidth, height: paperHeight } = getPaperDimensions(paperSize, isLandscape);
    const paperScale = paperWidth / baseWidth;
    const displayScale = paperScale * scale;

    if (forPrint) {
      return (
        <Card
          id="invoice-print-root"
          className={`flex-shrink-0 bg-white shadow-none ring-0 ${getPaperClass()}`}
          style={{
            width: `${baseWidth}mm`,
            minHeight: `${baseHeight}mm`,
            boxSizing: 'border-box'
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
    }

    const mmToPx = 3.7795275591;
    
    return (
      <div
        className="flex-shrink-0 bg-transparent"
        style={{
          width: `${paperWidth * scale}mm`,
          height: contentHeight ? `${contentHeight * displayScale}px` : `${paperHeight * scale}mm`,
          overflow: 'hidden',
          transition: 'height 0.2s ease-out'
        }}
      >
        <Card
          id="invoice-root"
          className={`flex-shrink-0 bg-white shadow-none ring-0 ${getPaperClass()}`}
          style={{
            width: `${baseWidth}mm`,
            minHeight: `${baseHeight}mm`,
            transform: `scale(${displayScale})`,
            transformOrigin: 'top left',
            boxSizing: 'border-box'
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
      </div>
    );
  };

  useEffect(() => {
    const paperSize = settings?.customizationSettings?.paperSize || 'A4';
    const isLandscape = orientation === 'landscape' || (paperSize === 'A4_LANDSCAPE');
    if (isLandscape) document.body.classList.add('force-landscape');
    else document.body.classList.remove('force-landscape');
    return () => document.body.classList.remove('force-landscape');
  }, [orientation, settings?.customizationSettings?.paperSize]);

  const paperSize = settings?.customizationSettings?.paperSize || 'A4';
  const isLandscape = orientation === 'landscape' || (paperSize === 'A4_LANDSCAPE');
  const { height: paperHeight } = getPaperDimensions(paperSize, isLandscape);

  return (
    <>
      <div id="invoice-content" className="w-full flex flex-col items-center gap-8 py-8 animate-in fade-in duration-500">

        {/* Paper View Area */}
        <div className="w-full flex justify-center px-4 no-print" ref={containerRef}>
          <div
            className="w-full max-w-full overflow-x-auto pb-10 pt-4 flex justify-center bg-slate-50/50 rounded-3xl border border-slate-100 shadow-inner"
            style={{
              minHeight: contentHeight ? `${contentHeight * scale}px` : `${paperHeight * 3.7795275591 * scale}px`
            }}
          >
            {renderInvoice(false)}
          </div>
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

      {/* Hidden Print Area - Escaped from Auto-Centering Layout */}
      <div className="invoice-print-wrapper hidden print:block !m-0 !p-0">
        <div className="invoice-container">
          {renderInvoice(true)}
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
