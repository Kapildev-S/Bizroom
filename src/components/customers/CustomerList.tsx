
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { type Customer } from '@/lib/mockData';
import { db } from '@/lib/firebase';
import { doc, deleteDoc } from "firebase/firestore";
import { useAuth } from '@/lib/useAuth';
import { useCustomers } from '@/lib/hooks/useData';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Eye, Loader2, Users, Mail, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { useIsMobile } from '@/hooks/use-mobile';
import Image from 'next/image';

export function CustomerList() {
  const router = useRouter();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { customers, mutate: mutateCustomers, isLoading: loading } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const isMobile = useIsMobile();

  const handleEdit = (id: string) => {
    router.push(`/customers/${id}/edit`);
  };

  const handleDeleteClick = (customer: Customer) => {
    setCustomerToDelete(customer);
  };
  
  const confirmDelete = async () => {
    if (!customerToDelete || !currentUser) return;

    try {
      await deleteDoc(doc(db, `users/${currentUser.uid}/customers`, customerToDelete.id));
      mutateCustomers((prev) => prev ? prev.filter(c => c.id !== customerToDelete.id) : prev, false);
      toast({ title: "Customer Deleted", description: `Customer "${customerToDelete.name}" has been deleted.` });
    } catch (error) {
       console.error("Failed to delete customer:", error);
       toast({ variant: "destructive", title: "Error", description: (error as Error).message || "Could not delete customer." });
    } finally {
       setCustomerToDelete(null);
    }
  };
  
  const handleViewDetails = (id: string) => {
    const customer = customers.find(c => c.id === id);
    if(customer) {
        alert(`Details for ${customer.name}:\nEmail: ${customer.email}\nPhone: ${customer.phone}\nAddress: ${customer.address}`);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading customers...</p>
      </div>
    );
  }
  
  if (!currentUser) {
     return (
       <EmptyState
        title="Please Log In"
        description="Log in to manage your customers."
      >
        <Image 
          src="https://placehold.co/300x240.png"
          width={300}
          height={240}
          alt="Login illustration"
          data-ai-hint="authentication security"
        />
       </EmptyState>
     )
  }

  if (customers.length === 0 && searchTerm === '') {
    return (
      <EmptyState
        title="No Customers Yet"
        description="Start by adding your first customer to manage their information and invoices."
        actionText="Add New Customer"
        actionLink="/customers/new"
      >
        <Image 
          src="https://placehold.co/300x240.png"
          width={300}
          height={240}
          alt="Empty customers list illustration"
          data-ai-hint="customers empty"
        />
      </EmptyState>
    );
  }

  const renderActions = (customer: Customer) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleViewDetails(customer.id)}>
          <Eye className="mr-2 h-4 w-4" /> View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEdit(customer.id)}>
          <Edit className="mr-2 h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDeleteClick(customer)} className="text-destructive focus:text-destructive focus:bg-destructive/10">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div className="space-y-4">
        <Input
          placeholder="Search customers by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        {filteredCustomers.length > 0 ? (
          isMobile ? (
             <div className="space-y-4">
              {filteredCustomers.map(customer => (
                <Card key={customer.id}>
                  <CardHeader className="flex flex-row items-start justify-between pb-4">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{customer.name}</CardTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="h-3 w-3" />{customer.email}</p>
                    </div>
                    {renderActions(customer)}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-2"><Phone className="h-3 w-3" />{customer.phone || 'N/A'}</span>
                        <Badge variant="secondary">Joined: {new Date(customer.createdAt).toLocaleDateString()}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden shadow-sm bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Registered On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell>{customer.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{new Date(customer.createdAt).toLocaleDateString()}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {renderActions(customer)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          <div className="text-center py-10">
              <p className="text-muted-foreground">No customers found matching your search criteria.</p>
            </div>
        )}
      </div>
      
      <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the customer "{customerToDelete?.name}" and all associated data.
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
