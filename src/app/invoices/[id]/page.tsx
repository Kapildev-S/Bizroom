
"use client";

import React, { useEffect, useState } from "react";
import { InvoiceView } from "@/components/invoices/InvoiceView";
import type { Invoice, Customer, AppSettings, BusinessProfile } from "@/lib/mockData";
import { PageHeader } from "@/components/shared/PageHeader";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { doc, getDoc, type Timestamp, updateDoc, setDoc } from "firebase/firestore";
import { getImageAsDataUri } from "@/app/actions/imageActions";

export default function ViewInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoDataUri, setLogoDataUri] = useState<string | null>(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        if (!invoiceId) {
          setLoading(false);
          return;
        }
        setLoading(true);
        const settingsDocRef = doc(db, `users/${user.uid}/settings`, 'appSettings');
        
        const specialUsers: Record<string, { businessName?: string; logoUrl: string }> = {
            '9rTopcIGpZUuoXmKT5wh16ZPGFn2': {
                logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/1.png?alt=media&token=b6937899-163c-4d86-a68c-74d4b36fabbc',
                businessName: 'Malai Unavagam',
            },
            'ZQjI1GM1UFblXixJtfLN8ec8gzw2': {
                logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/2.png?alt=media&token=6e940339-365a-426c-b55d-cfd9ce639eb8',
            },
            'lRHn6d89L0MTxvYZ0iL9KQhK5R73': {
                logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/WhatsApp%20Image%202025-07-07%20at%201.07.10%20PM.jpeg?alt=media&token=9189bbf6-b391-4f55-95b2-f44cea2f3164',
            },
            '3l2SpTceF9Qany7x5IRHdHBPU9J3': {
                logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/Logo.png?alt=media&token=b47e09b3-c628-489d-bfd0-962e67a0a057',
            },
             'aK0m8ztpT0cRHw40HU4ADw50OxL2': {
                logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/WhatsApp%20Image%202025-07-07%20at%201.07.10%20PM.jpeg?alt=media&token=9189bbf6-b391-4f55-95b2-f44cea2f3164',
            },
            'Wn0CV9sO5BaZRt8xPJaNa61nigK2': {
                logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/Brown%20White%20Circle%20Modern%20Cake%20%26%20Bakery%20Brand%20Logo%20(1).png?alt=media&token=3a820f2f-8857-4330-9de9-53a958263895',
            },
            'SpbYDQQ7JGMYY88e9NVIfTtzgWt1': {
                logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/WhatsApp%20Image%202025-07-20%20at%204.48.26%20PM.jpeg?alt=media&token=7c9d65d0-d588-48a9-b688-ce6c0a218d4a',
            },
            'atlcR4LjcARBwRH4a2P5qBMEGam1': {
                logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/WhatsApp%20Image%202025-07-20%20at%204.48.26%20PM.jpeg?alt=media&token=7c9d65d0-d588-48a9-b688-ce6c0a218d4a',
            },
        };

        const specialUserData = specialUsers[user.uid];

        try {
          if (specialUserData) {
            const settingsSnap = await getDoc(settingsDocRef);
            const currentProfile = settingsSnap.exists() ? (settingsSnap.data().businessProfile || {}) : {};
            
            const profileUpdate: Partial<BusinessProfile> = {};
            let needsUpdate = false;

            if (currentProfile.logoUrl !== specialUserData.logoUrl) {
                profileUpdate.logoUrl = specialUserData.logoUrl;
                needsUpdate = true;
            }

            if (specialUserData.businessName && currentProfile.businessName !== specialUserData.businessName) {
                profileUpdate.businessName = specialUserData.businessName;
                needsUpdate = true;
            }

            if (needsUpdate) {
                await setDoc(settingsDocRef, { 
                    businessProfile: { 
                        ...currentProfile,
                        ...profileUpdate,
                    } 
                }, { merge: true });
            }
          }

          // Fetch Invoice
          const invoiceDocRef = doc(db, `users/${user.uid}/invoices`, invoiceId);
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

            // Fetch associated customer
            if (data.customerId) {
              const customerDocRef = doc(db, `users/${user.uid}/customers`, data.customerId);
              const customerSnap = await getDoc(customerDocRef);
              if (customerSnap.exists()) {
                setCustomer({ id: customerSnap.id, ...customerSnap.data() } as Customer);
              }
            }
          } else {
            toast({ variant: "destructive", title: "Not Found", description: "Invoice not found." });
            setInvoice(null);
          }
          
          // Fetch the latest, corrected settings
          const finalSettingsSnap = await getDoc(settingsDocRef);
          if (finalSettingsSnap.exists()) {
            const appSettings = finalSettingsSnap.data() as AppSettings;
            setSettings(appSettings);
            if (appSettings.businessProfile?.logoUrl) {
              const dataUri = await getImageAsDataUri(appSettings.businessProfile.logoUrl);
              setLogoDataUri(dataUri);
            }
          }

        } catch (error) {
          console.error("Failed to fetch invoice:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load invoice details." });
          setInvoice(null);
        } finally {
          setLoading(false);
        }
      } else {
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [invoiceId, router, toast]);

  const handleUpdateInvoiceStatus = async (newStatus: Invoice['status']) => {
     if (!currentUser || !invoice) return;
     try {
       const invoiceDocRef = doc(db, `users/${currentUser.uid}/invoices`, invoice.id);
       await updateDoc(invoiceDocRef, { status: newStatus });
       setInvoice(prev => prev ? { ...prev, status: newStatus } : null);
       toast({ title: "Status Updated", description: `Invoice marked as ${newStatus}.` });
     } catch (error) {
       console.error("Failed to update status:", error);
       toast({ variant: "destructive", title: "Error", description: "Could not update invoice status." });
     }
  };

  const handleDeleteInvoice = () => {
    // The actual deletion logic with stock restoration is in InvoiceView.
    // This function just handles the navigation after deletion.
    router.push('/invoices');
  };

  if (loading || invoice === undefined) {
    return (
       <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading invoice data...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
       <div>
        <PageHeader 
          title="Invoice Not Found"
          description="The invoice you are looking for does not exist."
        />
        <Button onClick={() => router.push('/invoices')}>Back to Invoices</Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        className="no-print"
        title={`Invoice ${invoice.invoiceNumber}`}
        description={`Details for invoice issued to ${invoice.customerName}.`}
      />
      <InvoiceView 
        invoice={invoice} 
        customer={customer}
        settings={settings}
        logoDataUri={logoDataUri}
        currentUser={currentUser}
        onUpdateStatus={handleUpdateInvoiceStatus} 
        onDelete={handleDeleteInvoice}
      />
    </div>
  );
}
