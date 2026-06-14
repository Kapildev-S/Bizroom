
"use client";

import React, { useEffect, useState, Suspense } from "react";
import { InvoiceView } from "@/components/invoices/InvoiceView";
import type { Invoice, Customer, AppSettings } from "@/lib/mockData";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { doc, getDoc, type Timestamp } from "firebase/firestore";
import Link from "next/link";
import { BillEaseLogo } from "@/components/icons/BillEaseLogo";
import { getImageAsDataUri } from "@/app/actions/imageActions";

// A simplified version for the public page
function PublicInvoiceView({ invoice, customer, settings, logoDataUri }: { invoice: Invoice, customer: Customer | null, settings: AppSettings | null, logoDataUri: string | null }) {
    return (
        <div className="max-w-4xl mx-auto font-sans relative">
            <InvoiceView
                invoice={invoice}
                customer={customer}
                settings={settings}
                logoDataUri={logoDataUri}
                currentUser={null} // No user is logged in
                onUpdateStatus={() => {}} // No-op
                onDelete={() => {}} // No-op
            />
            <p className="text-center text-xs text-muted-foreground mt-4">This is a secure, read-only view of the invoice.</p>
        </div>
    );
}

function PublicInvoiceComponent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const invoiceId = params.id as string;
  const ownerId = searchParams.get('owner');

  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [logoDataUri, setLogoDataUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicInvoice = async () => {
      if (!invoiceId || !ownerId) {
        setError("The invoice link is invalid.");
        setInvoice(null);
        return;
      }

      try {
        const invoiceDocRef = doc(db, `users/${ownerId}/invoices`, invoiceId);
        const invoiceSnap = await getDoc(invoiceDocRef);

        if (invoiceSnap.exists()) {
          const data = invoiceSnap.data();
          const fetchedInvoice: Invoice = {
            id: invoiceSnap.id,
            ...data,
            issueDate: data.issueDate?.toDate ? data.issueDate.toDate().toISOString() : data.issueDate,
            dueDate: data.dueDate?.toDate ? data.dueDate.toDate().toISOString() : data.dueDate,
          } as Invoice;
          setInvoice(fetchedInvoice);

          if (data.customerId) {
            const customerDocRef = doc(db, `users/${ownerId}/customers`, data.customerId);
            const customerSnap = await getDoc(customerDocRef);
            if (customerSnap.exists()) {
              setCustomer({ id: customerSnap.id, ...customerSnap.data() } as Customer);
            }
          }

          const settingsDocRef = doc(db, `users/${ownerId}/settings`, 'appSettings');
          const settingsSnap = await getDoc(settingsDocRef);
          if (settingsSnap.exists()) {
            const appSettings = settingsSnap.data() as AppSettings;
            setSettings(appSettings);
            if (appSettings.businessProfile?.logoUrl) {
                const dataUri = await getImageAsDataUri(appSettings.businessProfile.logoUrl);
                setLogoDataUri(dataUri);
            }
          }
        } else {
          setError("The invoice link is invalid or the invoice has been deleted.");
          setInvoice(null);
        }
      } catch (err) {
        console.error("Error fetching public invoice:", err);
        setError("An error occurred while trying to load the invoice.");
        setInvoice(null);
      }
    };

    fetchPublicInvoice();
  }, [invoiceId, ownerId]);

  if (invoice === undefined) {
    return (
      <div className="flex flex-col justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading invoice...</p>
      </div>
    );
  }

  if (invoice === null) {
    return (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Invoice Not Found</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button asChild className="mt-6">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  return <PublicInvoiceView invoice={invoice} customer={customer} settings={settings} logoDataUri={logoDataUri} />;
}

export default function PublicInvoicePage() {
    return (
        <div className="min-h-screen bg-muted/50 p-4 sm:p-8 flex flex-col">
            <header className="flex justify-between items-center mb-8">
                 <Link href="/">
                    <BillEaseLogo className="h-8 w-auto" />
                </Link>
                <p className="text-sm text-muted-foreground">Powered by BizRoom</p>
            </header>
            <main className="flex-grow flex items-center justify-center">
                <Suspense fallback={<div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                    <PublicInvoiceComponent />
                </Suspense>
            </main>
        </div>
    );
}
