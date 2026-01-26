
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
}

export default function ModernInvoice({ invoice, customer, settings, logoDataUri, onImageLoad }: TemplateProps) {
    const currencySymbol = getCurrencySymbol(invoice.currency);
    const businessProfile = settings?.businessProfile;
    const invoiceSettings = settings?.invoiceSettings;
    const selectedColorName = settings?.customizationSettings?.themeColor || 'Default';
    const themeColor = colorOptions.find(c => c.name === selectedColorName)?.value || 'hsl(var(--primary))';
    
    return (
        <CardContent className="p-8 font-sans text-gray-800">
            {/* Header Section */}
            <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                     {(logoDataUri || businessProfile?.logoUrl) &&
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoDataUri || businessProfile.logoUrl} alt="Business Logo" width={120} height={120} className="rounded-md object-contain" crossOrigin="anonymous" onLoad={onImageLoad} />
                    }
                    <div className="space-y-0">
                        <h2 className="font-bold text-xl">{businessProfile?.businessName || 'Your Business Name'}</h2>
                        {businessProfile?.address && <p className="text-gray-600 text-sm">{businessProfile.address}</p>}
                        {businessProfile?.phone && <p className="text-gray-600 text-sm">{businessProfile.phone}</p>}
                        {businessProfile?.email && <p className="text-gray-600 text-sm">{businessProfile.email}</p>}
                    </div>
                </div>
                <div className="text-right">
                    <h1 className="text-3xl font-bold uppercase" style={{ color: themeColor }}>Invoice</h1>
                </div>
            </div>

            <div className="w-full h-px mb-6" style={{ backgroundColor: themeColor }}></div>

            {/* Billed To and Invoice Details */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                    <p className="font-semibold text-gray-500 text-sm mb-1">Billed To</p>
                    <p className="font-medium text-gray-900">{customer?.name || invoice.customerName}</p>
                    {(customer?.phone || invoice.customerPhone) && <p className="text-gray-600 text-sm">Phone: {customer?.phone || invoice.customerPhone}</p>}
                </div>
                <div className="text-right">
                    <div className="grid grid-cols-[auto,1fr] gap-x-2 text-left ml-auto text-sm">
                        <p className="font-semibold text-gray-600">Invoice #</p>
                        <p className="text-gray-800">{invoice.invoiceNumber}</p>
                        <p className="font-semibold text-gray-600">Date Issued:</p>
                        <p className="text-gray-800">{new Date(invoice.issueDate).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-left text-sm">
              <thead>
                <tr style={{ color: themeColor }}>
                  <th className="p-2 pb-3 font-bold uppercase tracking-wider text-left">Descriptions</th>
                  <th className="p-2 pb-3 font-bold uppercase tracking-wider text-center">QTY</th>
                  <th className="p-2 pb-3 font-bold uppercase tracking-wider text-right">UNIT PRICE</th>
                  <th className="p-2 pb-3 font-bold uppercase tracking-wider text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="p-2 py-3">{item.productName}</td>
                    <td className="p-2 py-3 text-center">{item.quantity} {item.unit || ''}</td>
                    <td className="p-2 py-3 text-right">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                    <td className="p-2 py-3 text-right">{currencySymbol}{item.totalPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Totals Section */}
            <div className="flex justify-end mt-6">
                <div className="w-full max-w-xs space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span className="text-gray-800">{currencySymbol}{invoice.subtotal.toFixed(2)}</span>
                    </div>
                    {(invoice.discountAmount || 0) > 0 && (
                        <div className="flex justify-between text-gray-600">
                            <span>Discount:</span>
                            <span className="text-gray-800">-{currencySymbol}{(invoice.discountAmount || 0).toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between text-gray-600">
                        <span>Tax ({(invoice.taxRate * 100).toFixed(0)}%):</span>
                        <span className="text-gray-800">{currencySymbol}{invoice.taxAmount.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-px bg-gray-300 my-2"></div>
                    <div className="flex justify-between font-bold text-base" style={{ color: themeColor }}>
                        <span>Total:</span>
                        <span>{currencySymbol}{invoice.totalAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            
            <div className="w-full border-t-2 border-black mt-12 pt-6">
                 {(invoice.notes || invoiceSettings?.footerNote) && (
                    <div className="text-xs text-gray-600 space-y-3">
                        {invoice.notes && (
                            <div>
                                <h4 className="font-bold mb-1 text-gray-800 uppercase">Notes</h4>
                                <p className="whitespace-pre-wrap">{invoice.notes}</p>
                            </div>
                        )}
                        {invoiceSettings?.footerNote && (
                            <div>
                                <h4 className="font-bold mb-1 text-gray-800 uppercase">Terms & Conditions</h4>
                                <p className="whitespace-pre-wrap">{invoiceSettings.footerNote}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

        </CardContent>
    );
}
