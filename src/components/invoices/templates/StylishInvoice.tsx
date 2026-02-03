
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
                        <h1 className="text-3xl font-bold">{businessProfile?.businessName || 'Your Business Name'}</h1>
                        <p className="opacity-80">{businessProfile?.address || 'Your Business Address'}</p>
                        {businessProfile?.phone && <p className="opacity-80 no-underline">{breakDetection(businessProfile.phone)}</p>}
                        {businessProfile?.email && <p className="opacity-80 no-underline">{breakDetection(businessProfile.email)}</p>}
                    </div>
                    <div className="text-right">
                        <h2 className="text-4xl font-extrabold uppercase">Invoice</h2>
                        <p className="opacity-80">#{invoice.invoiceNumber}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-8 mt-10">
                    <div>
                        <p className="font-bold opacity-80 text-sm">Bill To</p>
                        <p className="font-medium">{invoice.customerName || customer?.name}</p>
                        {(invoice.customerPhone || customer?.phone) && <p className="font-medium no-underline">Phone: {breakDetection(invoice.customerPhone || customer?.phone)}</p>}
                    </div>
                    <div>
                        <p className="font-bold opacity-80 text-sm">Date Issued</p>
                        <p className="font-medium">{new Date(invoice.issueDate).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>

            <div className="p-8">
                <table className="w-full text-left">
                    <thead>
                        <tr>
                            <th className="p-2 pb-4 font-semibold text-gray-700 border-b-2">Descriptions</th>
                            <th className="p-2 pb-4 font-semibold text-gray-700 border-b-2 text-center">QTY</th>
                            <th className="p-2 pb-4 font-semibold text-gray-700 border-b-2 text-right">PRICE</th>
                            <th className="p-2 pb-4 font-semibold text-gray-700 border-b-2 text-right">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item, index) => (
                            <tr key={index}>
                                <td className="p-3 border-b">{item.productName}</td>
                                <td className="p-3 border-b text-center">{item.quantity} {item.unit || ''}</td>
                                <td className="p-3 border-b text-right">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                                <td className="p-3 border-b text-right">{currencySymbol}{item.totalPrice.toFixed(2)}</td>
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
                    <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span><span>{currencySymbol}{invoice.subtotal.toFixed(2)}</span></div>
                    {(invoice.discountAmount || 0) > 0 && <div className="flex justify-between"><span className="text-gray-600">Discount:</span><span>-{currencySymbol}{(invoice.discountAmount || 0).toFixed(2)}</span></div>}
                    <div className="flex justify-between"><span className="text-gray-600">Tax ({(invoice.taxRate * 100).toFixed(0)}%):</span><span>{currencySymbol}{invoice.taxAmount.toFixed(2)}</span></div>
                    <div className="w-full h-px bg-gray-200 my-2"></div>
                    <div className="flex justify-between font-bold text-xl" style={{ color: themeColor }}><span >Total Due:</span><span>{currencySymbol}{invoice.totalAmount.toFixed(2)}</span></div>
                </div>
            </div>
        </CardContent>
    );
}
