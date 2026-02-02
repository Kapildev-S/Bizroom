
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

export default function ProfessionalInvoice({ invoice, customer, settings, logoDataUri, onImageLoad, onImageError }: TemplateProps) {
    const currencySymbol = getCurrencySymbol(invoice.currency);
    const businessProfile = settings?.businessProfile;
    const invoiceSettings = settings?.invoiceSettings;
    const selectedColorName = settings?.customizationSettings?.themeColor || 'Default';
    const themeColor = colorOptions.find(c => c.name === selectedColorName)?.value || 'hsl(var(--primary))';

    const headerTextColor = getContrastingTextColor(themeColor);

    const notesBgColor = 'hsl(var(--secondary))';
    const notesTextColor = 'hsl(var(--secondary-foreground))';

    return (
        <CardContent className="p-0 font-sans text-gray-800 bg-white">
            {/* Header */}
            <div className="p-4 flex justify-between items-start" style={{ backgroundColor: themeColor, color: headerTextColor }}>
                <div className="flex items-center gap-4">
                    {(logoDataUri || businessProfile?.logoUrl) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logoDataUri || businessProfile.logoUrl} alt="Business Logo" width={150} height={60} className="object-contain" crossOrigin="anonymous" onLoad={onImageLoad} onError={onImageError || onImageLoad} />
                    )}
                    <div className="space-y-0">
                        <h2 className="text-xl font-bold">{businessProfile?.businessName || 'Your Company Name'}</h2>
                        {businessProfile?.address && <p className="text-xs opacity-80">{businessProfile.address}</p>}
                        {businessProfile?.phone && <p className="text-xs opacity-80 no-underline">{breakDetection(businessProfile.phone)}</p>}
                        {businessProfile?.email && <p className="text-xs opacity-80 no-underline">{breakDetection(businessProfile.email)}</p>}
                    </div>
                </div>
                <div className="text-right">
                    {/* Intentionally empty to follow the instruction of moving the business name */}
                </div>
            </div>

            <div className="p-6">
                {/* Bill To and Invoice Details */}
                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <p className="font-semibold text-gray-500 text-sm mb-1">BILL TO:</p>
                        <p className="font-bold text-lg">{customer?.name || invoice.customerName}</p>
                        {customer?.address && <p className="text-gray-600 text-sm">{customer.address}</p>}
                        {(customer?.phone || invoice.customerPhone) && <p className="text-gray-600 text-sm no-underline">Phone: {breakDetection(customer?.phone || invoice.customerPhone)}</p>}
                    </div>
                    <div className="text-right">
                        <div className="grid grid-cols-[auto,1fr] gap-x-4 text-left ml-auto text-sm">
                            <p className="font-semibold text-gray-600">INVOICE #</p>
                            <p className="text-gray-800">{invoice.invoiceNumber}</p>
                            <p className="font-semibold text-gray-600">DATE</p>
                            <p className="text-gray-800">{new Date(invoice.issueDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                {/* Items Table - using the compact version */}
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="border-b-2 border-gray-300 text-gray-500 uppercase">
                            <th className="p-2 pb-2 font-semibold text-left">Descriptions</th>
                            <th className="p-2 pb-2 font-semibold text-right">QTY/UNIT</th>
                            <th className="p-2 pb-2 font-semibold text-right">PRICE</th>
                            <th className="p-2 pb-2 font-semibold text-right">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item, index) => {
                            return (
                                <tr key={index} className="border-b border-gray-200">
                                    <td className="p-2 font-medium">{item.productName}</td>
                                    <td className="p-2 text-right">{item.quantity} {item.unit || ''}</td>
                                    <td className="p-2 text-right">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                                    <td className="p-2 text-right font-semibold">{currencySymbol}{(item.totalPrice).toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="grid grid-cols-2 mt-8">
                <div className="p-4" style={{ backgroundColor: notesBgColor, color: notesTextColor }}>
                    {invoice.notes && (
                        <>
                            <h4 className="font-bold text-xs mb-1">NOTES:</h4>
                            <p className="text-[10px] whitespace-pre-wrap">{invoice.notes}</p>
                        </>
                    )}
                    {invoiceSettings?.footerNote && (
                        <>
                            <h4 className={`font-bold text-xs mb-1 ${invoice.notes ? 'mt-2' : ''}`}>TERMS:</h4>
                            <p className="text-[10px] whitespace-pre-wrap">{invoiceSettings.footerNote}</p>
                        </>
                    )}
                    {!invoice.notes && !invoiceSettings?.footerNote && (
                        <>
                            <h4 className="font-bold text-xs mb-1">NOTES:</h4>
                            <p className="text-[10px]">Thank you for your business.</p>
                        </>
                    )}
                </div>
                <div className="p-4 flex flex-col justify-center" style={{ backgroundColor: themeColor, color: headerTextColor }}>
                    <div className="space-y-1 text-right w-full text-xs">
                        <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span>{currencySymbol}{invoice.subtotal.toFixed(2)}</span>
                        </div>
                        {(invoice.discountAmount || 0) > 0 && (
                            <div className="flex justify-between">
                                <span>Discount</span>
                                <span>-{currencySymbol}{(invoice.discountAmount || 0).toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span>Tax ({(invoice.taxRate * 100).toFixed(0)}%)</span>
                            <span>{currencySymbol}{invoice.taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="w-full h-px my-1" style={{ backgroundColor: headerTextColor, opacity: 0.5 }}></div>
                        <div className="flex justify-between font-bold text-sm">
                            <span>Total</span>
                            <span>{currencySymbol}{invoice.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </CardContent>
    );
}
