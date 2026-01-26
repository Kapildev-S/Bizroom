"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Invoice } from "@/lib/mockData";
import { getCurrencySymbol } from "@/lib/utils";
import { Mail, Send } from "lucide-react";
import { useEffect, useState } from "react";

interface EmailPreviewDialogProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  businessName?: string;
}

export function EmailPreviewDialog({ invoice, isOpen, onOpenChange, businessName }: EmailPreviewDialogProps) {
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);


  if (!invoice) return null;

  const subject = `Invoice ${invoice.invoiceNumber} from ${businessName || 'Your Business Name'}`;
  const body = `Dear ${invoice.customerName},\n\nPlease find your invoice attached.\n\nTotal Amount: ${getCurrencySymbol(invoice.currency)}${invoice.totalAmount.toFixed(2)}\nDue Date: ${new Date(invoice.dueDate).toLocaleDateString()}\n\nView your invoice here: ${origin}/invoices/${invoice.id}\n\nThank you for your business!`;

  const handleSend = () => {
    const mailtoLink = `mailto:${invoice.customerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (typeof window !== 'undefined') {
        window.location.href = mailtoLink;
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail /> Email Preview</DialogTitle>
          <DialogDescription>
            This will open in your default email client. You can edit the content before sending.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email-to">To</Label>
            <Input id="email-to" value={invoice.customerEmail} readOnly />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input id="email-subject" value={subject} readOnly />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="email-body">Body</Label>
            <Textarea id="email-body" value={body} readOnly className="min-h-[200px] bg-muted/50" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend}>
            <Send className="mr-2 h-4 w-4" /> Open Email App & Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
