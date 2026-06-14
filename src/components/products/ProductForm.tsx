
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Product } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";
import { Package, Archive, Loader2 } from "lucide-react";
import { auth, db, storage } from "@/lib/firebase";
import type { User } from "firebase/auth";
import { addDoc, collection, doc, Timestamp, updateDoc, getDocs, query } from "firebase/firestore";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Image from "next/image";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

const productFormSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters."),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price cannot be negative."),
  pricePerPiece: z.coerce.number().min(0).optional().nullable(),
  pricePerKg: z.coerce.number().min(0).optional().nullable(),
  mrp: z.coerce.number().min(0, "MRP cannot be negative.").optional().nullable(),
  stock: z.coerce.number().min(0, "Stock cannot be negative.").optional().nullable(),
  unit: z.string().optional(),
  hsnCode: z.string().optional(),
  gstRate: z.coerce.number().min(0).max(100).optional().default(0),
  category: z.string().optional(),
  soldBy: z.enum(['piece', 'weight', 'both']).optional().default('piece'),
  imageUrl: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().url("Enter a valid image URL.").optional()
  ),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  initialData?: Product | null; // For editing
}

export function ProductForm({ initialData }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      setCurrentUser(user);
      if (user) {
        try {
          const snap = await getDocs(query(collection(db, `users/${user.uid}/products`)));
          const cats = new Set<string>();
          snap.forEach(d => {
            const cat = d.data().category;
            if (cat) cats.add(cat);
          });
          setCategories(Array.from(cats));
        } catch (e) {
          console.error("Failed to load categories", e);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      stock: initialData.stock === Infinity ? null : initialData.stock,
      mrp: initialData.mrp ?? null,
      unit: initialData.unit || "",
      hsnCode: initialData.hsnCode || "",
      gstRate: initialData.gstRate || 0,
      category: initialData.category || "",
      soldBy: initialData.soldBy || 'piece',
      imageUrl: initialData.imageUrl || "",
      pricePerPiece: initialData.pricePerPiece ?? null,
      pricePerKg: initialData.pricePerKg ?? null,
    } : {
      name: "",
      description: "",
      price: 0,
      mrp: null,
      stock: null,
      unit: "",
      hsnCode: "",
      gstRate: 0,
      category: "",
      soldBy: 'piece',
      imageUrl: "",
      pricePerPiece: null,
      pricePerKg: null,
    },
  });

  const uploadedImageUrl = form.watch("imageUrl")?.trim() || "";

  const handleImagePick = async (file?: File | null) => {
    if (!file) return;
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ variant: "destructive", title: "Invalid file", description: "Please choose an image file." });
      return;
    }

    setIsUploadingImage(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const imageRef = ref(storage, `users/${currentUser.uid}/products/${Date.now()}-${safeName}`);
      const snapshot = await uploadBytes(imageRef, file);
      const downloadUrl = await getDownloadURL(snapshot.ref);
      form.setValue("imageUrl", downloadUrl, { shouldDirty: true, shouldValidate: true });
      toast({ title: "Image uploaded", description: "The product image is ready to save." });
    } catch (error) {
      console.error("Image upload failed:", error);
      toast({ variant: "destructive", title: "Upload failed", description: "Could not upload the image. Please try again." });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const onSubmit = async (values: ProductFormValues) => {
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in." });
      return;
    }
    setIsSubmitting(true);

    const dataToSubmit = {
      name: values.name,
      description: values.description || "",
      price: values.price,
      mrp: values.mrp ?? null,
      stock: values.stock ?? null,
      unit: values.unit || '',
      hsnCode: values.hsnCode || '',
      gstRate: values.gstRate ?? 0,
      category: values.category || "",
      soldBy: values.soldBy || 'piece',
      imageUrl: values.imageUrl?.trim() || "",
      pricePerPiece: values.pricePerPiece ?? null,
      pricePerKg: values.pricePerKg ?? null,
    };

    try {
      if (initialData?.id) {
        const productDocRef = doc(db, `users/${currentUser.uid}/products`, initialData.id);
        await updateDoc(productDocRef, dataToSubmit);
        toast({
          title: "Product Updated",
          description: `${values.name} has been successfully updated.`,
        });
      } else {
        const collectionRef = collection(db, `users/${currentUser.uid}/products`);
        await addDoc(collectionRef, {
          ...dataToSubmit,
          userId: currentUser.uid,
          createdAt: Timestamp.now(),
        });
        toast({
          title: "Product Added",
          description: `${values.name} has been successfully added.`,
        });
      }
      router.push("/products");
      router.refresh();
    } catch (error) {
      console.error("Error submitting product:", error);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: (error as Error).message || "Could not save the product. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary">
          {initialData ? "Edit Product/Service" : "Add New Product/Service"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="e.g. Premium Widget" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (Optional)</FormLabel>
                  <FormControl>
                    <div>
                      <Input placeholder="e.g. Snacks, Beverages, Icecream" {...field} list="category-options" />
                      <datalist id="category-options">
                        {categories.map(cat => (
                          <option key={cat} value={cat} />
                        ))}
                      </datalist>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="imageUrl"
              render={() => (
                <FormItem>
                  <FormLabel>Product Image</FormLabel>
                  <FormControl>
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="relative h-32 w-full overflow-hidden rounded-xl bg-white sm:w-40 sm:flex-shrink-0">
                          {uploadedImageUrl ? (
                            <Image
                              src={uploadedImageUrl}
                              alt={form.watch("name") || "Product preview"}
                              fill
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm font-medium text-gray-400">
                              No image selected
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <p className="text-sm text-gray-600">
                            Upload a product photo and it will automatically appear in POS.
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploadingImage}
                            >
                              {isUploadingImage && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {uploadedImageUrl ? "Change Image" : "Upload Image"}
                            </Button>
                            {uploadedImageUrl && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => form.setValue("imageUrl", "", { shouldDirty: true, shouldValidate: true })}
                                disabled={isUploadingImage}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              void handleImagePick(e.target.files?.[0]);
                              e.currentTarget.value = "";
                            }}
                          />
                          <FormDescription>
                            JPG, PNG, WebP, or GIF. The image is uploaded to Firebase Storage.
                          </FormDescription>
                        </div>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem className={form.watch("soldBy") === 'both' ? 'hidden' : ''}>
                    <FormLabel>Selling Price</FormLabel>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">₹</span>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} className="pl-7" />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mrp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MRP (Optional)</FormLabel>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">₹</span>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)}
                          value={field.value ?? ''}
                          className="pl-7"
                        />
                      </FormControl>
                    </div>
                    <FormDescription>Maximum Retail Price — shown on invoice, no effect on totals.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of Measurement (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a unit (e.g. pcs, kg)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pcs">PCS</SelectItem>
                        <SelectItem value="unt">UNT</SelectItem>
                        <SelectItem value="kg">KG</SelectItem>
                        <SelectItem value="g">G</SelectItem>
                        <SelectItem value="l">L</SelectItem>
                        <SelectItem value="ml">ML</SelectItem>
                        <SelectItem value="m">M</SelectItem>
                        <SelectItem value="box">BOX</SelectItem>
                        <SelectItem value="set">SET</SelectItem>
                        <SelectItem value="dz">DZ</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="soldBy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sold By</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || 'piece'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="How is this sold?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="piece">
                          <span className="flex items-center gap-2">Piece / Unit</span>
                        </SelectItem>
                        <SelectItem value="weight">
                          <span className="flex items-center gap-2">Weight (kg/g)</span>
                        </SelectItem>
                        <SelectItem value="both">
                          <span className="flex items-center gap-2">Both (Piece & Weight)</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {field.value === 'both'
                        ? 'Customer will choose Unit or Weight in POS.'
                        : field.value === 'weight'
                        ? 'Customer will enter grams/kg in POS. Amount is auto-calculated.'
                        : 'Customer adds by unit/piece count.'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {form.watch("soldBy") === 'both' && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pricePerPiece"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Piece</FormLabel>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">₹</span>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} className="pl-7 border-purple-300 bg-purple-50 focus-visible:ring-purple-500" />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pricePerKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Kg</FormLabel>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">₹</span>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)} className="pl-7 border-purple-300 bg-purple-50 focus-visible:ring-purple-500" />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hsnCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>HSN/SAC Code (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 9983" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gstRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default GST % (Optional)</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} value={field.value?.toString() || "0"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select GST %" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="5">5%</SelectItem>
                        <SelectItem value="12">12%</SelectItem>
                        <SelectItem value="18">18%</SelectItem>
                        <SelectItem value="28">28%</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock Quantity</FormLabel>
                  <div className="relative">
                    <Archive className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g. 100 or leave blank for N/A"
                        {...field}
                        onChange={e => field.onChange(e.target.value === '' ? null : +e.target.value)}
                        value={field.value ?? ''}
                        className="pl-10"
                      />
                    </FormControl>
                  </div>
                  <FormDescription>Leave blank for unlimited stock or for services.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detailed description of the product or service..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting || !currentUser}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? "Save Changes" : "Add Product/Service"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
