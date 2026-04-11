'use client'
import React from 'react';
import type { Invoice, Customer, AppSettings } from '@/lib/mockData';
import { getCurrencySymbol } from '@/lib/utils';

// Indian Number to Words Converter
const toWordsRupee = (num: number): string => {
    if (num === 0) return "Zero Rupees Only";
    
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const inWords = (n: number): string => {
        if (n < 20) return a[n];
        if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
        if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + inWords(n % 100) : '');
        if (n < 100000) return inWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? inWords(n % 1000) : '');
        if (n < 10000000) return inWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? inWords(n % 100000) : '');
        return inWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? inWords(n % 10000000) : '');
    };

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    
    let result = inWords(rupees) + "Rupees ";
    if (paise > 0) {
        result += "and " + inWords(paise) + "Paise ";
    }
    return result + "Only";
};

interface TemplateProps {
  invoice: Invoice;
  customer: Customer | null;
  settings: AppSettings | null;
  logoDataUri: string | null;
  onImageLoad: () => void;
}

export default function GstTaxInvoice({ invoice, customer, settings, logoDataUri, onImageLoad }: TemplateProps) {
    const currencySymbol = getCurrencySymbol(invoice.currency);
    const businessProfile = settings?.businessProfile;
    const invoiceSettings = settings?.invoiceSettings;

    React.useEffect(() => {
        // Since this template doesn't render a logo image, immediately signal that images are "loaded"
        onImageLoad();
    }, [onImageLoad]);

    // Calculate Tax Summary grouped by HSN/Rate
    const summaryMap = new Map<string, { taxable: number, tax: number, rate: number, hsn: string }>();
    
    invoice.items.forEach(item => {
        const key = `${item.hsnCode || 'N/A'}-${item.gstRate || 0}`;
        const existing = summaryMap.get(key) || { taxable: 0, tax: 0, rate: item.gstRate || 0, hsn: item.hsnCode || 'N/A' };
        
        // Use the per-item taxAmount we calculate in InvoiceForm
        // Taxable Value = item.totalPrice - item.taxAmount
        const taxVal = item.totalPrice - (item.taxAmount || 0);
        
        existing.taxable += taxVal;
        existing.tax += (item.taxAmount || 0);
        summaryMap.set(key, existing);
    });

    const summaryRows = Array.from(summaryMap.values());

    return (
        <div className="bg-white text-[10px] text-black font-sans leading-tight border border-black max-w-[800px] mx-auto overflow-hidden shadow-sm">
            {/* Top Bar with GSTIN */}
            <div className="flex justify-between p-1 border-b border-black font-bold">
                <div>{businessProfile?.phone && <span>CELL: {businessProfile.phone}</span>}</div>
                <div>{businessProfile?.gstNumber && <span>GSTIN: {businessProfile.gstNumber}</span>}</div>
            </div>

            {/* Header / Business Name */}
            <div className="text-center py-4 px-2 space-y-1">
                <h1 className="text-xl font-black uppercase tracking-tight">{businessProfile?.businessName || 'Business Name'}</h1>
                <p className="max-w-md mx-auto">{businessProfile?.address || '123 Street, City, State, PIN'}</p>
                {businessProfile?.email && <p>E-Mail: {businessProfile.email}</p>}
                <div className="pt-2">
                    <span className="border-y border-black px-8 py-1 font-bold text-sm uppercase">Invoice</span>
                </div>
            </div>

            {/* Details Section */}
            <div className="grid grid-cols-2 border-t border-black min-h-[100px]">
                {/* To: Customer */}
                <div className="p-2 border-r border-black space-y-1">
                    <p className="font-bold">To.</p>
                    <div className="pl-4">
                        <p className="font-bold text-sm uppercase">{invoice.customerName || customer?.name}</p>
                        <p className="whitespace-pre-wrap">{invoice.placeOfSupply || customer?.address || 'Customer Address'}</p>
                        {invoice.customerPhone && <p>Phone: {invoice.customerPhone}</p>}
                        {invoice.customerGstin && <p className="font-bold">GSTIN: {invoice.customerGstin}</p>}
                    </div>
                </div>
                {/* Invoice Meta */}
                <div className="p-2 flex flex-col justify-center space-y-2">
                    <div className="grid grid-cols-[1fr,auto,1fr] gap-x-2">
                        <span className="font-bold">Date</span>
                        <span>:</span>
                        <span>{new Date(invoice.issueDate).toLocaleDateString()}</span>
                        
                        <span className="font-bold">Invoice Number</span>
                        <span>:</span>
                        <span>{invoice.invoiceNumber}</span>
                        
                        <span className="font-bold">Payment Terms</span>
                        <span>:</span>
                        <span>{invoice.invoiceType === 'Retail' ? 'Cash' : 'Credit'}</span>
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <table className="w-full border-collapse border-y border-black">
                <thead className="border-b border-black">
                    <tr className="font-bold">
                        <th className="border-r border-black p-1 w-8 text-center italic">S.No</th>
                        <th className="border-r border-black p-1 text-center">Description</th>
                        <th className="border-r border-black p-1 w-20 text-center">HSN SAC</th>
                        <th className="border-r border-black p-1 w-16 text-center">QTY (Nos)</th>
                        <th className="border-r border-black p-1 w-20 text-center">MRP</th>
                        <th className="border-r border-black p-1 w-20 text-center">Rate</th>
                        <th className="border-r border-black p-1 w-12 text-center text-[9px]">Tax %</th>
                        <th className="p-1 w-24 text-center">Total Amount</th>
                    </tr>
                </thead>
                <tbody className="min-h-[200px]">
                    {invoice.items.map((item, index) => (
                        <tr key={index} className="border-b border-black/10 last:border-b-0">
                            <td className="border-r border-black p-1 text-center font-medium">{index + 1}</td>
                            <td className="border-r border-black p-1">{item.productName}</td>
                            <td className="border-r border-black p-1 text-center">{item.hsnCode || '-'}</td>
                            <td className="border-r border-black p-1 text-center">{item.quantity} {item.unit || ''}</td>
                            <td className="border-r border-black p-1 text-right">{item.mrp ? item.mrp.toFixed(2) : '-'}</td>
                            <td className="border-r border-black p-1 text-right">{item.unitPrice.toFixed(2)}</td>
                            <td className="border-r border-black p-1 text-center">{item.gstRate}%</td>
                            <td className="p-1 text-right font-bold">{item.totalPrice.toFixed(2)}</td>
                        </tr>
                    ))}
                    {/* Filler rows to maintain height if few items */}
                    {invoice.items.length < 5 && Array.from({ length: 5 - invoice.items.length }).map((_, i) => (
                        <tr key={`filler-${i}`} className="h-6">
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Footer Summary Section */}
            <div className="grid grid-cols-[1fr,250px] border-black">
                {/* Left side: Words and Taxable values Table */}
                <div className="border-r border-black flex flex-col">
                    {/* Summary row 1: Words */}
                    <div className="p-2 border-b border-black font-bold h-full italic">
                        {toWordsRupee(invoice.totalAmount)}
                    </div>
                    {/* Tax Breakdown Table */}
                    <table className="w-full text-[9px] border-collapse bg-gray-50/50">
                        <thead>
                            <tr className="border-b border-black font-bold">
                                <th className="border-r border-black p-0.5">Taxable value</th>
                                {invoice.gstType !== 'IGST' ? (
                                    <>
                                        <th className="border-r border-black p-0.5">CGST %</th>
                                        <th className="border-r border-black p-0.5">AMT</th>
                                        <th className="border-r border-black p-0.5">SGST %</th>
                                        <th className="border-r border-black p-0.5">AMT</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="border-r border-black p-0.5" colSpan={2}>IGST %</th>
                                        <th className="border-r border-black p-0.5" colSpan={2}>AMT</th>
                                    </>
                                )}
                                <th className="border-r border-black p-0.5 text-[8px]">NET %</th>
                                <th className="p-0.5">AMT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {summaryRows.map((row, i) => (
                                <tr key={i} className="border-b border-black/10 last:border-b-0 text-center">
                                    <td className="border-r border-black p-0.5 font-bold italic">{row.taxable.toFixed(2)}</td>
                                    {invoice.gstType !== 'IGST' ? (
                                        <>
                                            <td className="border-r border-black p-0.5">{row.rate / 2}</td>
                                            <td className="border-r border-black p-0.5 font-medium">{(row.tax / 2).toFixed(2)}</td>
                                            <td className="border-r border-black p-0.5">{row.rate / 2}</td>
                                            <td className="border-r border-black p-0.5 font-medium">{(row.tax / 2).toFixed(2)}</td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="border-r border-black p-0.5" colSpan={2}>{row.rate}%</td>
                                            <td className="border-r border-black p-0.5 font-medium" colSpan={2}>{row.tax.toFixed(2)}</td>
                                        </>
                                    )}
                                    <td className="border-r border-black p-0.5 font-bold">{row.rate}</td>
                                    <td className="p-0.5 font-bold">{row.tax.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div className="p-1 px-2 border-t border-black text-[8px] font-bold">
                        E. & O. E.
                    </div>
                </div>

                {/* Right side: Grand Totals */}
                <div className="flex flex-col">
                    <div className="flex justify-between p-2 font-bold bg-gray-100">
                        <span>Total</span>
                        <span>{currencySymbol}{invoice.totalAmount.toFixed(2)}</span>
                    </div>
                    {/* Reverse Charge info if any */}
                    {invoice.reverseCharge && (
                        <div className="p-1 text-center font-bold text-[8px] border-y border-black bg-yellow-50">
                            Reverse Charge: Yes
                        </div>
                    )}
                    <div className="flex-1 min-h-[60px] flex flex-col justify-end p-2 text-center space-y-4">
                        <div className="space-y-0.5">
                            <p className="font-bold underline uppercase">For {businessProfile?.businessName}</p>
                            <div className="pt-8">
                                <p className="font-bold text-[9px] uppercase border-t border-black/20 pt-1">Authorised Signatory</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-black text-white text-center py-1 font-bold">
                        Net Amount: {currencySymbol}{invoice.totalAmount.toFixed(2)}
                    </div>
                </div>
            </div>
        </div>
    );
}
