"use client";

import React from 'react';
import type { InvoiceItem } from '@/lib/mockData';
import { getCurrencySymbol } from '@/lib/utils';

interface ReceiptPrintViewProps {
  businessName?: string;
  cartItems: (InvoiceItem & { id: string })[];
  subtotal: number;
  total: number;
  taxAmount: number;
  paymentMode?: string;
  currency?: string;
  invoiceNo?: string;
  date?: string;
  time?: string;
  addressLine1?: string;
  addressLine2?: string;
  phone?: string;
  tagline?: string;
  enclaimQrUrl?: string;
}

export function ReceiptPrintView({
  businessName,
  tagline = "FRESH BAKES, EVERY DAY",
  addressLine1 = "12, Green Street, Anna Nagar,",
  addressLine2 = "Chennai - 600040",
  phone = "98765 43210",
  invoiceNo = "INV-000123",
  date,
  time,
  cartItems,
  subtotal,
  total,
  taxAmount,
  paymentMode,
  currency = "INR",
  enclaimQrUrl,
}: ReceiptPrintViewProps) {
  const currencySymbol = getCurrencySymbol(currency);
  const now = new Date();
  
  const displayDate = date || now.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const displayTime = time || now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div id="print-receipt" className="hidden print:block font-sans text-black bg-white" style={{ width: '80mm', margin: '0 auto', padding: '10px' }}>
      <div className="text-center mb-4">
        <div style={{ fontFamily: 'Impact, sans-serif, "Arial Black"', fontSize: '1.5rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '-0.025em', marginBottom: '0.5rem', textAlign: 'center', width: '100%', display: 'block' }}>
          {businessName || "SWEET BAKE BAKERY"}
        </div>
        <p className="text-sm mb-3">{tagline}</p>
        <p className="text-sm">{addressLine1}</p>
        <p className="text-sm">{addressLine2}</p>
        <p className="text-sm mt-1">Phone: {phone}</p>
      </div>

      <div className="border-t-[1.5px] border-black border-dashed my-3"></div>

      <div className="text-center mb-3">
        <h3 className="text-lg font-bold uppercase tracking-widest">INVOICE</h3>
      </div>

      <div className="text-xs text-center mb-3">
        Invoice No : {invoiceNo} &nbsp;|&nbsp; Date : {displayDate} &nbsp;|&nbsp; Time : {displayTime}
      </div>

      <div className="border-t-[1.5px] border-black border-dashed my-3"></div>

      <table className="w-full text-sm mb-1" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="border-b-[1.5px] border-black text-left">
            <th className="py-2 font-bold w-[12%]">S.No</th>
            <th className="py-2 font-bold w-[48%]">Item Name</th>
            <th className="py-2 font-bold text-center w-[12%]">Qty</th>
            <th className="py-2 font-bold text-right w-[14%]">Price</th>
            <th className="py-2 font-bold text-right w-[14%]">Amount</th>
          </tr>
        </thead>
        <tbody>
          {cartItems.map((item, idx) => (
            <tr key={idx} className={idx !== cartItems.length - 1 ? "border-b-[1.5px] border-black border-dashed" : "border-b-[1.5px] border-black"}>
              <td className="py-2.5 align-top">{idx + 1}</td>
              <td className="py-2.5 align-top pr-2">{item.productName}</td>
              <td className="py-2.5 align-top text-center">
                {/* @ts-expect-error - CartItem has soldBy property when passed from POS */}
                {item.soldBy === 'weight' ? `${Number(item.quantity.toFixed(3))}kg` : item.quantity}
              </td>
              <td className="py-2.5 align-top text-right">{item.totalPrice.toFixed(2)}</td>
              <td className="py-2.5 align-top text-right">{(item.quantity * item.totalPrice).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between items-center py-3">
        <span className="text-lg font-bold">TOTAL</span>
        <span className="text-lg font-bold">{currencySymbol} {total.toFixed(2)}</span>
      </div>

      <div className="border-t-[1.5px] border-black border-dashed my-1 mb-4"></div>

      <div className="text-center text-sm font-bold space-y-1">
        <p className="text-base uppercase">THANK YOU!</p>
        <p className="flex items-center justify-center gap-2">
          <span>&hearts;</span> VISIT AGAIN <span>&hearts;</span>
        </p>
      </div>

      <div className="mt-6 pt-2 border-t border-dashed border-gray-300 flex justify-between items-end text-[10px] pb-4">
        <div className="font-bold text-black pb-1">
          Powered by Bizroom
        </div>
        {enclaimQrUrl && (
          <div className="flex flex-col items-center">
            <span className="font-bold text-black mb-1">Download to claim</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enclaimQrUrl} alt="Enclaim QR" className="w-16 h-16 object-contain grayscale" />
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            margin: 0;
            size: 80mm auto;
          }
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
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji" !important;
            color: black !important;
            text-align: left !important;
          }
          #print-receipt .text-center {
            text-align: center !important;
          }
          #print-receipt h2 {
            text-align: center !important;
            width: 100% !important;
            display: block !important;
          }
        }
      `}} />
    </div>
  );
}
