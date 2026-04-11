
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
            <img src={logoDataUri || businessProfile?.logoUrl} alt="Business Logo" width={120} height={120} className="rounded-md object-contain" crossOrigin="anonymous" onLoad={onImageLoad} onError={onImageError || onImageLoad} />
          }
          <div className="space-y-0">
            <h2 className="font-bold text-xl">{businessProfile?.businessName || 'Your Business Name'}</h2>
            <p className="text-gray-600 text-sm">{businessProfile?.address || 'Your Business Address'}</p>
            {businessProfile?.phone && <p className="text-gray-600 text-sm no-underline">{breakDetection(businessProfile.phone)}</p>}
            {businessProfile?.email && <p className="text-gray-600 text-sm no-underline">{breakDetection(businessProfile.email)}</p>}
            {businessProfile?.gstNumber && <p className="text-gray-900 text-sm font-semibold">GSTIN: {businessProfile.gstNumber}</p>}
            {businessProfile?.state && <p className="text-gray-600 text-sm">State: {businessProfile.state}</p>}
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
          <p className="font-bold uppercase tracking-tight">{invoice.customerName || customer?.name}</p>
          {(customer?.address || invoice.placeOfSupply) && (
            <p className="text-gray-600 text-sm whitespace-pre-wrap">{invoice.placeOfSupply || customer?.address}</p>
          )}
          {invoice.customerGstin && <p className="text-gray-900 text-sm font-semibold">GSTIN: {invoice.customerGstin}</p>}
          {(invoice.customerPhone || customer?.phone) && <p className="text-gray-600 text-sm no-underline">Phone: {breakDetection(invoice.customerPhone || customer?.phone)}</p>}
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
              {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <th className="p-2 font-semibold text-gray-600" style={{ textAlign: 'left' }}>HSN</th>}
              <th className="p-2 font-semibold text-gray-600" style={{ textAlign: 'left' }}>QTY.</th>
              <th className="p-2 font-semibold text-gray-600" style={{ textAlign: 'right' }}>MRP</th>
              <th className="p-2 font-semibold text-gray-600" style={{ textAlign: 'right' }}>RATE</th>
              {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <th className="p-2 font-semibold text-gray-600" style={{ textAlign: 'right' }}>GST %</th>}
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
                  {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <td className="p-2 align-top" style={{ textAlign: 'left' }}>{item.hsnCode}</td>}
                  <td className="p-2 align-top" style={{ textAlign: 'left' }}>{item.quantity} {item.unit || ''}</td>
                  <td className="p-2 align-top" style={{ textAlign: 'right' }}>{item.mrp ? `${currencySymbol}${item.mrp.toFixed(2)}` : '-'}</td>
                  <td className="p-2 align-top" style={{ textAlign: 'right' }}>{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                  {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <td className="p-2 align-top" style={{ textAlign: 'right' }}>{item.gstRate}%</td>}
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
          {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && (
            <div className="space-y-4">
              {/* GST Summary Table */}
              <div className="mt-4 overflow-hidden rounded border border-gray-200">
                <table className="w-full text-[10px] uppercase text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="p-1 px-2 font-bold text-gray-600 border-r border-gray-200">HSN</th>
                      <th className="p-1 px-2 font-bold text-gray-600 border-r border-gray-200 text-right">Value</th>
                      {invoice.gstType === 'CGST_SGST' ? (
                        <>
                          <th className="p-1 px-2 font-bold text-gray-600 border-r border-gray-200 text-right">CGST</th>
                          <th className="p-1 px-2 font-bold text-gray-600 border-r border-gray-200 text-right">SGST</th>
                        </>
                      ) : (
                        <th className="p-1 px-2 font-bold text-gray-600 border-r border-gray-200 text-right">IGST</th>
                      )}
                      <th className="p-1 px-2 font-bold text-gray-600 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Simplified summary by HSN/GST Rate */}
                    {Array.from(new Set(invoice.items.map(item => `${item.hsnCode}-${item.gstRate}`))).map((key, i) => {
                      const [hsn, rateStr] = key.split('-');
                      const rate = parseInt(rateStr);
                      const itemsMatching = invoice.items.filter(item => item.hsnCode === hsn && item.gstRate === rate);
                      const taxableValue = itemsMatching.reduce((acc, item) => acc + item.totalPrice, 0);
                      const taxTotal = itemsMatching.reduce((acc, item) => acc + (item.taxAmount || 0), 0);
                      
                      return (
                        <tr key={i} className="border-b border-gray-100 last:border-0 font-medium">
                          <td className="p-1 px-2 border-r border-gray-200">{hsn || 'N/A'} ({rate}%)</td>
                          <td className="p-1 px-2 border-r border-gray-200 text-right">{taxableValue.toFixed(2)}</td>
                          {invoice.gstType === 'CGST_SGST' ? (
                            <>
                              <td className="p-1 px-2 border-r border-gray-200 text-right">{(taxTotal/2).toFixed(2)}</td>
                              <td className="p-1 px-2 border-r border-gray-200 text-right">{(taxTotal/2).toFixed(2)}</td>
                            </>
                          ) : (
                            <td className="p-1 px-2 border-r border-gray-200 text-right">{taxTotal.toFixed(2)}</td>
                          )}
                          <td className="p-1 px-2 text-right">{taxTotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {invoice.reverseCharge && (
                <div className="p-2 border border-dashed border-gray-300 rounded bg-gray-50/50">
                  <p className="text-[10px] font-bold text-gray-700 italic flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    TAX IS PAYABLE ON REVERSE CHARGE BASIS: YES
                  </p>
                </div>
              )}
            </div>
          )}
          {(invoiceSettings?.footerNote) && (
            <div>
              <h4 className="font-bold text-gray-600 text-xs uppercase tracking-wider">Terms & Conditions</h4>
              <p className="text-gray-500 text-xs whitespace-pre-wrap mt-1">{invoiceSettings.footerNote}</p>
            </div>
          )}
          <div className="pt-10">
            <div className="w-48 border-t border-gray-300 text-center pt-2">
              <p className="text-xs font-bold uppercase text-gray-600">Authorized Signatory</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{businessProfile?.businessName}</p>
            </div>
          </div>
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
          {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && invoice.gstType === 'CGST_SGST' ? (
            <>
              <div className="flex justify-between py-2 px-3 bg-gray-100 border-t border-gray-200">
                <p className="font-semibold text-gray-600 text-[10px]">CGST TOTAL</p>
                <p className="font-semibold">{currencySymbol}{(invoice.taxAmount / 2).toFixed(2)}</p>
              </div>
              <div className="flex justify-between py-2 px-3 bg-gray-100 border-t border-gray-200">
                <p className="font-semibold text-gray-600 text-[10px]">SGST TOTAL</p>
                <p className="font-semibold">{currencySymbol}{(invoice.taxAmount / 2).toFixed(2)}</p>
              </div>
            </>
          ) : (
            <div className="flex justify-between py-2 px-3 bg-gray-100 border-t border-gray-200">
              <p className="font-semibold text-gray-600">{settings?.invoiceSettings?.enableAdvancedInvoiceSystem ? 'IGST TOTAL' : 'TAX'}</p>
              <p className="font-semibold">{currencySymbol}{invoice.taxAmount.toFixed(2)}</p>
            </div>
          )}
          <div className="flex justify-between font-bold text-base py-2 px-3 text-primary-foreground" style={{ backgroundColor: themeColor }}>
            <p>GRAND TOTAL</p>
            <p>{currencySymbol}{invoice.totalAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>
    </CardContent>
  );
}
