
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

// Helper to determine text color based on HSL background lightness
const getContrastingTextColor = (hslColor: string): string => {
    if (!hslColor || !hslColor.startsWith('hsl')) {
        return 'white'; // Default for hsl(var(...)) or other formats
    }
    try {
        // Extracts the 'L' value from an HSL string like 'hsl(H S% L%)'
        const lightness = parseFloat(hslColor.substring(hslColor.lastIndexOf(' ') + 1));
        return lightness > 55 ? '#1f2937' : '#ffffff'; // Tailwind gray-800 or white
    } catch (e) {
        return 'white'; // Fallback
    }
}

export default function StylishInvoice({ invoice, customer, settings, logoDataUri, onImageLoad, onImageError }: TemplateProps) {
    const currencySymbol = getCurrencySymbol(invoice.currency);
    const businessProfile = settings?.businessProfile;
    const invoiceSettings = settings?.invoiceSettings;
    const selectedColorName = settings?.customizationSettings?.themeColor || 'Default';
    const themeColor = colorOptions.find(c => c.name === selectedColorName)?.value || 'hsl(var(--primary))';

    const headerTextColor = getContrastingTextColor(themeColor);

    return (
        <CardContent className="p-0 font-sans">
            <div className="p-8" style={{ backgroundColor: themeColor, color: headerTextColor }}>
                <div className="flex justify-between items-start">
                    <div className="space-y-0">
                        {(logoDataUri || businessProfile?.logoUrl) &&
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={logoDataUri || businessProfile?.logoUrl} alt="Business Logo" width={100} height={100} className="rounded-lg object-contain bg-white/10 p-2" crossOrigin="anonymous" onLoad={onImageLoad} onError={onImageError || onImageLoad} />
                        }
                        <h1 className="text-3xl font-bold uppercase tracking-tight">{businessProfile?.businessName || 'Your Business Name'}</h1>
                        <p className="opacity-80 text-sm">{businessProfile?.address || 'Your Business Address'}</p>
                        {businessProfile?.phone && <p className="opacity-80 text-sm no-underline">{breakDetection(businessProfile.phone)}</p>}
                        {businessProfile?.email && <p className="opacity-80 text-sm no-underline">{breakDetection(businessProfile.email)}</p>}
                        {businessProfile?.gstNumber && <p className="opacity-100 text-sm font-bold mt-1">GSTIN: {businessProfile.gstNumber}</p>}
                        {businessProfile?.state && <p className="opacity-80 text-[10px]">State: {businessProfile.state}</p>}
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-extrabold uppercase">Invoice</h2>
                        <p className="opacity-80">#{invoice.invoiceNumber}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-8 mt-10">
                    <div>
                        <p className="font-bold opacity-80 text-xs uppercase tracking-widest mb-1">Bill To</p>
                        <p className="font-bold text-lg uppercase">{invoice.customerName || customer?.name}</p>
                        {(customer?.address || invoice.placeOfSupply) && <p className="opacity-80 text-sm">{invoice.placeOfSupply || customer?.address}</p>}
                        {invoice.customerGstin && <p className="opacity-100 text-sm font-bold">GSTIN: {invoice.customerGstin}</p>}
                        {(invoice.customerPhone || customer?.phone) && <p className="font-medium no-underline text-sm">Phone: {breakDetection(invoice.customerPhone || customer?.phone)}</p>}
                    </div>
                    <div>
                        <p className="font-bold opacity-80 text-sm">Date Issued</p>
                        <p className="font-medium">{new Date(invoice.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</p>
                    </div>
                </div>
            </div>

            <div className="p-8">
                <table className="w-full text-left" style={{ tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: '35%' }} />
                        {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <col style={{ width: '12%' }} />}
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '13%' }} />
                        {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <col style={{ width: '10%' }} />}
                        <col style={{ width: '15%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            <th className="p-2 pb-4 font-semibold text-gray-700 border-b-2">Descriptions</th>
                            {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <th className="p-2 pb-4 font-semibold text-gray-700 border-b-2 text-left">HSN</th>}
                            <th className="p-2 pb-4 font-semibold text-gray-700 border-b-2 text-center">QTY</th>
                            <th className="p-2 pb-4 font-semibold text-gray-700 border-b-2 text-right">MRP</th>
                            <th className="p-2 pb-4 font-semibold text-gray-700 border-b-2 text-right">PRICE</th>
                            {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <th className="p-2 pb-4 font-semibold text-gray-700 border-b-2 text-right">GST %</th>}
                            <th className="p-2 pb-4 font-semibold text-gray-700 border-b-2 text-right">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item, index) => (
                            <tr key={index}>
                                <td className="p-3 border-b font-medium">{item.productName}</td>
                                {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <td className="p-3 border-b text-xs text-gray-500">{item.hsnCode}</td>}
                                <td className="p-3 border-b text-center font-medium">{item.quantity} {item.unit || ''}</td>
                                <td className="p-3 border-b text-right font-medium">{item.mrp ? `${currencySymbol}${item.mrp.toFixed(2)}` : '-'}</td>
                                <td className="p-3 border-b text-right font-medium">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                                {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <td className="p-3 border-b text-right font-medium">{item.gstRate}%</td>}
                                <td className="p-3 border-b text-right font-bold text-gray-900 border-l-2 border-transparent" style={{ borderLeftColor: themeColor }}>{currencySymbol}{item.totalPrice.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex justify-between items-start p-8">
                <div className="text-xs text-gray-500 max-w-xs space-y-4">
                    {invoice.notes && (
                        <div>
                            <h4 className="font-bold mb-1 uppercase">Notes</h4>
                            <p className="whitespace-pre-wrap">{invoice.notes}</p>
                        </div>
                    )}
                    {invoiceSettings?.footerNote && (
                        <div>
                            <h4 className="font-bold mb-1 uppercase">Terms & Conditions</h4>
                            <p className="whitespace-pre-wrap">{invoiceSettings.footerNote}</p>
                        </div>
                    )}
                </div>
                <div className="w-full max-w-sm text-right space-y-2 ml-auto">
                    <div className="flex justify-between font-medium"><span className="text-gray-500">Subtotal:</span><span className="text-gray-900">{currencySymbol}{invoice.subtotal.toFixed(2)}</span></div>
                    {(invoice.discountAmount || 0) > 0 && <div className="flex justify-between font-medium text-red-600"><span >Discount:</span><span>-{currencySymbol}{(invoice.discountAmount || 0).toFixed(2)}</span></div>}
                    {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && invoice.gstType === 'CGST_SGST' ? (
                        <>
                            <div className="flex justify-between font-medium text-[10px] text-gray-500"><span>CGST TOTAL:</span><span>{currencySymbol}{(invoice.taxAmount / 2).toFixed(2)}</span></div>
                            <div className="flex justify-between font-medium text-[10px] text-gray-500"><span>SGST TOTAL:</span><span>{currencySymbol}{(invoice.taxAmount / 2).toFixed(2)}</span></div>
                        </>
                    ) : (
                        <div className="flex justify-between font-medium text-gray-500"><span>{settings?.invoiceSettings?.enableAdvancedInvoiceSystem ? 'IGST TOTAL:' : 'Tax:'}</span><span>{currencySymbol}{invoice.taxAmount.toFixed(2)}</span></div>
                    )}
                    <div className="w-full h-[2px] my-2" style={{ backgroundColor: themeColor }}></div>
                    <div className="flex justify-between font-extrabold text-2xl uppercase tracking-tighter" style={{ color: themeColor }}><span >Total Due</span><span>{currencySymbol}{invoice.totalAmount.toFixed(2)}</span></div>
                    <div className="mt-12 flex flex-col items-end">
                        <div className="w-48 border-t-2 border-gray-900 pt-2 text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-900">Authorized Signatory</p>
                            <p className="text-[9px] font-medium text-gray-400 mt-0.5">{businessProfile?.businessName}</p>
                        </div>
                    </div>
                </div>
            </div>
        </CardContent>
    );
}
