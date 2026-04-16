
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

export default function ModernInvoice({ invoice, customer, settings, logoDataUri, onImageLoad, onImageError }: TemplateProps) {
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
                        <img src={logoDataUri || businessProfile?.logoUrl} alt="Business Logo" width={80} height={80} className="rounded-full object-contain" crossOrigin="anonymous" onLoad={onImageLoad} onError={onImageError || onImageLoad} />
                    }
                    <div className="space-y-0">
                        <h2 className="font-bold text-xl">{businessProfile?.businessName || 'Your Business Name'}</h2>
                        {businessProfile?.address && <p className="text-gray-600 text-sm">{businessProfile.address}</p>}
                        {businessProfile?.phone && <p className="text-gray-600 text-sm">{businessProfile.phone}</p>}
                        {businessProfile?.email && <p className="text-gray-600 text-sm">{businessProfile.email}</p>}
                        {businessProfile?.gstNumber && <p className="text-gray-900 text-sm font-semibold">GSTIN: {businessProfile.gstNumber}</p>}
                        {businessProfile?.state && <p className="text-gray-600 text-sm">State: {businessProfile.state}</p>}
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
                    <p className="font-medium text-gray-900 uppercase">{invoice.customerName || customer?.name}</p>
                    {(customer?.address || invoice.placeOfSupply) && (
                        <p className="text-gray-600 text-sm whitespace-pre-wrap">{invoice.placeOfSupply || customer?.address}</p>
                    )}
                    {invoice.customerGstin && <p className="text-gray-900 text-sm font-semibold">GSTIN: {invoice.customerGstin}</p>}
                    {(invoice.customerPhone || customer?.phone) && <p className="text-gray-600 text-sm">Phone: {invoice.customerPhone || customer?.phone}</p>}
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
            <table className="w-full text-left text-sm table-fixed border-collapse">
                <thead>
                    <tr style={{ color: themeColor }}>
                        <th className="p-2 pb-3 font-bold uppercase tracking-wider text-left w-[35%]">Descriptions</th>
                        {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <th className="p-2 pb-3 font-bold uppercase tracking-wider text-left w-[12%]">HSN</th>}
                        <th className="p-2 pb-3 font-bold uppercase tracking-wider text-center w-[10%]">QTY</th>
                        <th className="p-2 pb-3 font-bold uppercase tracking-wider text-right w-[12%]">MRP</th>
                        <th className="p-2 pb-3 font-bold uppercase tracking-wider text-right w-[15%]">PRICE</th>
                        {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <th className="p-2 pb-3 font-bold uppercase tracking-wider text-right w-[6%]">GST%</th>}
                        <th className="p-2 pb-3 font-bold uppercase tracking-wider text-right w-[10%]">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-200">
                            <td className="p-2 py-3">
                                <p className="font-semibold break-words leading-tight">{item.productName}</p>
                            </td>
                            {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <td className="p-2 py-3 overflow-hidden text-ellipsis">{item.hsnCode}</td>}
                            <td className="p-2 py-3 text-center overflow-hidden text-ellipsis">{item.quantity} {item.unit || ''}</td>
                            <td className="p-2 py-3 text-right overflow-hidden text-ellipsis">{item.mrp ? `${currencySymbol}${item.mrp.toFixed(2)}` : '-'}</td>
                            <td className="p-2 py-3 text-right overflow-hidden text-ellipsis">{currencySymbol}{item.unitPrice.toFixed(2)}</td>
                            {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <td className="p-2 py-3 text-right overflow-hidden text-ellipsis">{item.gstRate}%</td>}
                            <td className="p-2 py-3 text-right font-bold overflow-hidden text-ellipsis">{currencySymbol}{item.totalPrice.toFixed(2)}</td>
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
                    {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && invoice.gstType === 'CGST_SGST' ? (
                        <>
                            <div className="flex justify-between text-gray-600 text-[10px]">
                                <span>CGST TOTAL:</span>
                                <span className="text-gray-800">{currencySymbol}{(invoice.taxAmount / 2).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600 text-[10px]">
                                <span>SGST TOTAL:</span>
                                <span className="text-gray-800">{currencySymbol}{(invoice.taxAmount / 2).toFixed(2)}</span>
                            </div>
                        </>
                    ) : (
                        <div className="flex justify-between text-gray-600">
                            <span>{settings?.invoiceSettings?.enableAdvancedInvoiceSystem ? 'IGST TOTAL:' : 'Tax:'}</span>
                            <span className="text-gray-800">{currencySymbol}{invoice.taxAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="w-full h-px bg-gray-300 my-2"></div>
                    <div className="flex justify-between font-bold text-base" style={{ color: themeColor }}>
                        <span>Total:</span>
                        <span>{currencySymbol}{invoice.totalAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <div className="w-full grid grid-cols-2 gap-8 border-t-2 border-black mt-12 pt-6">
                <div>
                    {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && (
                        <div className="mb-6">
                            <h4 className="font-bold text-[10px] text-gray-800 uppercase mb-2">Tax Breakdown</h4>
                            <table className="w-full text-[9px] uppercase">
                                <thead className="border-b border-gray-200">
                                    <tr>
                                        <th className="py-1 text-left">HSN</th>
                                        <th className="py-1 text-right">Value</th>
                                        {invoice.gstType === 'CGST_SGST' ? (
                                            <>
                                                <th className="py-1 text-right">CGST</th>
                                                <th className="py-1 text-right">SGST</th>
                                            </>
                                        ) : (
                                            <th className="py-1 text-right">IGST</th>
                                        )}
                                        <th className="py-1 text-right">Total</th>
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
                                            <tr key={i} className="border-b border-gray-100 last:border-0 font-medium">
                                                <td className="py-1">{hsn || 'N/A'} ({rate}%)</td>
                                                <td className="py-1 text-right">{taxableValue.toFixed(2)}</td>
                                                {invoice.gstType === 'CGST_SGST' ? (
                                                    <>
                                                        <td className="py-1 text-right">{(taxTotal/2).toFixed(2)}</td>
                                                        <td className="py-1 text-right">{(taxTotal/2).toFixed(2)}</td>
                                                    </>
                                                ) : (
                                                    <td className="py-1 text-right">{taxTotal.toFixed(2)}</td>
                                                )}
                                                <td className="py-1 text-right">{taxTotal.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {invoice.reverseCharge && (
                                <div className="mt-3 p-1 px-2 border border-gray-200 bg-gray-50 rounded text-[9px] font-bold italic">
                                    REVERSE CHARGE APPLICABLE: YES
                                </div>
                            )}
                        </div>
                    )}
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
                <div className="flex flex-col items-end justify-center">
                    <div className="w-48 border-t border-gray-400 text-center pt-2">
                        <p className="text-xs font-bold uppercase text-gray-800">Authorized Signatory</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{businessProfile?.businessName}</p>
                    </div>
                </div>
            </div>

        </CardContent>
    );
}
