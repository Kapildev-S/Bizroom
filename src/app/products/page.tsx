
"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { ProductList } from "@/components/products/ProductList";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Products & Services"
        description="Manage your inventory of goods and services."
      >
        <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md">
          <Link href="/products/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New
          </Link>
        </Button>
      </PageHeader>
      
      <div className="space-y-4">
        <Input
          placeholder="Search products by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <ProductList searchTerm={searchTerm} />
      </div>
    </div>
  );
}
