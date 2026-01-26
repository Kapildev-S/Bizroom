
"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface InvoicePreviewProps {
  themeColor: string;
  template?: string;
}

export default function InvoicePreview({ themeColor, template = 'classic' }: InvoicePreviewProps) {
  const accentStyle = { color: themeColor };

  const ClassicPreview = () => (
    <>
      <div className="flex justify-between items-start mb-4">
        <div><h2 className="font-bold text-sm">Business Name</h2><p className="text-gray-600">Mobile: 9655613399</p></div>
        <div className="text-right">
          <h2 className="font-bold text-sm" style={accentStyle}>TAX INVOICE</h2>
          <p className="text-gray-500 border border-gray-400 px-1 py-0.5 rounded mt-1 text-[10px] inline-block">ORIGINAL FOR RECIPIENT</p>
        </div>
      </div>
      <div className="flex justify-between mb-4">
        <div className="w-1/2 pr-2"><p className="text-gray-500 font-bold text-[10px] mb-1">BILL TO</p><p className="font-bold">Sample Party</p></div>
        <div className="w-1/2 pl-2"><div className="grid grid-cols-[auto,1fr] gap-x-2 text-left ml-auto max-w-xs text-gray-600"><p>Invoice No.</p><p className="font-medium text-gray-800">: AABBCCDD/202</p></div></div>
      </div>
      <table className="w-full text-left"><thead><tr className="bg-gray-100"><th className="p-1.5 font-semibold text-gray-600">ITEMS</th><th className="p-1.5 font-semibold text-gray-600 text-right">AMOUNT</th></tr></thead><tbody><tr className="border-b"><td className="p-1.5 align-top"><p className="font-semibold">Sample Item 1</p></td><td className="p-1.5 text-right font-semibold align-top">10,000.00</td></tr><tr className="border-b"><td className="p-1.5 align-top"><p className="font-semibold">Sample Item 2</p></td><td className="p-1.5 text-right font-semibold align-top">5,000.00</td></tr></tbody></table>
      <div className="flex justify-end mt-4"><div className="w-[45%]"><div className="flex justify-between py-2 font-bold text-sm px-2 bg-gray-200" style={{ backgroundColor: themeColor, color: 'white' }}><p>TOTAL</p><p>₹15,000.00</p></div></div></div>
    </>
  );

  const ModernPreview = () => (
    <>
      <div className="flex justify-between items-center pb-4 border-b-2" style={{ borderColor: themeColor }}><div className="w-16 h-16 bg-gray-200 rounded-md"></div><h1 className="text-2xl font-light uppercase" style={accentStyle}>Invoice</h1></div>
      <div className="grid grid-cols-2 gap-8 my-4"><p className="font-bold text-gray-800">Billed To: Sample Party</p><div className="text-right"><p><span className="font-bold text-gray-800">Invoice #</span> AABBCCDD/202</p></div></div>
      <table className="w-full text-left"><thead><tr style={{ color: themeColor }}><th className="p-2 font-semibold">DESCRIPTION</th><th className="p-2 font-semibold text-right">TOTAL</th></tr></thead><tbody><tr className="border-b"><td className="p-3">Sample Item 1</td><td className="p-3 text-right">10,000.00</td></tr><tr className="border-b"><td className="p-3">Sample Item 2</td><td className="p-3 text-right">5,000.00</td></tr></tbody></table>
      <div className="flex justify-end mt-4"><div className="w-full max-w-xs"><div className="flex justify-between py-4 font-bold text-lg" style={accentStyle}><span>Total:</span><span>₹15,000.00</span></div></div></div>
    </>
  );

  const StylishPreview = () => (
    <>
      <div className="p-4 text-white" style={{ backgroundColor: themeColor }}>
        <div className="flex justify-between items-start">
          <div><h1 className="text-xl font-bold">Business Name</h1></div>
          <div className="text-right"><h2 className="text-xl font-extrabold uppercase">Invoice</h2></div>
        </div>
      </div>
      <div className="p-4"><p className="font-bold opacity-80 text-xs">Bill To</p><p className="font-medium">Sample Party</p></div>
      <div className="p-4"><table className="w-full text-left"><thead><tr><th className="p-2 pb-2 font-semibold text-gray-700 border-b-2">ITEM</th><th className="p-2 pb-2 font-semibold text-gray-700 border-b-2 text-right">TOTAL</th></tr></thead><tbody><tr><td className="p-3 border-b">Sample Item 1</td><td className="p-3 border-b text-right">10,000.00</td></tr><tr><td className="p-3 border-b">Sample Item 2</td><td className="p-3 border-b text-right">5,000.00</td></tr></tbody></table></div>
      <div className="flex justify-end p-4"><div className="w-full max-w-xs text-right space-y-2"><div className="flex justify-between font-bold text-lg" style={accentStyle}><span>Total Due:</span><span>₹15,000.00</span></div></div></div>
    </>
  );

  const ProfessionalPreview = () => (
    <>
      <div className="p-4 text-white" style={{ backgroundColor: themeColor }}>
        <div className="flex justify-between items-start">
          <div><div className="w-8 h-8 bg-white/80 rounded-sm"></div><h2 className="text-xl font-bold mt-1">Invoice</h2></div>
          <div className="text-right"><h3 className="font-bold text-sm">Company Name</h3><p className="text-xs opacity-80">Address line</p></div>
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div><p className="font-bold opacity-80 text-xs">BILL TO</p><p className="font-medium">Sample Party</p></div>
          <div className="text-right text-xs"><p className="font-bold">INVOICE # <span className="font-normal">12345</span></p><p className="font-bold">DATE <span className="font-normal">12/31/20</span></p></div>
        </div>
        <div className="w-full h-px bg-gray-200 mb-2"></div>
        <div className="flex justify-between text-gray-500 uppercase text-[10px] font-bold"><p>Items</p><p>Amount</p></div>
        <div className="w-full h-px bg-gray-200 mt-2"></div>
        <div className="flex justify-between mt-2"><p>Sample Item</p><p>10,000.00</p></div>
      </div>
      <div className="grid grid-cols-2 mt-4">
        <div className="p-4 bg-gray-100 text-gray-600"><h4 className="font-bold text-xs">NOTES:</h4><p className="text-[10px]">Thank you for your business.</p></div>
        <div className="p-4 flex flex-col justify-center items-center text-white" style={{ backgroundColor: themeColor }}><p className="uppercase text-sm">TOTAL</p><p className="text-xl font-bold">₹15,000.00</p></div>
      </div>
    </>
  );

  // New Theme: Minimal
  const MinimalPreview = () => (
    <>
      <div className="border-l-4 pl-4 mb-6" style={{ borderColor: themeColor }}>
        <h1 className="text-2xl font-light text-gray-800">INVOICE</h1>
        <p className="text-xs text-gray-500">No. AABBCCDD/202</p>
      </div>
      <div className="flex justify-between mb-6 text-sm">
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider">From</p>
          <p className="font-medium">Business Name</p>
        </div>
        <div className="text-right">
          <p className="text-gray-400 text-xs uppercase tracking-wider">To</p>
          <p className="font-medium">Sample Party</p>
        </div>
      </div>
      <div className="space-y-2 mb-6">
        <div className="flex justify-between py-2 border-b border-dashed">
          <span>Sample Item 1</span>
          <span className="font-medium">₹10,000.00</span>
        </div>
        <div className="flex justify-between py-2 border-b border-dashed">
          <span>Sample Item 2</span>
          <span className="font-medium">₹5,000.00</span>
        </div>
      </div>
      <div className="flex justify-end">
        <div className="text-right">
          <p className="text-xs text-gray-400">TOTAL</p>
          <p className="text-2xl font-bold" style={accentStyle}>₹15,000.00</p>
        </div>
      </div>
    </>
  );

  // New Theme: Elegant
  const ElegantPreview = () => (
    <>
      <div className="text-center pb-4 border-b-2" style={{ borderColor: themeColor }}>
        <h1 className="text-xl font-serif font-bold text-gray-800">Business Name</h1>
        <p className="text-gray-500 text-xs mt-1">Premium Invoice</p>
      </div>
      <div className="flex justify-between my-4 text-sm">
        <div>
          <p className="text-xs text-gray-400 font-serif italic">Billed To</p>
          <p className="font-medium">Sample Party</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-xs" style={accentStyle}>#AABBCCDD/202</p>
        </div>
      </div>
      <div className="rounded-lg overflow-hidden border">
        <div className="py-2 px-3 text-xs font-semibold text-white" style={{ backgroundColor: themeColor }}>
          <div className="flex justify-between"><span>ITEM</span><span>AMOUNT</span></div>
        </div>
        <div className="divide-y">
          <div className="flex justify-between py-2 px-3"><span>Sample Item 1</span><span>₹10,000.00</span></div>
          <div className="flex justify-between py-2 px-3"><span>Sample Item 2</span><span>₹5,000.00</span></div>
        </div>
      </div>
      <div className="mt-4 p-3 rounded-lg bg-gray-50 flex justify-between items-center">
        <span className="font-serif italic text-gray-600">Grand Total</span>
        <span className="text-xl font-bold" style={accentStyle}>₹15,000.00</span>
      </div>
    </>
  );

  // New Theme: Bold
  const BoldPreview = () => (
    <>
      <div className="relative">
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-20" style={{ backgroundColor: themeColor }}></div>
        <h1 className="text-3xl font-black uppercase" style={accentStyle}>Invoice</h1>
        <p className="text-gray-500 text-xs">AABBCCDD/202</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div className="p-3 rounded-lg" style={{ backgroundColor: `${themeColor}15` }}>
          <p className="text-xs font-bold uppercase" style={accentStyle}>From</p>
          <p className="font-bold text-gray-800">Business Name</p>
        </div>
        <div className="p-3 rounded-lg bg-gray-100">
          <p className="text-xs font-bold uppercase text-gray-500">To</p>
          <p className="font-bold text-gray-800">Sample Party</p>
        </div>
      </div>
      <div className="mt-4 space-y-1">
        <div className="flex justify-between p-2 bg-gray-50 rounded"><span className="font-medium">Sample Item 1</span><span className="font-bold">₹10,000.00</span></div>
        <div className="flex justify-between p-2 bg-gray-50 rounded"><span className="font-medium">Sample Item 2</span><span className="font-bold">₹5,000.00</span></div>
      </div>
      <div className="mt-4 p-4 rounded-lg text-white text-center" style={{ backgroundColor: themeColor }}>
        <p className="text-xs uppercase opacity-80">Total Amount</p>
        <p className="text-2xl font-black">₹15,000.00</p>
      </div>
    </>
  );

  // New Theme: Compact
  const CompactPreview = () => (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: themeColor }}>BN</div>
          <div>
            <p className="font-bold text-sm">Business Name</p>
            <p className="text-[10px] text-gray-500">Tax Invoice</p>
          </div>
        </div>
        <div className="text-right text-xs">
          <p className="font-mono" style={accentStyle}>#AABBCCDD</p>
        </div>
      </div>
      <div className="text-xs mb-3 p-2 bg-gray-50 rounded">
        <span className="text-gray-500">Bill to:</span> <span className="font-medium">Sample Party</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b" style={{ borderColor: themeColor }}>
            <th className="text-left py-1 font-medium" style={accentStyle}>Item</th>
            <th className="text-right py-1 font-medium" style={accentStyle}>Amt</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-100"><td className="py-1">Sample Item 1</td><td className="text-right">₹10,000</td></tr>
          <tr className="border-b border-gray-100"><td className="py-1">Sample Item 2</td><td className="text-right">₹5,000</td></tr>
        </tbody>
      </table>
      <div className="mt-3 flex justify-between items-center p-2 rounded" style={{ backgroundColor: `${themeColor}15` }}>
        <span className="font-bold text-sm" style={accentStyle}>TOTAL</span>
        <span className="font-bold text-lg">₹15,000.00</span>
      </div>
    </>
  );

  const renderPreview = () => {
    switch (template) {
      case 'modern':
        return <ModernPreview />;
      case 'stylish':
        return <StylishPreview />;
      case 'professional':
        return <ProfessionalPreview />;
      case 'minimal':
        return <MinimalPreview />;
      case 'elegant':
        return <ElegantPreview />;
      case 'bold':
        return <BoldPreview />;
      case 'compact':
        return <CompactPreview />;
      case 'classic':
      default:
        return <ClassicPreview />;
    }
  }

  return (
    <Card className="shadow-md h-full overflow-hidden">
      <CardContent className="p-4 text-xs text-gray-800 bg-white">
        {renderPreview()}
      </CardContent>
    </Card>
  );
}
