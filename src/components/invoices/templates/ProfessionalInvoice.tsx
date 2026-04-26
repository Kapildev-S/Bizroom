
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
                        <img src={logoDataUri || businessProfile?.logoUrl} alt="Business Logo" width={150} height={60} className="object-contain" crossOrigin="anonymous" onLoad={onImageLoad} onError={onImageError || onImageLoad} />
                    )}
                    <div className="space-y-0">
                        <h2 className="text-xl font-bold">{businessProfile?.businessName || 'Your Company Name'}</h2>
                        {businessProfile?.address && <p className="text-xs opacity-80">{businessProfile.address}</p>}
                        {businessProfile?.phone && <p className="text-xs opacity-80 no-underline">{breakDetection(businessProfile.phone)}</p>}
                        {businessProfile?.email && <p className="text-xs opacity-80 no-underline">{breakDetection(businessProfile.email)}</p>}
                        {businessProfile?.gstNumber && <p className="text-xs font-bold mt-1 opacity-100">GSTIN: {businessProfile.gstNumber}</p>}
                        {businessProfile?.state && <p className="text-[10px] opacity-80">State: {businessProfile.state}</p>}
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
                        <p className="font-semibold text-gray-500 text-sm mb-1 uppercase tracking-wider">BILL TO:</p>
                        <p className="font-bold text-lg uppercase">{invoice.customerName || customer?.name}</p>
                        {(customer?.address || invoice.placeOfSupply) && (
                            <p className="text-gray-600 text-sm whitespace-pre-wrap">{invoice.placeOfSupply || customer?.address}</p>
                        )}
                        {invoice.customerGstin && <p className="text-gray-900 text-sm font-semibold">GSTIN: {invoice.customerGstin}</p>}
                        {(invoice.customerPhone || customer?.phone) && <p className="text-gray-600 text-sm no-underline">Phone: {breakDetection(invoice.customerPhone || customer?.phone)}</p>}
                    </div>
                    <div className="text-right">
                        <div className="grid grid-cols-[auto,1fr] gap-x-4 text-left ml-auto text-sm">
                            <p className="font-semibold text-gray-600">INVOICE #</p>
                            <p className="text-gray-800">{invoice.invoiceNumber}</p>
                            <p className="font-semibold text-gray-600">DATE</p>
                            <p className="text-gray-800">{new Date(invoice.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</p>
                        </div>
                    </div>
                </div>

                {/* Items Table - using the compact version */}
                <table className="w-full text-left text-xs" style={{ tableLayout: 'fixed' }}>
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
                        <tr className="border-b-2 border-gray-300 text-gray-500 uppercase">
                            <th className="p-2 pb-2 font-semibold text-left">Descriptions</th>
                            {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <th className="p-2 pb-2 font-semibold text-left">HSN</th>}
                            <th className="p-2 pb-2 font-semibold text-right">QTY/UNIT</th>
                            <th className="p-2 pb-2 font-semibold text-right">MRP</th>
                            <th className="p-2 pb-2 font-semibold text-right">PRICE</th>
                            {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <th className="p-2 pb-2 font-semibold text-right">GST %</th>}
                            <th className="p-2 pb-2 font-semibold text-right">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.items.map((item, index) => {
                            return (
                                <tr key={index} className="border-b border-gray-200">
                                    <td className="p-2 font-medium">{item.productName}</td>
                                    {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <td className="p-2 font-medium">{item.hsnCode}</td>}
                                    <td className="p-2 text-right">{item.quantity} {item.unit || ''}</td>
                                    <td className="p-2 text-right">{item.mrp ? `${currencySymbol}${item.mrp.toFixed(2)}` : '-'}</td>
                                    <td className="p-2 text-right">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                                    {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <td className="p-2 text-right">{item.gstRate}%</td>}
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
                    {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && (
                        <div className="mb-4">
                            <h4 className="font-bold text-[10px] uppercase mb-1">Tax Summary</h4>
                            <div className="bg-white/10 rounded p-1">
                                <table className="w-full text-[8px] uppercase">
                                    <thead className="border-b border-white/20">
                                        <tr>
                                            <th className="py-0.5 text-left">HSN</th>
                                            <th className="py-0.5 text-right">Value</th>
                                            {invoice.gstType === 'CGST_SGST' ? (
                                                <>
                                                    <th className="py-0.5 text-right">CGST</th>
                                                    <th className="py-0.5 text-right">SGST</th>
                                                </>
                                            ) : (
                                                <th className="py-0.5 text-right">IGST</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {Array.from(new Set(invoice.items.map(item => `${item.hsnCode || 'N/A'}-${item.gstRate || 0}`))).map((key, i) => {
                                            const parts = key.split('-');
                                            const rate = parseInt(parts.pop() || '0');
                                            const hsn = parts.join('-');
                                            
                                            const itemsMatching = invoice.items.filter(item => (item.hsnCode || 'N/A') === hsn && (item.gstRate || 0) === rate);
                                            const taxableValue = itemsMatching.reduce((acc, item) => acc + item.totalPrice, 0);
                                            const taxTotal = itemsMatching.reduce((acc, item) => acc + (item.taxAmount || 0), 0);
                                            return (
                                                <tr key={i} className="border-b border-white/10 last:border-0">
                                                    <td className="py-0.5">{hsn || 'N/A'} ({rate}%)</td>
                                                    <td className="py-0.5 text-right">{taxableValue.toFixed(2)}</td>
                                                    {invoice.gstType === 'CGST_SGST' ? (
                                                        <>
                                                            <td className="py-0.5 text-right">{(taxTotal/2).toFixed(2)}</td>
                                                            <td className="py-0.5 text-right">{(taxTotal/2).toFixed(2)}</td>
                                                        </>
                                                    ) : (
                                                        <td className="py-0.5 text-right">{taxTotal.toFixed(2)}</td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {invoice.reverseCharge && <p className="text-[8px] font-bold mt-1 uppercase italic">Reverse Charge: Yes</p>}
                        </div>
                    )}
                    {invoice.notes && (
                        <>
                            <h4 className="font-bold text-xs mb-1 uppercase">Notes:</h4>
                            <p className="text-[10px] whitespace-pre-wrap mb-2">{invoice.notes}</p>
                        </>
                    )}
                    {invoiceSettings?.footerNote && (
                        <>
                            <h4 className="font-bold text-xs mb-1 uppercase">Terms:</h4>
                            <p className="text-[10px] whitespace-pre-wrap">{invoiceSettings.footerNote}</p>
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
                        {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && invoice.gstType === 'CGST_SGST' ? (
                            <>
                                <div className="flex justify-between text-[10px] opacity-80">
                                    <span>CGST TOTAL</span>
                                    <span>{currencySymbol}{(invoice.taxAmount / 2).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-[10px] opacity-80">
                                    <span>SGST TOTAL</span>
                                    <span>{currencySymbol}{(invoice.taxAmount / 2).toFixed(2)}</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex justify-between">
                                <span>{settings?.invoiceSettings?.enableAdvancedInvoiceSystem ? 'IGST TOTAL' : 'Tax'}</span>
                                <span>{currencySymbol}{invoice.taxAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="w-full h-px my-1" style={{ backgroundColor: headerTextColor, opacity: 0.5 }}></div>
                        <div className="flex justify-between font-bold text-sm">
                            <span>Grand Total</span>
                            <span>{currencySymbol}{invoice.totalAmount.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex justify-end p-6 pt-0">
                <div className="w-48 border-t border-gray-300 text-center pt-2">
                    <p className="text-[10px] font-bold uppercase text-gray-600">Authorized Signatory</p>
                    <p className="text-[9px] text-gray-400">{businessProfile?.businessName}</p>
                </div>
            </div>
        </CardContent>
    );
}
