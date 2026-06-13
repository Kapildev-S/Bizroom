"use client";

import React from 'react';
import type { InvoiceItem } from '@/lib/mockData';
import { getCurrencySymbol } from '@/lib/utils';

interface ReceiptPrintViewProps {
  businessName: string;
  cartItems: (InvoiceItem & { id: string })[];
  subtotal: number;
  total: number;
  taxAmount: number;
  paymentMode: string;
  currency: string;
}

export function ReceiptPrintView({
  businessName,
  cartItems,
  subtotal,
  total,
  taxAmount,
  paymentMode,
  currency,
}: ReceiptPrintViewProps) {
  const currencySymbol = getCurrencySymbol(currency);
  const now = new Date();

  return (
    <div id="print-receipt" className="hidden print:block font-mono text-sm leading-tight text-black bg-white" style={{ width: '300px', margin: '0 auto', padding: '10px' }}>
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold uppercase">{businessName || 'Bakery'}</h2>
        <p className="text-xs">Receipt</p>
        <p className="text-xs">{now.toLocaleString()}</p>
      </div>

      <div className="border-t border-b border-black border-dashed py-2 mb-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left">
              <th className="pb-1 w-1/2">Item</th>
              <th className="pb-1 text-right w-1/4">Qty</th>
              <th className="pb-1 text-right w-1/4">Price</th>
            </tr>
          </thead>
          <tbody>
            {cartItems.map((item, idx) => (
              <tr key={idx}>
                <td className="py-1 truncate pr-1">{item.productName}</td>
                <td className="py-1 text-right">{item.quantity}</td>
                <td className="py-1 text-right">{currencySymbol}{item.totalPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-xs space-y-1 mb-4">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{currencySymbol}{subtotal.toFixed(2)}</span>
        </div>
        {taxAmount > 0 && (
          <div className="flex justify-between">
            <span>Tax:</span>
            <span>{currencySymbol}{taxAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm border-t border-black border-dashed pt-1 mt-1">
          <span>Total:</span>
          <span>{currencySymbol}{total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mt-2">
          <span>Paid via:</span>
          <span className="uppercase">{paymentMode}</span>
        </div>
      </div>

      <div className="text-center mt-6 text-xs">
        <p>Thank you for visiting!</p>
        <p>Please come again.</p>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #print-receipt, #print-receipt * {
            visibility: visible;
          }
          #print-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm !important;
            margin: 0 !important;
            padding: 5mm !important;
          }
          @page {
            margin: 0;
            size: 80mm auto;
          }
        }
      `}} />
    </div>
  );
}
