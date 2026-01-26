
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { type Product, type AppSettings } from '@/lib/mockData';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, getDocs, doc, deleteDoc, getDoc } from "firebase/firestore";
import { motion, AnimatePresence } from 'framer-motion';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Eye, Loader2, Package, DollarSign, AlertTriangle, PackageCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/shared/EmptyState';
import { useToast } from '@/hooks/use-toast';
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
import { getCurrencySymbol } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import Image from 'next/image';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
    }
  }
};

export function ProductList({ searchTerm }: { searchTerm: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const isMobile = useIsMobile();

  const currencySymbol = getCurrencySymbol(settings?.invoiceSettings?.currency);

  const fetchProductsAndSettings = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const productsCollectionRef = collection(db, `users/${userId}/products`);
      const q = query(productsCollectionRef);
      const querySnapshot = await getDocs(q);
      const userProducts: Product[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description || "",
          price: data.price,
          stock: data.stock === null ? Infinity : data.stock,
          unit: data.unit || "",
        };
      });
      setProducts(userProducts);

      const settingsDocRef = doc(db, `users/${userId}/settings`, 'appSettings');
      const settingsSnap = await getDoc(settingsDocRef);
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as AppSettings);
      }

    } catch (error) {
      console.error("Failed to fetch products and settings:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load products and settings." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        fetchProductsAndSettings(user.uid);
      } else {
        setLoading(false);
        setProducts([]);
        setSettings(null);
      }
    });
    return () => unsubscribe();
  }, [fetchProductsAndSettings]);

  const stats = useMemo(() => {
    const totalStockValue = products.reduce((acc, p) => {
        if (p.stock !== Infinity && p.stock > 0) {
            return acc + (p.price * p.stock);
        }
        return acc;
    }, 0);
    const lowStockItems = products.filter(p => p.stock !== Infinity && p.stock > 0 && p.stock < 10).length;
    const outOfStockItems = products.filter(p => p.stock === 0).length;

    return { totalStockValue, lowStockItems, outOfStockItems };
  }, [products]);

  const handleEdit = (id: string) => router.push(`/products/${id}/edit`);
  const handleDeleteClick = (product: Product) => setProductToDelete(product);
  
  const confirmDelete = async () => {
    if (!productToDelete || !currentUser) return;
    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/products`, productToDelete.id));
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      toast({ title: "Product Deleted", description: `"${productToDelete.name}" has been deleted.` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not delete product." });
    } finally {
      setProductToDelete(null);
    }
  };
  
  const handleViewDetails = (product: Product) => {
    alert(`Details for ${product.name}:\nPrice: ${currencySymbol}${product.price}\nStock: ${product.stock === Infinity ? 'N/A' : product.stock}\nUnit: ${product.unit || 'N/A'}`);
  };

  const filteredProducts = useMemo(() => products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  ), [products, searchTerm]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading products...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <EmptyState
        title="Please Log In"
        description="Log in to manage your products and services."
      >
        <Image 
          src="https://placehold.co/300x240.png"
          width={300}
          height={240}
          alt="Login illustration"
          data-ai-hint="authentication security"
        />
      </EmptyState>
    );
  }

  if (products.length === 0 && searchTerm === '') {
    return (
      <EmptyState
        title="No Products or Services Yet"
        description="Start by adding your first product or service."
        actionText="Add New Product/Service"
        actionLink="/products/new"
      >
        <Image 
          src="https://placehold.co/300x240.png"
          width={300}
          height={240}
          alt="Inventory management illustration"
          data-ai-hint="inventory management"
        />
      </EmptyState>
    );
  }

  const renderActions = (product: Product) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleViewDetails(product)}><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEdit(product.id)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDeleteClick(product)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="space-y-4">
        <motion.div
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
        >
            <motion.div variants={itemVariants}>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{products.length}</div>
                    </CardContent>
                </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{currencySymbol}{stats.totalStockValue.toFixed(2)}</div>
                    </CardContent>
                </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.lowStockItems}</div>
                    </CardContent>
                </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                        <PackageCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.outOfStockItems}</div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>

        <AnimatePresence>
            {filteredProducts.length > 0 ? (
              isMobile ? (
                 <motion.div
                  className="space-y-4"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                    {filteredProducts.map((product) => (
                       <motion.div key={product.id} variants={itemVariants}>
                         <Card onClick={() => handleViewDetails(product)} className="cursor-pointer">
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                              <CardTitle className="text-base font-medium">{product.name}</CardTitle>
                              {renderActions(product)}
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end justify-between">
                                  <span className="text-lg font-bold text-primary">{currencySymbol}{product.price.toFixed(2)}</span>
                                </div>
                                 <p className="text-xs text-muted-foreground mt-2">
                                  Stock: <span className="font-semibold">{product.stock === Infinity ? 'Unlimited' : product.stock}</span> | Unit: <span className="font-semibold">{product.unit || 'N/A'}</span>
                                </p>
                            </CardContent>
                         </Card>
                       </motion.div>
                    ))}
                </motion.div>
              ) : (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg border overflow-hidden shadow-sm bg-card"
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <motion.tbody variants={containerVariants} initial="hidden" animate="visible">
                      {filteredProducts.map((product) => (
                        <motion.tr
                          key={product.id}
                          variants={itemVariants}
                          layout
                          whileHover={{ scale: 1.02, backgroundColor: "hsl(var(--muted))" }}
                          className="cursor-pointer"
                        >
                          <TableCell className="font-medium" onClick={() => handleViewDetails(product)}>{product.name}</TableCell>
                          <TableCell onClick={() => handleViewDetails(product)}>{currencySymbol}{product.price.toFixed(2)}</TableCell>
                          <TableCell onClick={() => handleViewDetails(product)}>{product.unit || 'N/A'}</TableCell>
                          <TableCell onClick={() => handleViewDetails(product)}>{product.stock === Infinity ? 'N/A' : product.stock}</TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            {renderActions(product)}
                          </TableCell>
                        </motion.tr>
                      ))}
                    </motion.tbody>
                  </Table>
                </motion.div>
              )
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No products found matching your search criteria.</p>
              </div>
            )}
        </AnimatePresence>
      </div>
      
      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product "{productToDelete?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
