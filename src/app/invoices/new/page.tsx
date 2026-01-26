
"use client";

import React, { useEffect, useState } from 'react';
import { InvoiceForm } from "@/components/invoices/InvoiceForm";
import { PageHeader } from "@/components/shared/PageHeader";
import type { Customer, Product, AppSettings } from "@/lib/mockData";
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, getDocs, doc, getDoc,getCountFromServer } from 'firebase/firestore';
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
          const invoicesCollectionRef = collection(db, `users/${user.uid}/invoices`);
          const snapshot = await getCountFromServer(invoicesCollectionRef);
          setInvoiceCount(snapshot.data().count);
            
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
              stock: data.stock === null ? Infinity : data.stock,
              unit: data.unit || '',
            } as Product
          });
          setProducts(fetchedProducts);

          // Fetch settings
          const settingsDocRef = doc(db, `users/${user.uid}/settings`, 'appSettings');
          const settingsSnap = await getDoc(settingsDocRef);
          if (settingsSnap.exists()) {
            setSettings(settingsSnap.data() as AppSettings);
          }

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
