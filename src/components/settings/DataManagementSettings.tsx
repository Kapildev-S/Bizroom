
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Trash2, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, query, Timestamp } from 'firebase/firestore';
import JSZip from 'jszip';
import type { Invoice, InvoiceItem } from '@/lib/mockData';

// Helper function to convert an array of objects to a CSV string
function convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
        return '';
    }

    const CsvValue = (value: any): string => {
        if (value === null || value === undefined) {
            return '';
        }
        if (typeof value === 'object') {
            value = JSON.stringify(value);
        }
        let stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            stringValue = stringValue.replace(/"/g, '""');
            return `"${stringValue}"`;
        }
        return stringValue;
    };

    const headers = Object.keys(data[0]);
    const headerRow = headers.join(',');
    const rows = data.map(row => {
        return headers.map(header => CsvValue(row[header])).join(',');
    });
    return [headerRow, ...rows].join('\r\n');
}


export default function DataManagementSettings() {
    const [isExporting, setIsExporting] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [resetConfirmation, setResetConfirmation] = useState("");
    const { toast } = useToast();

    const handleExportData = async () => {
        const user = auth.currentUser;
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in to export data.' });
            return;
        }

        setIsExporting(true);
        try {
            const zip = new JSZip();

            // Export Customers
            const customersRef = collection(db, `users/${user.uid}/customers`);
            const customersSnap = await getDocs(query(customersRef));
            const customersData = customersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (customersData.length > 0) {
                zip.file("customers.csv", convertToCSV(customersData));
            }

            // Export Products
            const productsRef = collection(db, `users/${user.uid}/products`);
            const productsSnap = await getDocs(query(productsRef));
            const productsData = productsSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    stock: data.stock === null ? 'unlimited' : data.stock,
                };
            });
            if (productsData.length > 0) {
                zip.file("products.csv", convertToCSV(productsData));
            }

            // Export Invoices and Invoice Items
            const invoicesRef = collection(db, `users/${user.uid}/invoices`);
            const invoicesSnap = await getDocs(query(invoicesRef));
            const invoicesData: Omit<Invoice, 'items' | 'id'>[] = [];
            const invoiceItemsData: (InvoiceItem & { invoiceId: string })[] = [];

            invoicesSnap.docs.forEach(doc => {
                const invoice = { id: doc.id, ...doc.data() } as Invoice;
                const { items, id, ...invoiceHeader } = invoice;
                
                const processedInvoiceHeader: any = { id, ...invoiceHeader };
                Object.keys(processedInvoiceHeader).forEach(key => {
                    if (processedInvoiceHeader[key] instanceof Timestamp) {
                        processedInvoiceHeader[key] = processedInvoiceHeader[key].toDate().toISOString();
                    }
                });
                invoicesData.push(processedInvoiceHeader);

                if (items) {
                    items.forEach(item => {
                        invoiceItemsData.push({ invoiceId: doc.id, ...item });
                    });
                }
            });
            
            if (invoicesData.length > 0) {
                zip.file("invoices.csv", convertToCSV(invoicesData));
            }
            if (invoiceItemsData.length > 0) {
                zip.file("invoice_items.csv", convertToCSV(invoiceItemsData));
            }
            
            const zipContent = await zip.generateAsync({ type: "blob" });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(zipContent);
            link.download = `softbills_backup_csv_${new Date().toISOString().split('T')[0]}.zip`;
            link.click();
            URL.revokeObjectURL(link.href);

            toast({ title: 'Export Successful', description: 'Your data has been downloaded as a ZIP file containing CSVs.' });
        } catch (error) {
            console.error('Export failed:', error);
            toast({ variant: 'destructive', title: 'Export Failed', description: 'Could not export your data. Please try again.' });
        } finally {
            setIsExporting(false);
        }
    };

    const handleResetData = () => {
        if (resetConfirmation !== 'RESET ALL DATA') return;
        setIsResetting(true);
        alert("This would permanently delete all your data. This feature is not yet fully implemented for safety.");
        setIsResetting(false);
        setResetConfirmation("");
    };

    return (
        <div className="space-y-8">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Data Management</CardTitle>
                    <CardDescription>Export your application data in CSV format.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    <Button variant="outline" onClick={handleExportData} disabled={isExporting}>
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Export Data (CSV)
                    </Button>
                </CardContent>
            </Card>

            <Card className="shadow-lg border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Reset All Data</CardTitle>
                    <CardDescription>This is a permanent action. All your customers, products, and invoices will be deleted.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AlertDialog onOpenChange={(open) => !open && setResetConfirmation("")}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" /> Reset All Data
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete ALL of your data, including customers, products, and invoices.
                                    <br /><br />
                                    To confirm, please type <strong>RESET ALL DATA</strong> in the box below.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <Input
                                id="delete-confirm"
                                value={resetConfirmation}
                                onChange={(e) => setResetConfirmation(e.target.value)}
                                placeholder="Type RESET ALL DATA to confirm"
                                className="mt-2"
                            />
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={handleResetData}
                                    disabled={resetConfirmation !== 'RESET ALL DATA' || isResetting}
                                    className="bg-destructive hover:bg-destructive/90"
                                >
                                    {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    I understand, reset all my data
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}
