
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import type { Invoice, Customer, AppSettings } from '@/lib/mockData';
import ClassicInvoice from '../invoices/templates/ClassicInvoice';
import ModernInvoice from '../invoices/templates/ModernInvoice';
import StylishInvoice from '../invoices/templates/StylishInvoice';
import ProfessionalInvoice from '../invoices/templates/ProfessionalInvoice';
import GstTaxInvoice from '../invoices/templates/GstTaxInvoice';
import { getPaperDimensions, isLandscapePaper } from '@/lib/paperSize';

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

  const isLandscape = isLandscapePaper(paperSize, customWidth, customHeight);
  const baseWidth = isLandscape || (paperSize === '4x3') ? 297 : 210; // mm
  const baseHeight = isLandscape || (paperSize === '4x3') ? 210 : 297; // mm

  const { width: paperWidth, height: paperHeight } = getPaperDimensions(paperSize, isLandscape, customWidth, customHeight, unit);
  const paperScale = paperWidth / baseWidth;

  // Auto-fit: shrink to whatever the panel can actually show instead of a
  // fixed 0.55 - a hardcoded scale could render wider than the panel for
  // landscape/custom paper sizes and get clipped by overflow-x-hidden.
  const mmToPx = 3.7795275591;
  const containerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(0.55);

  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const availableWidth = containerRef.current.offsetWidth - 16; // small breathing room
      const targetWidthPx = paperWidth * mmToPx;
      const fitScale = availableWidth > 0 ? availableWidth / targetWidthPx : 0.55;
      setPreviewScale(Math.min(0.55, fitScale));
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    const timer = setTimeout(updateScale, 300);

    return () => {
      window.removeEventListener('resize', updateScale);
      clearTimeout(timer);
    };
  }, [paperWidth]);

  const displayScale = paperScale * previewScale;

  const renderTemplate = () => {
    const props = {
      invoice: SAMPLE_INVOICE,
      customer: SAMPLE_CUSTOMER,
      settings: sampleSettings,
      logoDataUri: null,
      onImageLoad: () => {},
      pageHeightMm: baseHeight
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
      <div ref={containerRef} className="relative w-full h-full overflow-y-auto overflow-x-hidden p-6 flex justify-center">
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
