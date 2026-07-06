"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FileText, Download, FileSpreadsheet, FileIcon } from 'lucide-react';
import { exportToPDF, exportToExcel, exportToCSV } from '@/lib/exportUtils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Mock data for demonstration purposes
const generateMockData = (type: string) => {
  switch (type) {
    case 'business':
      return Array.from({ length: 15 }).map((_, i) => ({
        id: `BIZ-00${i + 1}`,
        name: `Business ${i + 1}`,
        category: ['Retail', 'F&B', 'Service'][i % 3],
        status: i % 5 === 0 ? 'Suspended' : 'Active',
        joinedAt: new Date(Date.now() - Math.random() * 10000000000).toISOString().split('T')[0],
      }));
    case 'sales':
      return Array.from({ length: 15 }).map((_, i) => ({
        id: `INV-100${i}`,
        business: `Business ${i % 5 + 1}`,
        amount: Math.floor(Math.random() * 5000) + 500,
        date: new Date().toISOString().split('T')[0],
        status: i % 8 === 0 ? 'Refunded' : 'Completed',
      }));
    default:
      return [];
  }
};

export default function ReportsAdminPage() {
  const [activeTab, setActiveTab] = useState('business');
  
  // Data State
  const businessData = generateMockData('business');
  const salesData = generateMockData('sales');

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    let title = '';
    let data: any[] = [];
    let columns: string[] = [];

    if (activeTab === 'business') {
      title = 'Business Report';
      data = businessData;
      columns = ['ID', 'Name', 'Category', 'Status', 'Joined Date'];
    } else if (activeTab === 'sales') {
      title = 'Sales Report';
      data = salesData;
      columns = ['Invoice ID', 'Business', 'Amount', 'Date', 'Status'];
    }

    if (format === 'pdf') {
      const rows = data.map(obj => Object.values(obj));
      exportToPDF(title, columns, rows);
    } else if (format === 'excel') {
      exportToExcel(title, data);
    } else if (format === 'csv') {
      exportToCSV(title, data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports Central</h1>
          <p className="text-muted-foreground mt-1">
            Generate and export platform analytics and operational data.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <FileIcon className="h-4 w-4 mr-2" /> CSV
          </Button>
          <Button variant="outline" onClick={() => handleExport('excel')} className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
          </Button>
          <Button onClick={() => handleExport('pdf')} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>Select a category to view and export the data.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex flex-wrap h-auto mb-6">
              <TabsTrigger value="business">Business Reports</TabsTrigger>
              <TabsTrigger value="sales">Sales & Revenue</TabsTrigger>
              <TabsTrigger value="gst">GST Reports</TabsTrigger>
              <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
              <TabsTrigger value="ai">AI Analytics</TabsTrigger>
              <TabsTrigger value="recharge">BizRecharge</TabsTrigger>
            </TabsList>

            <TabsContent value="business" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businessData.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.id}</TableCell>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.category}</TableCell>
                        <TableCell>{row.status}</TableCell>
                        <TableCell>{row.joinedAt}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="sales" className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Amount (₹)</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.id}</TableCell>
                        <TableCell>{row.business}</TableCell>
                        <TableCell>{row.amount}</TableCell>
                        <TableCell>{row.date}</TableCell>
                        <TableCell>{row.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* Other tabs would follow same pattern, omitted for brevity but UI is established */}
            {['gst', 'subscriptions', 'ai', 'recharge'].map(tab => (
              <TabsContent key={tab} value={tab}>
                <div className="p-8 text-center border rounded-lg border-dashed text-muted-foreground flex flex-col items-center justify-center min-h-[300px]">
                  <FileText className="h-10 w-10 text-muted-foreground/50 mb-4" />
                  <p>Select a date range to generate the {tab.toUpperCase()} report.</p>
                  <Button variant="outline" className="mt-4">Generate Report</Button>
                </div>
              </TabsContent>
            ))}

          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
