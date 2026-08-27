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
  // Target physical page height in mm - lets the items table grow to fill the
  // page instead of leaving blank space below the totals on short invoices.
  pageHeightMm?: number;
}

export default function GstTaxInvoice({ invoice, customer, settings, logoDataUri, onImageLoad, onImageError, pageHeightMm }: TemplateProps) {
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
        const key = `${item.gstRate || 0}`;
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
          className="bg-white text-[17px] text-black font-sans leading-tight border-0 w-full flex flex-col"
          style={{ wordBreak: 'break-word', minHeight: pageHeightMm ? `${pageHeightMm}mm` : undefined }}
        >
            {/* Top Bar with GSTIN - TABLE FIXED FOR STABILITY */}
            <table className="w-full border-b border-black text-[15px] border-collapse table-fixed">
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
                <h1 className="text-2xl font-black uppercase tracking-tight leading-none mb-1" style={{ wordBreak: 'break-word' }}>{businessProfile?.businessName || 'Business Name'}</h1>
                <p className="text-[14px] leading-tight max-w-[80%] mx-auto" style={{ wordBreak: 'break-word' }}>{businessProfile?.address || '123 Street, City, State, PIN'}</p>
                {businessProfile?.email && <p className="text-[14px]">E-Mail: {businessProfile.email}</p>}
                
                <div className="mt-3">
                    <span className="border-y border-black px-10 py-1 font-bold text-[17px] uppercase inline-block">Invoice</span>
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
                                <p className="font-bold text-[19px] uppercase leading-none mb-1">{invoice.customerName || customer?.name}</p>
                                <p className="whitespace-pre-wrap leading-tight text-[17px]">{customer?.address || invoice.placeOfSupply || 'Customer Address'}</p>
                                {invoice.customerPhone && <p className="mt-1 whitespace-nowrap">Phone: {invoice.customerPhone}</p>}
                                {invoice.customerGstin && (
                                    <p className="font-bold border border-black/20 mt-2 px-2 py-0.5 inline-block rounded-sm">
                                        GSTIN: {invoice.customerGstin}
                                    </p>
                                )}
                            </div>
                        </td>
                        {/* Invoice Meta (Right) */}
                        <td className="w-1/2 p-2" style={{ verticalAlign: 'top', wordBreak: 'break-word' }}>
                            <table className="w-full border-collapse text-[17px]">
                                <tbody>
                                    <tr className="border-b border-black/5">
                                        <td className="font-bold w-[150px] py-1 whitespace-nowrap">Date</td>
                                        <td className="w-[10px]">:</td>
                                        <td className="py-1 whitespace-nowrap">{new Date(invoice.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                                    </tr>
                                    <tr className="border-b border-black/5">
                                        <td className="font-bold py-1 whitespace-nowrap">Invoice Number</td>
                                        <td>:</td>
                                        <td className="py-1 font-bold whitespace-nowrap">{invoice.invoiceNumber}</td>
                                    </tr>
                                    <tr>
                                        <td className="font-bold py-1 whitespace-nowrap">Payment Terms</td>
                                        <td>:</td>
                                        <td className="py-1 uppercase whitespace-nowrap">Cash/Credit</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Items Table - grows to fill any leftover page height so short invoices
                don't leave the bottom of the page blank */}
            <table className="w-full border-collapse border-y border-black table-fixed mt-2 flex-1">
                {/* Column widths must match the number of cells actually rendered.
                    The MRP column is conditional, so its <col> has to be too - a
                    fixed 8-col group against 7 rendered cells shifted every width
                    left by one and left Amount with just 5%, which wrapped the
                    figures onto a second line. */}
                <colgroup>
                    <col style={{ width: '6%' }} />
                    <col style={{ width: settings?.invoiceSettings?.enableAdvancedInvoiceSystem ? '28%' : '34%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '8%' }} />
                    {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <col style={{ width: '11%' }} />}
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: settings?.invoiceSettings?.enableAdvancedInvoiceSystem ? '14%' : '19%' }} />
                </colgroup>
                <thead className="bg-gray-50/50">
                    <tr className="font-bold text-[14px] uppercase border-b border-black">
                        <th className="border-r border-black p-1 text-center whitespace-nowrap">S.No</th>
                        <th className="border-r border-black p-1 text-left whitespace-nowrap">Description</th>
                        <th className="border-r border-black p-1 text-center whitespace-nowrap">HSN SAC</th>
                        <th className="border-r border-black p-1 text-center whitespace-nowrap">QTY</th>
                        {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <th className="border-r border-black p-1 text-right whitespace-nowrap">MRP</th>}
                        <th className="border-r border-black p-1 text-right whitespace-nowrap">Rate</th>
                        <th className="border-r border-black p-1 text-center whitespace-nowrap">Tax</th>
                        <th className="p-1 text-right whitespace-nowrap">Amount</th>
                    </tr>
                </thead>
                <tbody className="min-h-[250px]">
                    {invoice.items.map((item, index) => (
                        <tr key={index} className="border-b border-black last:border-b-0 border-dotted h-6 text-[17px]">
                            {/* Only the description may wrap - codes and figures use
                                whitespace-nowrap with wordBreak reset so they never
                                split across two lines. */}
                            <td className="border-r border-black px-1 text-center whitespace-nowrap" style={{ wordBreak: 'normal' }}>{index + 1}</td>
                            <td className="border-r border-black px-1 text-left" style={{ wordBreak: 'break-word' }}>{item.productName}</td>
                            <td className="border-r border-black px-1 text-center whitespace-nowrap" style={{ wordBreak: 'normal' }}>{item.hsnCode || '-'}</td>
                            <td className="border-r border-black px-1 text-center whitespace-nowrap" style={{ wordBreak: 'normal' }}>{item.quantity}</td>
                            {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <td className="border-r border-black px-1 text-right whitespace-nowrap" style={{ wordBreak: 'normal' }}>{(item.mrp || item.unitPrice).toFixed(2)}</td>}
                            <td className="border-r border-black px-1 text-right whitespace-nowrap" style={{ wordBreak: 'normal' }}>{item.unitPrice.toFixed(2)}</td>
                            <td className="border-r border-black px-1 text-center whitespace-nowrap" style={{ wordBreak: 'normal' }}>{item.gstRate}%</td>
                            <td className="px-1 text-right font-bold whitespace-nowrap" style={{ wordBreak: 'normal' }}>{item.totalPrice.toFixed(2)}</td>
                        </tr>
                    ))}
                    {/* Consistent height fillers */}
                    {Array.from({ length: Math.max(0, 8 - invoice.items.length) }).map((_, i) => (
                        <tr key={`filler-${i}`} className="h-6 border-b border-black/5 last:border-b-0 border-dotted">
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            {settings?.invoiceSettings?.enableAdvancedInvoiceSystem && <td className="border-r border-black"></td>}
                            <td className="border-r border-black"></td>
                            <td className="border-r border-black"></td>
                            <td></td>
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
                            <div className="p-2 border-b border-black font-bold italic min-h-[40px] leading-tight flex items-center text-[17px] bg-slate-50/30">
                                {toWordsRupee(invoice.totalAmount)}
                            </div>
                            <table className="w-full text-[17px] border-collapse table-fixed">
                                {invoice.gstType !== 'IGST' ? (
                                    <colgroup>
                                        <col style={{ width: '25%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '15%' }} />
                                    </colgroup>
                                ) : (
                                    <colgroup>
                                        <col style={{ width: '25%' }} />
                                        <col style={{ width: '30%' }} />
                                        <col style={{ width: '30%' }} />
                                        <col style={{ width: '15%' }} />
                                    </colgroup>
                                )}
                                {/* Headers stay a little smaller than the figures so
                                    labels like "NET TAX" can't wrap in a 15% column. */}
                                <thead className="bg-gray-50/50 text-[13px]">
                                    <tr className="border-b border-black font-bold text-center">
                                        <th className="border-r border-black py-0.5 w-[25%] uppercase whitespace-nowrap">Taxable</th>
                                        {invoice.gstType !== 'IGST' ? (
                                            <>
                                                <th className="border-r border-black py-0.5 w-[15%] whitespace-nowrap">CGST%</th>
                                                <th className="border-r border-black py-0.5 w-[15%] whitespace-nowrap">AMT</th>
                                                <th className="border-r border-black py-0.5 w-[15%] whitespace-nowrap">SGST%</th>
                                                <th className="border-r border-black py-0.5 w-[15%] whitespace-nowrap">AMT</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="border-r border-black py-0.5 w-[30%] whitespace-nowrap" colSpan={2}>IGST%</th>
                                                <th className="border-r border-black py-0.5 w-[30%] whitespace-nowrap" colSpan={2}>AMT</th>
                                            </>
                                        )}
                                        <th className="py-0.5 w-[15%] whitespace-nowrap">NET TAX</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryRows.map((row, i) => (
                                        <tr key={i} className="border-b border-black/10 last:border-b-0 text-center" style={{ wordBreak: 'normal' }}>
                                            <td className="border-r border-black py-1 font-bold italic w-[25%] whitespace-nowrap">{row.taxable.toFixed(2)}</td>
                                            {invoice.gstType !== 'IGST' ? (
                                                <>
                                                    <td className="border-r border-black py-1 w-[15%] whitespace-nowrap">{row.rate / 2}</td>
                                                    <td className="border-r border-black py-1 w-[15%] whitespace-nowrap">{(row.tax / 2).toFixed(2)}</td>
                                                    <td className="border-r border-black py-1 w-[15%] whitespace-nowrap">{row.rate / 2}</td>
                                                    <td className="border-r border-black py-1 w-[15%] whitespace-nowrap">{(row.tax / 2).toFixed(2)}</td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="border-r border-black py-1 w-[30%] whitespace-nowrap" colSpan={2}>{row.rate}%</td>
                                                    <td className="border-r border-black py-1 font-medium w-[30%] whitespace-nowrap" colSpan={2}>{row.tax.toFixed(2)}</td>
                                                </>
                                            )}
                                            <td className="py-1 font-bold w-[15%] whitespace-nowrap">{row.tax.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-1 px-2 border-t border-black text-[12px] font-bold">
                                E. & O. E.
                            </div>
                        </td>

                        {/* Grand Totals and Signatory (35%) */}
                        <td className="w-[35%] p-0" style={{ verticalAlign: 'top', wordBreak: 'break-word', boxSizing: 'border-box' }}>
                            <table className="w-full border-collapse table-fixed">
                                <tbody>
                                    <tr className="font-bold bg-neutral-100 border-b border-black">
                                        <td className="p-1.5 text-left text-[17px] w-1/2 whitespace-nowrap">GRAND TOTAL</td>
                                        <td className="p-1.5 text-right text-[17px] font-black w-1/2 whitespace-nowrap">{currencySymbol}{invoice.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-2 text-center pt-8 pb-3" colSpan={2}>
                                            <p className="font-bold underline uppercase mb-12 text-[14px]">For {businessProfile?.businessName}</p>
                                            <div className="mx-auto w-[85%] border-t border-black/40 pt-1">
                                                <p className="font-bold text-[13px] uppercase tracking-wider whitespace-nowrap">Authorised Signatory</p>
                                            </div>
                                        </td>
                                    </tr>
                                    {/* 14px + tracking-widest is the largest that keeps this
                                        single line inside the 35% totals column. */}
                                    <tr className="bg-black text-white font-bold text-center text-[14px]">
                                        <td className="py-1 uppercase tracking-widest whitespace-nowrap" colSpan={2}>
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
