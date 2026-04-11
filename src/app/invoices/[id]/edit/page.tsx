
"use client";

import React, { useEffect, useState } from "react";
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import type { Invoice, Customer, Product, AppSettings } from "@/lib/mockData";
import { PageHeader } from "@/components/shared/PageHeader";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { doc, getDoc, collection, query, getDocs, Timestamp } from "firebase/firestore";

export default function EditInvoicePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null | undefined>(undefined);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        setLoading(true);
        try {
          // Fetch the specific invoice
          const invoiceDocRef = doc(db, `users/${user.uid}/invoices`, invoiceId);
          const invoiceSnap = await getDoc(invoiceDocRef);

          if (!invoiceSnap.exists()) {
            toast({ variant: "destructive", title: "Not Found", description: "Invoice not found." });
            setInvoice(null);
            setLoading(false);
            return;
          }
          
          const data = invoiceSnap.data();
          const fetchedInvoice: Invoice = {
            id: invoiceSnap.id,
            ...data,
            issueDate: (data.issueDate as Timestamp).toDate().toISOString(),
            dueDate: (data.dueDate as Timestamp).toDate().toISOString(),
          } as Invoice;
          setInvoice(fetchedInvoice);

          // Fetch all customers
          const customersCollectionRef = collection(db, `users/${user.uid}/customers`);
          const customersSnapshot = await getDocs(query(customersCollectionRef));
          setCustomers(customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));

          // Fetch all products
          const productsCollectionRef = collection(db, `users/${user.uid}/products`);
          const productsSnapshot = await getDocs(query(productsCollectionRef));
          setProducts(productsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name,
              description: data.description || '',
              price: data.price,
              mrp: data.mrp ?? undefined,
              stock: data.stock === null ? Infinity : data.stock,
              unit: data.unit || '',
              hsnCode: data.hsnCode || '',
              gstRate: data.gstRate || 0,
            } as Product;
          }));

          // Fetch settings
          const settingsDocRef = doc(db, `users/${user.uid}/settings`, 'appSettings');
          const settingsSnap = await getDoc(settingsDocRef);
          if (settingsSnap.exists()) {
            setSettings(settingsSnap.data() as AppSettings);
          }


        } catch (error) {
          console.error("Failed to fetch data:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load invoice and related data." });
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
        title="Edit Invoice"
        description={`Modify invoice ${invoice.invoiceNumber}.`}
      />
      <InvoiceForm 
        initialData={invoice} 
        customers={customers} 
        products={products} 
        settings={settings}
        currentUser={currentUser} 
      />
    </div>
  );
}
