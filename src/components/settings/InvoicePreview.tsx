
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

const getPaperDimensions = (paperSize: string, isLandscape: boolean) => {
  let width = 210; // mm
  let height = 297; // mm
  
  if (paperSize === 'A5') {
    width = isLandscape ? 210 : 148;
    height = isLandscape ? 148 : 210;
  } else if (paperSize === 'Thermal80') {
    width = 80;
    height = 297;
  } else if (paperSize === 'Thermal58') {
    width = 58;
    height = 297;
  } else if (paperSize === '4x3') {
    width = 101.6;
    height = 76.2;
  } else if (paperSize === '4x6') {
    width = 101.6;
    height = 152.4;
  } else if (paperSize === 'A4_LANDSCAPE') {
    width = 297;
    height = 210;
  } else {
    width = isLandscape ? 297 : 210;
    height = isLandscape ? 210 : 297;
  }
  return { width, height };
};

const SAMPLE_CUSTOMER: Customer = {
  id: 'sample-cust',
  name: 'Sample Customer',
  phone: '9876543210',
  email: 'customer@example.com',
  address: '456 Market Road, Suite 10, Chennai, Tamil Nadu - 600001',
  gstin: '33AABBC1234D1Z5',
  createdAt: new Date().toISOString()
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
  invoiceType: 'Retail',
  gstType: 'CGST_SGST',
  placeOfSupply: 'Tamil Nadu',
  currency: 'INR',
  taxRate: 0.18
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
      nextInvoiceSequence: 1,
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
    },
    appearanceSettings: {
      theme: 'light'
    },
    notificationSettings: {
      email: true
    }
  };

  const isLandscape = paperSize === 'A4_LANDSCAPE';
  const baseWidth = isLandscape || (paperSize === '4x3') ? 297 : 210; // mm
  const baseHeight = isLandscape || (paperSize === '4x3') ? 210 : 297; // mm

  const { width: paperWidth, height: paperHeight } = getPaperDimensions(paperSize, isLandscape);
  const paperScale = paperWidth / baseWidth;
  
  const previewScale = 0.55;
  const displayScale = paperScale * previewScale;

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
    <Card className="shadow-inner h-[600px] overflow-hidden bg-slate-50 flex justify-center items-start border-0">
      <div className="relative w-full h-full overflow-y-auto overflow-x-hidden p-6 flex justify-center">
        <div 
          className="flex-shrink-0 bg-transparent rounded-sm"
          style={{
            width: `${paperWidth * previewScale}mm`,
            height: `${paperHeight * previewScale}mm`,
            overflow: 'hidden',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
          }}
        >
          <div
            id="invoice-preview-root"
            className="bg-white"
            style={{
              width: `${baseWidth}mm`,
              minHeight: `${baseHeight}mm`,
              transform: `scale(${displayScale})`,
              transformOrigin: 'top left',
              boxSizing: 'border-box'
            }}
          >
            {renderTemplate()}
          </div>
        </div>
      </div>
    </Card>
  );
}
