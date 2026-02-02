
import React from 'react';
import type { Invoice, Customer, AppSettings } from '@/lib/mockData';
import { getCurrencySymbol } from '@/lib/utils';
import { colorOptions } from '@/lib/mockData';
import { CardContent } from "@/components/ui/card";

interface TemplateProps {
  invoice: Invoice;
  customer: Customer | null;
  settings: AppSettings | null;
  logoDataUri: string | null;
  onImageLoad: () => void;
  onImageError?: () => void;
}

const breakDetection = (text: string | undefined | null): string => {
  if (!text) return '';
  return text.split('').join('\u200B');
};

export default function ClassicInvoice({ invoice, customer, settings, logoDataUri, onImageLoad, onImageError }: TemplateProps) {
  const currencySymbol = getCurrencySymbol(invoice.currency);
  const businessProfile = settings?.businessProfile;
  const invoiceSettings = settings?.invoiceSettings;
  const selectedColorName = settings?.customizationSettings?.themeColor || 'Default';
  const themeColor = colorOptions.find(c => c.name === selectedColorName)?.value || 'hsl(var(--primary))';

  return (
    <CardContent className="p-8">
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-4">
          {(logoDataUri || businessProfile?.logoUrl) &&
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoDataUri || businessProfile.logoUrl} alt="Business Logo" width={120} height={120} className="rounded-md object-contain" crossOrigin="anonymous" onLoad={onImageLoad} onError={onImageError || onImageLoad} />
          }
          <div className="space-y-0">
            <h2 className="font-bold text-xl">{businessProfile?.businessName || 'Your Business Name'}</h2>
            <p className="text-gray-600 text-sm">{businessProfile?.address || 'Your Business Address'}</p>
            {businessProfile?.phone && <p className="text-gray-600 text-sm no-underline">{breakDetection(businessProfile.phone)}</p>}
            {businessProfile?.email && <p className="text-gray-600 text-sm no-underline">{breakDetection(businessProfile.email)}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="font-bold text-2xl uppercase" style={{ color: themeColor }}>Invoice</h2>
          <p className="text-gray-500">#{invoice.invoiceNumber}</p>
        </div>
      </div>

      <div className="w-full h-[1px] bg-gray-200 my-8"></div>

      <div className="flex justify-between items-start">
        <div className="w-1/2 pr-4">
          <p className="font-semibold text-gray-500 text-sm mb-1">Bill To:</p>
          <p className="font-bold">{customer?.name || invoice.customerName}</p>
          {customer?.address && <p className="text-gray-600 text-sm">{customer.address}</p>}
          {(customer?.phone || invoice.customerPhone) && <p className="text-gray-600 text-sm no-underline">Phone: {breakDetection(customer?.phone || invoice.customerPhone)}</p>}
        </div>
        <div className="w-1/2 pl-4 text-right">
          <div className="grid grid-cols-[auto,1fr] gap-x-4 text-left ml-auto max-w-xs text-sm">
            <p className="text-gray-500">Invoice Date:</p>
            <p className="font-medium text-gray-800">{new Date(invoice.issueDate).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto mt-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 font-semibold text-gray-600" style={{ textAlign: 'left' }}>S.NO.</th>
              <th className="p-2 font-semibold text-gray-600" style={{ textAlign: 'left' }}>Descriptions</th>
              <th className="p-2 font-semibold text-gray-600" style={{ textAlign: 'left' }}>QTY.</th>
              <th className="p-2 font-semibold text-gray-600" style={{ textAlign: 'right' }}>RATE</th>
              <th className="p-2 font-semibold text-gray-600" style={{ textAlign: 'right' }}>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => {
              const itemTotalWithTax = item.totalPrice; // Amount should not include tax here per image.
              return (
                <tr key={index} className="border-b">
                  <td className="p-2 align-top" style={{ textAlign: 'left' }}>{index + 1}</td>
                  <td className="p-2 align-top" style={{ textAlign: 'left' }}>
                    <p className="font-semibold">{item.productName}</p>
                  </td>
                  <td className="p-2 align-top" style={{ textAlign: 'left' }}>{item.quantity} {item.unit || ''}</td>
                  <td className="p-2 align-top" style={{ textAlign: 'right' }}>{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                  <td className="p-2 font-semibold align-top" style={{ textAlign: 'right' }}>{currencySymbol}{itemTotalWithTax.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex w-full items-end justify-between">
        <div className="w-1/2 pr-10 space-y-4">
          {invoice.notes && (
            <div>
              <h4 className="font-bold text-gray-600 text-xs uppercase tracking-wider">Notes</h4>
              <p className="text-gray-500 text-xs whitespace-pre-wrap mt-1">{invoice.notes}</p>
            </div>
          )}
          {(invoiceSettings?.footerNote) && (
            <div>
              <h4 className="font-bold text-gray-600 text-xs uppercase tracking-wider">Terms & Conditions</h4>
              <p className="text-gray-500 text-xs whitespace-pre-wrap mt-1">{invoiceSettings.footerNote}</p>
            </div>
          )}
        </div>

        <div className="w-[40%] max-w-xs space-y-0 text-sm">
          <div className="flex justify-between py-2 px-3 bg-gray-100">
            <p className="font-semibold text-gray-600">SUBTOTAL</p>
            <p className="font-semibold">{currencySymbol}{invoice.subtotal.toFixed(2)}</p>
          </div>
          {(invoice.discountAmount || 0) > 0 && (
            <div className="flex justify-between py-2 px-3 bg-gray-100 border-t border-gray-200">
              <p className="font-semibold text-red-600">DISCOUNT</p>
              <p className="font-semibold text-red-600">-{currencySymbol}{(invoice.discountAmount || 0).toFixed(2)}</p>
            </div>
          )}
          <div className="flex justify-between py-2 px-3 bg-gray-100 border-t border-gray-200">
            <p className="font-semibold text-gray-600">TAX</p>
            <p className="font-semibold">{currencySymbol}{invoice.taxAmount.toFixed(2)}</p>
          </div>
          <div className="flex justify-between font-bold text-base py-2 px-3 text-primary-foreground" style={{ backgroundColor: themeColor }}>
            <p>TOTAL</p>
            <p>{currencySymbol}{invoice.totalAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </CardContent>
  );
}
