
'use client'
import React from 'react';
import type { Invoice, Customer, AppSettings } from '@/lib/mockData';
import { getCurrencySymbol } from '@/lib/utils';
import { colorOptions } from '@/lib/mockData';

// A very basic number to words converter for Indian currency.
const toWords = (num: number): string => {
    const a = ['','one ','two ','three ','four ', 'five ','six ','seven ','eight ','nine ','ten ','eleven ','twelve ','thirteen ','fourteen ','fifteen ','sixteen ','seventeen ','eighteen ','nineteen '];
    const b = ['', '', 'twenty','thirty','forty','fifty', 'sixty','seventy','eighty','ninety'];
    
    const numStr = Math.floor(num).toString();
    if (numStr.length > 9) return 'overflow';

    const n = ('000000000' + numStr).slice(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] !== '00') ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'crore ' : '';
    str += (n[2] !== '00') ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'lakh ' : '';
    str += (n[3] !== '00') ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'thousand ' : '';
    str += (n[4] !== '0') ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'hundred ' : '';
    str += (n[5] !== '00') ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
    return str.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const toWordsRupee = (num: number): string => {
    if (num === 0) return "Zero Rupees Only";
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    let words = toWords(rupees) + ' Rupees';
    if (paise > 0) {
        words += ' and ' + toWords(paise) + ' Paise';
    }
    return words + ' Only';
};

// Helper to determine text color based on HSL background lightness
const getContrastingTextColor = (hslColor: string): string => {
    if (!hslColor || !hslColor.startsWith('hsl')) {
        return 'white'; // Default for hsl(var(...)) or other formats
    }
    try {
        const lightness = parseFloat(hslColor.substring(hslColor.lastIndexOf(' ') + 1));
        return lightness > 55 ? '#1f2937' : '#ffffff'; // Tailwind gray-800 or white
    } catch (e) {
        return 'white'; // Fallback
    }
};

const getLightTint = (hslColor: string): string => {
    if (!hslColor || !hslColor.startsWith('hsl')) {
        return '#f8fafc'; // Default light gray (slate-50)
    }
    try {
        // Replaces the lightness value with a high value for a light tint
        return hslColor.replace(/\s\d+(\.\d+)?%\s*\)/, ' 97%)');
    } catch (e) {
        return '#f8fafc';
    }
};


interface TemplateProps {
  invoice: Invoice;
  customer: Customer | null;
  settings: AppSettings | null;
  logoDataUri: string | null;
  onImageLoad: () => void;
}

