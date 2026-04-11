
"use client";

import React, { useEffect, useState } from 'react';
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { PageHeader } from "@/components/shared/PageHeader";
import type { Customer, Product, AppSettings } from "@/lib/mockData";
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function NewInvoicePage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [invoiceCount, setInvoiceCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          // Fetch settings FIRST so we can use manual sequence override
          const settingsDocRef = doc(db, `users/${user.uid}/settings`, 'appSettings');
          const settingsSnap = await getDoc(settingsDocRef);
          let fetchedSettings = null;
          if (settingsSnap.exists()) {
            fetchedSettings = settingsSnap.data() as AppSettings;
            setSettings(fetchedSettings);
          }

          // --- Determine the next invoice number preview ---
          // The Firestore counter doc is the single source of truth.
          // settings.page.tsx syncs nextInvoiceSequence into the counter on save,
          // so we only need to read from the counter here.
          const counterDocRef = doc(db, `users/${user.uid}/counters`, 'invoices');
          const counterSnap = await getDoc(counterDocRef);
          let computedCount = 0;

          if (counterSnap.exists() && (counterSnap.data().lastId || 0) > 0) {
            // Counter doc is authoritative — use it directly
            computedCount = counterSnap.data().lastId;
          } else {
            // Counter doc doesn't exist yet: scan existing invoice numbers for the max suffix
            const invoicesCollectionRef = collection(db, `users/${user.uid}/invoices`);
            const invoiceSnapshot = await getDocs(query(invoicesCollectionRef));
            let maxCount = 0;
            invoiceSnapshot.forEach(docSnapshot => {
              const invNum = docSnapshot.data().invoiceNumber;
              if (invNum) {
                const match = invNum.match(/(\d+)$/);
                if (match) {
                  const num = parseInt(match[1], 10);
                  if (num > maxCount) maxCount = num;
                }
              }
            });
            computedCount = maxCount;
          }

          setInvoiceCount(computedCount);
            
          // Fetch customers
          const customersCollectionRef = collection(db, `users/${user.uid}/customers`);
          const customersSnapshot = await getDocs(query(customersCollectionRef));
          const fetchedCustomers = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
          setCustomers(fetchedCustomers);

          // Fetch products
          const productsCollectionRef = collection(db, `users/${user.uid}/products`);
          const productsSnapshot = await getDocs(query(productsCollectionRef));
          const fetchedProducts = productsSnapshot.docs.map(doc => {
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
            } as Product
          });
          setProducts(fetchedProducts);


        } catch (error) {
          console.error("Failed to fetch form data:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load necessary data for creating an invoice." });
        } finally {
          setLoading(false);
        }
      } else {
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [router, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading form data...</p>
      </div>
    );
  }

  return (
    <div>
       <PageHeader 
        title="Create New Invoice"
        description="Fill in the details to generate a new invoice."
      />
      <InvoiceForm 
        customers={customers} 
        products={products} 
        settings={settings} 
        currentUser={currentUser}
        invoiceCount={invoiceCount}
      />
    </div>
  );
}
