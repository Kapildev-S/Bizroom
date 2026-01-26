
"use client";

import React, { useEffect, useState } from "react";
import { CustomerForm } from "@/components/customers/CustomerForm";
import type { Customer } from "@/lib/mockData";
import { PageHeader } from "@/components/shared/PageHeader";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { doc, getDoc, type Timestamp } from "firebase/firestore";

export default function EditCustomerPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null | undefined>(undefined); // undefined: loading, null: not found
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        if (customerId) {
          setLoading(true);
          try {
            const customerDocRef = doc(db, `users/${user.uid}/customers`, customerId);
            const docSnap = await getDoc(customerDocRef);
            
            if (docSnap.exists()) {
              const data = docSnap.data();
              const fetchedCustomer: Customer = {
                id: docSnap.id,
                name: data.name,
                email: data.email,
                phone: data.phone,
                address: data.address,
                createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
              };
              setCustomer(fetchedCustomer);
            } else {
              toast({ variant: "destructive", title: "Not Found", description: "Customer not found." });
              setCustomer(null);
            }
          } catch (error) {
            console.error("Failed to fetch customer:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load customer details." });
            setCustomer(null);
          } finally {
            setLoading(false);
          }
        } else {
          setLoading(false);
          setCustomer(null);
        }
      } else {
        setLoading(false);
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [customerId, router, toast]);

  if (loading || customer === undefined) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading customer data...</p>
      </div>
    );
  }

  if (!customer) {
    return (
       <div>
        <PageHeader 
          title="Customer Not Found"
          description="The customer you are looking for does not exist or you do not have permission to view it."
        />
        <Button onClick={() => router.push('/customers')}>Back to Customers</Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Edit Customer"
        description={`Update the details for ${customer.name}.`}
      />
      <CustomerForm initialData={customer} />
    </div>
  );
}