export default function StandardInvoice({ invoice, customer, settings, logoDataUri, onImageLoad }: TemplateProps) {
    const currencySymbol = getCurrencySymbol(invoice.currency);
    const businessProfile = settings?.businessProfile;
    const invoiceSettings = settings?.invoiceSettings;
    
    const selectedColorName = settings?.customizationSettings?.themeColor || 'Default';
    const themeColor = colorOptions.find(c => c.name === selectedColorName)?.value || 'hsl(var(--primary))';
    const headerTextColor = getContrastingTextColor(themeColor);
    const lightBgColor = getLightTint(themeColor);

    return (
        <div className="p-4 bg-white text-xs text-black border border-black font-sans">
            <header className="text-center py-2" style={{ backgroundColor: themeColor, color: headerTextColor }}>
                <h1 className="text-xl font-bold">INVOICE</h1>
            </header>
            <div className="text-center py-2 border-l border-r border-black flex justify-center items-center gap-4">
                 {(logoDataUri || businessProfile?.logoUrl) &&
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoDataUri || businessProfile?.logoUrl || ''} alt="Business Logo" width={60} height={60} className="object-contain" crossOrigin="anonymous" onLoad={onImageLoad} />
                }
                <div>
                    <h2 className="text-lg font-bold">{businessProfile?.businessName || 'Business Name'}</h2>
                    <p>{businessProfile?.address || '123 Street, City, State, PIN'}</p>
                    {businessProfile?.phone && <p>Mobile: {businessProfile.phone}</p>}
                    {businessProfile?.gstNumber && <p className="font-bold">GSTIN: {businessProfile.gstNumber}</p>}
                    {businessProfile?.state && <p>State: {businessProfile.state}</p>}
                </div>
            </div>
            <div className="flex justify-between items-start border-y border-black">
                <div className="w-1/2 p-2 border-r border-black" style={{ backgroundColor: lightBgColor }}>
                    <p className="font-bold uppercase">Bill To:</p>
                    <p className="font-bold">{customer?.name || invoice.customerName}</p>
                    {(customer?.address || invoice.placeOfSupply) && <p>{invoice.placeOfSupply || customer?.address}</p>}
                    {invoice.customerGstin && <p className="font-bold">GSTIN: {invoice.customerGstin}</p>}
                    {(customer?.phone || invoice.customerPhone) && <p>Phone: {customer?.phone || invoice.customerPhone}</p>}
                </div>
                <div className="w-1/2 p-2" style={{ backgroundColor: lightBgColor }}>
                    <div className="grid grid-cols-2">
                        <p className="font-bold">INVOICE NO:</p><p>{invoice.invoiceNumber}</p>
                        <p className="font-bold">DATE:</p><p>{new Date(invoice.issueDate).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className="border border-black p-1 text-center font-bold">Descriptions</th>
                        {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <th className="border border-black p-1 text-center font-bold w-20">HSN</th>}
                        <th className="border border-black p-1 text-center font-bold w-12 text-xs">Qty</th>
                        <th className="border border-black p-1 text-center font-bold w-20">MRP</th>
                        <th className="border border-black p-1 text-center font-bold w-20">Rate</th>
                        {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <th className="border border-black p-1 text-center font-bold w-16">GST %</th>}
                        <th className="border border-black p-1 text-center font-bold w-24">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.items.map((item, index) => (
                        <tr key={index}>
                            <td className="border border-black p-1">{item.productName}</td>
                            {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <td className="border border-black p-1 text-center">{item.hsnCode}</td>}
                            <td className="border border-black p-1 text-center">{item.quantity} {item.unit || ''}</td>
                            <td className="border border-black p-1 text-right">{item.mrp ? `${currencySymbol}${item.mrp.toFixed(2)}` : '-'}</td>
                            <td className="border border-black p-1 text-right">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                            {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <td className="border border-black p-1 text-right">{item.gstRate}%</td>}
                            <td className="border border-black p-1 text-right">{currencySymbol}{item.totalPrice.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="flex border-t-0 border border-black">
                 <div className="w-1/2 p-2 border-r border-black flex items-center" style={{ backgroundColor: lightBgColor }}>
                     <p className="font-bold">Thank you for your business.</p>
                </div>
                <div className="w-1/2">
                    <div className="grid grid-cols-[1fr,auto]">
                        <p className="p-1 border-b border-black">Subtotal</p><p className="p-1 border-b border-black text-right">{currencySymbol}{invoice.subtotal.toFixed(2)}</p>
                        {invoice.discountAmount && invoice.discountAmount > 0 && (
                            <React.Fragment>
                                <p className="p-1 border-b border-black text-red-600">Discount</p>
                                <p className="p-1 border-b border-black text-right text-red-600">-{currencySymbol}{(invoice.discountAmount || 0).toFixed(2)}</p>
                            </React.Fragment>
                        )}
                        {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && invoice.gstType === 'CGST_SGST' ? (
                            <>
                                <p className="p-1 border-b border-black text-[10px]">CGST Total</p>
                                <p className="p-1 border-b border-black text-right">{currencySymbol}{(invoice.taxAmount / 2).toFixed(2)}</p>
                                <p className="p-1 border-b border-black text-[10px]">SGST Total</p>
                                <p className="p-1 border-b border-black text-right">{currencySymbol}{(invoice.taxAmount / 2).toFixed(2)}</p>
                            </>
                        ) : (
                            <>
                                <p className="p-1 border-b border-black">{settings?.invoiceSettings?.enableAdvancedInvoiceSystem ? 'IGST Total' : 'Tax'}</p>
                                <p className="p-1 border-b border-black text-right">{currencySymbol}{invoice.taxAmount.toFixed(2)}</p>
                            </>
                        )}
                        <p className="p-1 font-bold" style={{ backgroundColor: themeColor, color: headerTextColor }}>Grand Total</p><p className="p-1 font-bold text-right" style={{ backgroundColor: themeColor, color: headerTextColor }}>{currencySymbol}{invoice.totalAmount.toFixed(2)}</p>
                    </div>
                </div>
            </div>
             <div className="border border-t-0 border-black p-2" style={{ backgroundColor: lightBgColor }}>
                <p><span className="font-bold">Total Amount (In Words) :</span> {toWordsRupee(invoice.totalAmount)}</p>
            </div>
            {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && (
                <div className="border border-t-0 border-black p-2">
                    <p className="font-bold underline mb-1">GST Tax Summary:</p>
                    <table className="w-full border border-black text-[9px] uppercase">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-1 text-center">HSN/SAC</th>
                                <th className="border border-black p-1 text-center">Taxable Value</th>
                                {invoice.gstType === 'CGST_SGST' ? (
                                    <>
                                        <th className="border border-black p-1 text-center">CGST</th>
                                        <th className="border border-black p-1 text-center">SGST</th>
                                    </>
                                ) : (
                                    <th className="border border-black p-1 text-center">IGST</th>
                                )}
                                <th className="border border-black p-1 text-center">Total Tax</th>
                            </tr>
                        </thead>
                        <tbody>
                             {Array.from(new Set(invoice.items.map(item => `${item.hsnCode}-${item.gstRate}`))).map((key, i) => {
                                const [hsn, rateStr] = key.split('-');
                                const rate = parseInt(rateStr);
                                const itemsMatching = invoice.items.filter(item => item.hsnCode === hsn && item.gstRate === rate);
                                const taxableValue = itemsMatching.reduce((acc, item) => acc + item.totalPrice, 0);
                                const taxTotal = itemsMatching.reduce((acc, item) => acc + (item.taxAmount || 0), 0);
                                return (
                                    <tr key={i}>
                                        <td className="border border-black p-1 text-center">{hsn || 'N/A'} ({rate}%)</td>
                                        <td className="border border-black p-1 text-right">{taxableValue.toFixed(2)}</td>
                                        {invoice.gstType === 'CGST_SGST' ? (
                                            <>
                                                <td className="border border-black p-1 text-right">{(taxTotal/2).toFixed(2)}</td>
                                                <td className="border border-black p-1 text-right">{(taxTotal/2).toFixed(2)}</td>
                                            </>
                                        ) : (
                                            <td className="border border-black p-1 text-right">{taxTotal.toFixed(2)}</td>
                                        )}
                                        <td className="border border-black p-1 text-right">{taxTotal.toFixed(2)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {invoice.reverseCharge && <p className="font-bold mt-1 text-[10px]">Reverse Charge: YES</p>}
                </div>
            )}
             {invoiceSettings?.footerNote && (
                <div className="border border-t-0 border-black p-2" style={{ backgroundColor: lightBgColor }}>
                    <p><span className="font-bold">Terms & Conditions :</span> {invoiceSettings.footerNote}</p>
                </div>
            )}
            <div className="border border-t-0 border-black p-4 flex justify-end">
                <div className="w-64 text-center border-t border-black pt-2 mt-8">
                    <p className="font-bold uppercase">Authorized Signatory</p>
                    <p className="text-[10px] text-gray-600">{businessProfile?.businessName}</p>
                </div>
            </div>
        </div>
    );
}
