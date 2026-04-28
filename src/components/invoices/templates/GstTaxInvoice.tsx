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
  onImageError?: () => void;
}

export default function GstTaxInvoice({ invoice, customer, settings, logoDataUri, onImageLoad, onImageError }: TemplateProps) {
    const currencySymbol = getCurrencySymbol(invoice.currency);
    const businessProfile = settings?.businessProfile;
    const invoiceSettings = settings?.invoiceSettings;

    React.useEffect(() => {
        // Signal that the template is "loaded" immediately since it manages its own state
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
        <div 
          id="invoice-root"
          className="bg-white text-[10px] text-black font-sans leading-tight border-0 w-full"
          style={{ wordBreak: 'break-word' }}
        >
            {/* Top Bar with GSTIN - TABLE FIXED FOR STABILITY */}
            <table className="w-full border-b border-black text-[9px] border-collapse table-fixed">
                <tbody>
                    <tr>
                        <td className="p-1 font-bold w-[40%] text-left" style={{ wordBreak: 'break-word' }}>
                            {businessProfile?.phone && <span>CELL: {businessProfile.phone}</span>}
                        </td>
                        <td className="p-1 font-bold w-[60%] text-right uppercase" style={{ wordBreak: 'break-word' }}>
                            {businessProfile?.gstNumber && <span>GSTIN: {businessProfile.gstNumber}</span>}
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Header / Business Name */}
            <div className="py-4 text-center">
                <h1 className="text-xl font-black uppercase tracking-tight leading-none mb-1" style={{ wordBreak: 'break-word' }}>{businessProfile?.businessName || 'Business Name'}</h1>
                <p className="text-[9px] leading-tight max-w-[80%] mx-auto" style={{ wordBreak: 'break-word' }}>{businessProfile?.address || '123 Street, City, State, PIN'}</p>
                {businessProfile?.email && <p className="text-[9px]">E-Mail: {businessProfile.email}</p>}
                
                <div className="mt-3">
                    <span className="border-y border-black px-10 py-1 font-bold text-sm uppercase inline-block">Invoice</span>
                </div>

                {logoDataUri && (
                    <div className="absolute top-6 right-6 no-print">
                        <img 
                            src={logoDataUri} 
                            alt="Logo" 
                            className="h-10 w-auto object-contain" 
                            onLoad={onImageLoad}
                            onError={onImageError}
                        />
                    </div>
                )}
            </div>

            {/* Details Section - TWO COLUMN TABLE BASE */}
            <table className="w-full border-t border-black border-collapse table-fixed mt-2">
                <tbody>
                    <tr>
                        {/* To: Customer (Left) */}
                        <td className="w-1/2 p-2 border-r border-black" style={{ verticalAlign: 'top', wordBreak: 'break-word' }}>
                            <p className="font-bold underline mb-1">To.</p>
                            <div className="pl-2">
                                <p className="font-bold text-sm uppercase leading-none mb-1">{invoice.customerName || customer?.name}</p>
                                <p className="whitespace-pre-wrap leading-tight text-[9px]">{customer?.address || invoice.placeOfSupply || 'Customer Address'}</p>
                                {invoice.customerPhone && <p className="mt-1">Phone: {invoice.customerPhone}</p>}
                                {invoice.customerGstin && (
                                    <p className="font-bold border border-black/20 mt-2 px-2 py-0.5 inline-block rounded-sm">
                                        GSTIN: {invoice.customerGstin}
                                    </p>
                                )}
                            </div>
                        </td>
                        {/* Invoice Meta (Right) */}
                        <td className="w-1/2 p-2" style={{ verticalAlign: 'top', wordBreak: 'break-word' }}>
                            <table className="w-full border-collapse text-[10px]">
                                <tbody>
                                    <tr className="border-b border-black/5">
                                        <td className="font-bold w-[130px] py-1">Date</td>
                                        <td className="w-[10px]">:</td>
                                        <td className="py-1">{new Date(invoice.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                                    </tr>
                                    <tr className="border-b border-black/5">
                                        <td className="font-bold py-1">Invoice Number</td>
                                        <td>:</td>
                                        <td className="py-1 font-bold">{invoice.invoiceNumber}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-bold py-1">Payment Terms</td>
                                        <td>:</td>
                                        <td className="py-1 uppercase">Cash/Credit</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Items Table - FIXED LAYOUT ONLY */}
            <table className="w-full border-collapse border-y border-black table-fixed mt-2">
                <thead className="bg-gray-50/50">
                    <tr className="font-bold text-[9px] uppercase border-b border-black">
                        <th className="border-r border-black p-1 w-[6%] text-center">S.No</th>
                        <th className="border-r border-black p-1 w-[41%] text-left">Description</th>
                        <th className="border-r border-black p-1 w-[12%] text-center">HSN SAC</th>
                        <th className="border-r border-black p-1 w-[8%] text-center">QTY</th>
                        <th className="border-r border-black p-1 w-[10%] text-right">MRP</th>
                        <th className="border-r border-black p-1 w-[10%] text-right">Rate</th>
                        <th className="border-r border-black p-1 w-[5%] text-center">Tax</th>
                        <th className="p-1 w-[8%] text-right">Amount</th>
                    </tr>
                </thead>
                <tbody className="min-h-[250px]">
                    {invoice.items.map((item, index) => (
                        <tr key={index} className="border-b border-black last:border-b-0 border-dotted h-6 text-[9px]">
                            <td className="border-r border-black px-1 text-center" style={{ wordBreak: 'break-word' }}>{index + 1}</td>
                            <td className="border-r border-black px-1 text-left" style={{ wordBreak: 'break-word' }}>{item.productName}</td>
                            <td className="border-r border-black px-1 text-center" style={{ wordBreak: 'break-word' }}>{item.hsnCode || '-'}</td>
                            <td className="border-r border-black px-1 text-center">{item.quantity}</td>
                            <td className="border-r border-black px-1 text-right">{(item.mrp || item.unitPrice).toFixed(2)}</td>
                            <td className="border-r border-black px-1 text-right">{item.unitPrice.toFixed(2)}</td>
                            <td className="border-r border-black px-1 text-center">{item.gstRate}%</td>
                            <td className="px-1 text-right font-bold">{item.totalPrice.toFixed(2)}</td>
                        </tr>
                    ))}
                    {/* Consistent height fillers */}
                    {Array.from({ length: Math.max(0, 8 - invoice.items.length) }).map((_, i) => (
                        <tr key={`filler-${i}`} className="h-6 border-b border-black/5 last:border-b-0 border-dotted">
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className=""></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Footer Summary - NO WRAP TABLE */}
            <table className="w-full border-collapse table-fixed">
                <tbody>
                    <tr>
                        {/* Word conversion and Tax Table (65%) */}
                        <td className="w-[65%] border-r border-black p-0" style={{ verticalAlign: 'top', wordBreak: 'break-word', boxSizing: 'border-box' }}>
                            <div className="p-2 border-b border-black font-bold italic min-h-[40px] leading-tight flex items-center text-[9px] bg-slate-50/30">
                                {toWordsRupee(invoice.totalAmount)}
                            </div>
                            <table className="w-full text-[9px] border-collapse table-fixed">
                                <thead className="bg-gray-50/50">
                                    <tr className="border-b border-black font-bold text-center">
                                        <th className="border-r border-black py-0.5 w-[25%] uppercase">Taxable</th>
                                        {invoice.gstType !== 'IGST' ? (
                                            <>
                                                <th className="border-r border-black py-0.5 w-[15%]">CGST%</th>
                                                <th className="border-r border-black py-0.5 w-[15%]">AMT</th>
                                                <th className="border-r border-black py-0.5 w-[15%]">SGST%</th>
                                                <th className="border-r border-black py-0.5 w-[15%]">AMT</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="border-r border-black py-0.5 w-[30%]" colSpan={2}>IGST%</th>
                                                <th className="border-r border-black py-0.5 w-[30%]" colSpan={2}>AMT</th>
                                            </>
                                        )}
                                        <th className="py-0.5 w-[15%]">NET TAX</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryRows.map((row, i) => (
                                        <tr key={i} className="border-b border-black/10 last:border-b-0 text-center">
                                            <td className="border-r border-black py-1 font-bold italic w-[25%]">{row.taxable.toFixed(2)}</td>
                                            {invoice.gstType !== 'IGST' ? (
                                                <>
                                                    <td className="border-r border-black py-1 w-[15%]">{row.rate / 2}</td>
                                                    <td className="border-r border-black py-1 w-[15%]">{(row.tax / 2).toFixed(2)}</td>
                                                    <td className="border-r border-black py-1 w-[15%]">{row.rate / 2}</td>
                                                    <td className="border-r border-black py-1 w-[15%]">{(row.tax / 2).toFixed(2)}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="border-r border-black py-1 w-[30%]" colSpan={2}>{row.rate}%</td>
                                                    <td className="border-r border-black py-1 font-medium w-[30%]" colSpan={2}>{row.tax.toFixed(2)}</td>
                                                </>
                                            )}
                                            <td className="py-1 font-bold w-[15%]">{row.tax.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-1 px-2 border-t border-black text-[7px] font-bold">
                                E. & O. E.
                            </div>
                        </td>

                        {/* Grand Totals and Signatory (35%) */}
                        <td className="w-[35%] p-0" style={{ verticalAlign: 'top', wordBreak: 'break-word', boxSizing: 'border-box' }}>
                            <table className="w-full border-collapse table-fixed">
                                <tbody>
                                    <tr className="font-bold bg-neutral-100 border-b border-black">
                                        <td className="p-1.5 text-left text-[11px] w-1/2">GRAND TOTAL</td>
                                        <td className="p-1.5 text-right text-[11px] font-black w-1/2">{currencySymbol}{invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 text-center pt-8 pb-3" colSpan={2}>
                                            <p className="font-bold underline uppercase mb-12 text-[9px]">For {businessProfile?.businessName}</p>
                                            <div className="mx-auto w-[85%] border-t border-black/40 pt-1">
                                                <p className="font-bold text-[8px] uppercase tracking-wider">Authorised Signatory</p>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr className="bg-black text-white font-bold text-center text-[10px]">
                                        <td className="py-1 uppercase tracking-widest" colSpan={2}>
                                            Amount Payable: {currencySymbol}{invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
