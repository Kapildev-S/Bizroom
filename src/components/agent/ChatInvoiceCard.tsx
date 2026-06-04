"use client";

import React, { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, type Timestamp } from "firebase/firestore";
import type { Invoice } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Share2,
  Download,
  Eye,
  CheckCircle2,
  Loader2,
  Package,
  User,
  Receipt,
  ExternalLink,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCurrencySymbol } from "@/lib/utils";

interface ChatInvoiceCardProps {
  invoiceId: string;
  invoiceNumber: string;
  userId: string;
}

export default function ChatInvoiceCard({
  invoiceId,
  invoiceNumber,
  userId,
}: ChatInvoiceCardProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const invoiceRef = doc(db, `users/${userId}/invoices`, invoiceId);
        const snap = await getDoc(invoiceRef);
        if (snap.exists()) {
          const data = snap.data();
          setInvoice({
            id: snap.id,
            ...data,
            issueDate: data.issueDate
              ? (data.issueDate as Timestamp).toDate().toISOString()
              : new Date().toISOString(),
            dueDate: data.dueDate
              ? (data.dueDate as Timestamp).toDate().toISOString()
              : new Date().toISOString(),
          } as Invoice);
        }
      } catch (err) {
        console.error("Failed to fetch invoice for chat card:", err);
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId && userId) fetchInvoice();
  }, [invoiceId, userId]);

  const handleShareLink = async () => {
    setIsCopying(true);
    const shareUrl = `${window.location.origin}/invoices/${invoiceId}`;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({
          title: `Invoice #${invoiceNumber}`,
          text: `Check out invoice #${invoiceNumber} for ${invoice?.customerName || "customer"}.`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast({ title: "Link Copied!", description: "Invoice link copied to clipboard." });
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        toast({ variant: "destructive", title: "Error", description: "Could not share link." });
      }
    } finally {
      setIsCopying(false);
    }
  };

  const handleDownloadInvoice = () => {
    setIsDownloading(true);
    // Create a temporary hidden iframe to trigger PDF generation and download
    const iframe = document.createElement("iframe");
    iframe.src = `/invoices/${invoiceId}?download=pdf`;
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    // Automatically clean up after generation
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      setIsDownloading(false);
      toast({
        title: "Generating PDF",
        description: "Your invoice PDF is being prepared and will download shortly.",
      });
    }, 4500);
  };

  const handleOpenInvoice = () => {
    window.open(`/invoices/${invoiceId}`, "_blank");
  };

  const currencySymbol = invoice ? getCurrencySymbol(invoice.currency || "INR") : "₹";

  return (
    <>
      {/* Invoice Card in Chat */}
      <div className="mt-3 rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/30 overflow-hidden shadow-md">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500 dark:bg-emerald-700">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-none">
              Invoice Created!
            </p>
            <p className="text-emerald-100 text-xs mt-0.5">
              #{invoiceNumber}
            </p>
          </div>
          <Badge className="bg-white/20 text-white border-transparent text-xs">
            New
          </Badge>
        </div>

        {/* Invoice Details */}
        <div className="px-4 py-3">
          {loading ? (
            <div className="flex items-center gap-2 py-2 text-emerald-700 dark:text-emerald-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading invoice details...</span>
            </div>
          ) : invoice ? (
            <div className="space-y-2">
              {/* Customer */}
              <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <User className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                <span className="font-medium">{invoice.customerName}</span>
              </div>

              {/* Items */}
              <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Package className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  {invoice.items?.slice(0, 3).map((item, i) => (
                    <div key={i} className="flex justify-between gap-2">
                      <span className="truncate">{item.productName} × {item.quantity}</span>
                      <span className="font-medium flex-shrink-0">
                        {currencySymbol}{(item.totalPrice || 0).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {invoice.items?.length > 3 && (
                    <span className="text-xs text-slate-400">
                      +{invoice.items.length - 3} more items
                    </span>
                  )}
                </div>
              </div>

              {/* Divider + Total */}
              <div className="border-t border-emerald-200 dark:border-emerald-800 pt-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Receipt className="h-3.5 w-3.5" />
                  <span>Total Amount</span>
                </div>
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-400">
                  {currencySymbol}{(invoice.totalAmount || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 py-1">Invoice #{invoiceNumber} saved successfully.</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 px-4 pb-4 flex-wrap">
          <Button
            size="sm"
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
            onClick={() => setIsDialogOpen(true)}
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            View
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-400"
            onClick={handleDownloadInvoice}
            disabled={isDownloading}
            title="Download PDF"
          >
            {isDownloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-400"
            onClick={handleShareLink}
            disabled={isCopying}
            title="Share Link"
          >
            {isCopying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Share2 className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-400"
            onClick={handleOpenInvoice}
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Full Invoice Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl w-[96vw] h-[92vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
          <DialogHeader className="px-5 py-3 border-b bg-gradient-to-r from-emerald-600 to-green-600 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-white text-base font-bold leading-none">
                    Invoice #{invoiceNumber}
                  </DialogTitle>
                  <DialogDescription className="text-emerald-100 text-xs mt-0.5">
                    View, download, print, or share this invoice
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 rounded-xl"
                  onClick={handleOpenInvoice}
                >
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                  Open Full Page
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-white hover:bg-white/20 rounded-xl h-8 w-8"
                  onClick={() => setIsDialogOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>

          {/* Embedded Invoice Page */}
          <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900">
            <iframe
              src={`/invoices/${invoiceId}`}
              className="w-full h-full border-0"
              title={`Invoice ${invoiceNumber}`}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads allow-modals"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
