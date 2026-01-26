
"use client";

import React, { useEffect, useState } from "react";
import { ProductForm } from "@/components/products/ProductForm";
import { type Product } from "@/lib/mockData";
import { PageHeader } from "@/components/shared/PageHeader";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { doc, getDoc } from "firebase/firestore";

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null | undefined>(undefined); // undefined: loading, null: not found
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        if (productId) {
          setLoading(true);
          try {
            const productDocRef = doc(db, `users/${user.uid}/products`, productId);
            const docSnap = await getDoc(productDocRef);

            if (docSnap.exists()) {
               const data = docSnap.data();
               const fetchedProduct: Product = {
                id: docSnap.id,
                name: data.name,
                description: data.description || "",
                price: data.price,
                stock: data.stock === null ? Infinity : data.stock,
                unit: data.unit || "",
              };
              setProduct(fetchedProduct);
            } else {
                toast({ variant: "destructive", title: "Not Found", description: "Product not found."});
                setProduct(null);
            }
          } catch (error) {
            console.error("Failed to fetch product:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load product details."});
            setProduct(null);
          } finally {
            setLoading(false);
          }
        } else {
          setLoading(false);
          setProduct(null);
        }
      } else {
        setLoading(false);
        router.push('/auth/login');
      }
    });
    return () => unsubscribe();
  }, [productId, router, toast]);

  if (loading || product === undefined) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading product data...</p>
      </div>
    );
  }

  if (!product) {
    return (
       <div>
        <PageHeader 
          title="Product Not Found"
          description="The product you are looking for does not exist or you do not have permission to view it."
        />
        <Button onClick={() => router.push('/products')}>Back to Products</Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader 
        title="Edit Product/Service"
        description={`Update the details for ${product.name}.`}
      />
      <ProductForm initialData={product} />
    </div>
  );
}
