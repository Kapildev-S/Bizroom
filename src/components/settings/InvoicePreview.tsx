
"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import type { Invoice, Customer, AppSettings } from '@/lib/mockData';
import ClassicInvoice from '../invoices/templates/ClassicInvoice';
import ModernInvoice from '../invoices/templates/ModernInvoice';
import StylishInvoice from '../invoices/templates/StylishInvoice';
import ProfessionalInvoice from '../invoices/templates/ProfessionalInvoice';
import GstTaxInvoice from '../invoices/templates/GstTaxInvoice';

interface InvoicePreviewProps {
  themeColor: string;
  template?: string;
  paperSize?: string;
  customWidth?: number;
  customHeight?: number;
  unit?: string;
}

const SAMPLE_CUSTOMER: Customer = {
  id: 'sample-cust',
  name: 'Sample Customer',
  phone: '9876543210',
  email: 'customer@example.com',
  address: '456 Market Road, Suite 10, Chennai, Tamil Nadu - 600001',
  gstNumber: '33AABBC1234D1Z5',
  balance: 0,
  createdAt: Date.now()
};

const SAMPLE_INVOICE: Invoice = {
  id: 'sample-inv',
  invoiceNumber: 'INV001',
  customerId: 'sample-cust',
  customerName: 'Sample Customer',
  customerPhone: '9876543210',
  customerGstin: '33AABBC1234D1Z5',
  issueDate: new Date().toISOString(),
  dueDate: new Date().toISOString(),
  items: [
    {
      productId: 'p1',
      productName: 'Sample Premium Product',
      quantity: 2,
      unitPrice: 5000,
      gstRate: 18,
      hsnCode: '8517',
      totalPrice: 10000,
      taxAmount: 1800,
      mrp: 6000
    },
    {
      productId: 'p2',
      productName: 'Essential Service',
      quantity: 1,
      unitPrice: 2000,
      gstRate: 12,
      hsnCode: '9983',
      totalPrice: 2000,
      taxAmount: 240,
      mrp: 2500
    }
  ],
  subtotal: 12000,
  taxAmount: 2040,
  totalAmount: 14040,
  discountAmount: 0,
  status: 'sent',
  paymentStatus: 'pending',
  invoiceType: 'Retail',
  gstType: 'CGST_SGST',
  placeOfSupply: 'Tamil Nadu',
  createdAt: Date.now()
};

export default function InvoicePreview({ 
  themeColor, 
  template = 'classic', 
  paperSize = 'A4',
  customWidth,
  customHeight,
  unit = 'in'
}: InvoicePreviewProps) {
  
  const sampleSettings: AppSettings = {
    businessProfile: {
      businessName: 'YOUR BUSINESS NAME',
      phone: '9655613399',
      email: 'info@bizroom.in',
      address: '123 Business Street, Tech Park, Bangalore - 560001',
      gstNumber: '29ABCDE1234F1Z5',
      state: 'Karnataka',
      logoUrl: ''
    },
    invoiceSettings: {
      nextInvoiceNumber: 1,
      invoicePrefix: 'INV',
      defaultDueDateDays: 7,
      footerNote: 'Terms: 1. Goods once sold will not be taken back. 2. Subject to Bangalore Jurisdiction.',
      enableAdvancedInvoiceSystem: true
    },
    customizationSettings: {
      themeColor: 'Default',
      template: template,
      paperSize: paperSize,
      customWidth: customWidth,
      customHeight: customHeight,
      unit: unit as any
    }
  };

  const getContainerStyle = () => {
    let width = '210mm'; 
    let minHeight = '297mm';

    if (paperSize === 'A5') width = '148mm';
    else if (paperSize === 'Thermal80') width = '80mm';
    else if (paperSize === 'Thermal58') width = '58mm';
    else if (paperSize === '4x3') width = '4in';
    else if (paperSize === '4x6') width = '4in';
    else if (paperSize === 'A4_LANDSCAPE') {
      width = '297mm';
      minHeight = '210mm';
    }
    else if (paperSize === 'custom' && customWidth) width = `${customWidth}${unit}`;

    const scaleFactor = 0.55;

    return { 
      width, 
      minHeight,
      transform: `scale(${scaleFactor})`, 
      transformOrigin: 'top center',
      margin: '0 auto',
      backgroundColor: 'white',
      boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
    };
  };

  const renderTemplate = () => {
    const props = {
      invoice: SAMPLE_INVOICE,
      customer: SAMPLE_CUSTOMER,
      settings: sampleSettings,
      logoDataUri: null,
      onImageLoad: () => {}
    };

    switch (template) {
      case 'modern': return <ModernInvoice {...props} />;
      case 'stylish': return <StylishInvoice {...props} />;
      case 'professional': return <ProfessionalInvoice {...props} />;
      case 'gst': return <GstTaxInvoice {...props} />;
      case 'classic':
      default: return <ClassicInvoice {...props} />;
    }
  };

  return (
    <Card className="shadow-inner h-[600px] overflow-hidden bg-slate-50 flex justify-center border-0">
      <div className="relative w-full h-full overflow-y-auto overflow-x-hidden p-6">
        <div className="flex flex-col items-center">
          <div style={getContainerStyle()} className="bg-white rounded-sm">
            {renderTemplate()}
          </div>
          {/* Subtle spacer to account for scaled height and prevent cutoff */}
          <div className="h-[200px] w-full pointer-events-none" />
        </div>
      </div>
    </Card>
  );
}
