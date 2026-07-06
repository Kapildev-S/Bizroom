"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Loader2, Plus, Minus, Search, Printer, Banknote, Smartphone,
  ArrowLeft, ArrowRight, Trash, Settings, Bluetooth, BluetoothConnected,
  BluetoothOff, RefreshCw, Zap, CheckCircle2, XCircle, WifiOff, Weight,
  Scale, Package
} from "lucide-react";
import Link from 'next/link';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, doc, getDoc, updateDoc, Timestamp, getDocsFromCache, getDocFromCache, setDoc } from 'firebase/firestore';
import type { Product, Invoice, InvoiceItem, AppSettings } from '@/lib/mockData';
import { useAuth } from "@/lib/useAuth";
import { useProducts, useSettings } from "@/lib/hooks/useData";
import { getCurrencySymbol } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  isBluetoothAvailable, isCapacitorBluetooth, isWebBluetoothAvailable,
  listDevices, connectPrinter, disconnectPrinter,
  writeToPrinter, generateReceiptPayload, generateTestPrintPayload, isPrinterConnected,
  getWebBluetoothDeviceName, connectWebBluetooth,
  type BluetoothPrinterDevice,
} from '@/lib/printer';

// ─── Types ────────────────────────────────────────────────────────────────────
type CartItem = InvoiceItem & { id: string; image?: string; soldBy?: 'piece' | 'weight'; weightInGrams?: number };
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'disconnecting';

const STORAGE_KEYS = {
  PRINTER_MAC: 'pos_printer_mac',
  PRINTER_NAME: 'pos_printer_name',
};

/** Returns true if Web Bluetooth (not APK) is the active engine. */
const usingWebBluetooth = () => isWebBluetoothAvailable() && !isCapacitorBluetooth();

// ─── Printer Status Badge ─────────────────────────────────────────────────────
function PrinterStatusBadge({ status }: { status: ConnectionStatus }) {
  const cfg = {
    connected: { icon: BluetoothConnected, label: 'Connected', cls: 'bg-green-100 text-green-700 border-green-200' },
    connecting: { icon: Loader2, label: 'Connecting…', cls: 'bg-blue-100  text-blue-700  border-blue-200' },
    disconnecting: { icon: Loader2, label: 'Disconnecting…', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    disconnected: { icon: BluetoothOff, label: 'Disconnected', cls: 'bg-gray-100  text-gray-500  border-gray-200' },
  }[status];

  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className={`h-3.5 w-3.5 ${status === 'connecting' || status === 'disconnecting' ? 'animate-spin' : ''}`} />
      {cfg.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function POSPage() {
  // ── Product / App state ──────────────────────────────────────────────────
  const { products, isLoading: productsLoading } = useProducts();
  const { settings, mutate: mutateSettings, isLoading: settingsLoading } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [saving, setSaving] = useState(false);
  const loading = productsLoading || settingsLoading;
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // ── Weight-based product state ───────────────────────────────────────────
  const [isWeightDialogOpen, setIsWeightDialogOpen] = useState(false);
  const [weightProduct, setWeightProduct] = useState<Product | null>(null);
  const [weightInput, setWeightInput] = useState('');
  const [weightUnit, setWeightUnit] = useState<'g' | 'kg'>('g');

  // ── Dual-unit product state ───────────────────────────────────────────────
  const [dualUnitProduct, setDualUnitProduct] = useState<Product | null>(null);

  // ── Printer state ─────────────────────────────────────────────────────────
  const [devices, setDevices] = useState<BluetoothPrinterDevice[]>([]);
  const [savedPrinterMac, setSavedPrinterMac] = useState<string | null>(null);
  const [savedPrinterName, setSavedPrinterName] = useState<string | null>(null);
  const [webDeviceName, setWebDeviceName] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isScanning, setIsScanning] = useState(false);
  const [isTestPrinting, setIsTestPrinting] = useState(false);
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);
  // Track whether we opened the modal for the first time (auto-scan)
  const hasAutoScanned = useRef(false);

  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  // ── Load data on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    // Load printer connection independently
    const initPrinter = async () => {
      const mac = localStorage.getItem(STORAGE_KEYS.PRINTER_MAC);
      const name = localStorage.getItem(STORAGE_KEYS.PRINTER_NAME);
      
      if (mac) setSavedPrinterMac(mac);
      if (name) setSavedPrinterName(name);

      if (isBluetoothAvailable()) {
        try {
          const alreadyConnected = await isPrinterConnected();
          if (alreadyConnected) {
            setConnectionStatus('connected');
            if (!isCapacitorBluetooth()) {
               const webName = getWebBluetoothDeviceName();
               if (webName) setWebDeviceName(webName);
            }
          } else if (mac && isCapacitorBluetooth()) {
            // Only auto-reconnect on Capacitor. Web Bluetooth requires a user gesture!
            setConnectionStatus('connecting');
            await connectPrinter(mac);
            setConnectionStatus('connected');
          } else {
            setConnectionStatus('disconnected');
          }
        } catch {
          setConnectionStatus('disconnected');
        }
      }
    };
    initPrinter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // ── Printer actions ───────────────────────────────────────────────────────

  // Web Bluetooth: opens browser popup to pick a printer
  const handleWebBluetoothConnect = useCallback(async () => {
    setConnectionStatus('connecting');
    try {
      const { name } = await connectWebBluetooth();
      setWebDeviceName(name);
      setConnectionStatus('connected');
      toast({ title: '🖨️ Printer Connected', description: `${name} is ready to print.` });
    } catch (err: any) {
      setConnectionStatus('disconnected');
      if (err.name !== 'NotFoundError') { // User cancelled = silent
        toast({ variant: 'destructive', title: 'Connection Failed', description: err.message });
      }
    }
  }, [toast]);

  // Capacitor APK: list pre-paired devices
  const scanForPrinters = useCallback(async () => {
    if (!isCapacitorBluetooth()) return;
    setIsScanning(true);
    try {
      const found = await listDevices();
      setDevices(found);
      if (found.length === 0) {
        toast({ title: 'No devices found', description: 'Pair your printer via Android Bluetooth settings first.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Scan Failed', description: err.message });
    } finally {
      setIsScanning(false);
    }
  }, [toast]);

  const handleConnect = useCallback(async (mac: string, name: string) => {
    if (!isBluetoothAvailable()) return;
    setConnectionStatus('connecting');
    try {
      // If already connected to something, disconnect first
      const already = await isPrinterConnected();
      if (already) await disconnectPrinter();

      await connectPrinter(mac);
      setConnectionStatus('connected');

      // Persist selection
      localStorage.setItem(STORAGE_KEYS.PRINTER_MAC, mac);
      localStorage.setItem(STORAGE_KEYS.PRINTER_NAME, name);
      setSavedPrinterMac(mac);
      setSavedPrinterName(name);

      toast({ title: "Printer Connected", description: `${name || mac} is ready.` });
    } catch (err: any) {
      setConnectionStatus('disconnected');
      toast({ variant: "destructive", title: "Connection Failed", description: err.message });
    }
  }, [toast]);

  const handleDisconnect = useCallback(async () => {
    setConnectionStatus('disconnecting');
    try {
      await disconnectPrinter();
      setConnectionStatus('disconnected');
      setWebDeviceName(null);
      toast({ title: 'Printer Disconnected' });
    } catch (err: any) {
      setConnectionStatus('disconnected');
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  }, [toast]);

  const handleTestPrint = useCallback(async () => {
    if (connectionStatus !== 'connected') {
      toast({ variant: "destructive", title: "Not Connected", description: "Connect to a printer first." });
      return;
    }
    setIsTestPrinting(true);
    try {
      const businessName = settings?.businessProfile?.businessName || 'My Bakery';
      const payload = generateTestPrintPayload(businessName);
      await writeToPrinter(payload);
      toast({ title: "Test Print Sent ✓", description: "Check your printer for the test receipt." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Print Failed", description: err.message });
    } finally {
      setIsTestPrinting(false);
    }
  }, [connectionStatus, settings, toast]);

  // Auto-scan the first time the settings modal opens
  const handleSettingsOpenChange = useCallback((open: boolean) => {
    setIsPrinterSettingsOpen(open);
    if (open && !hasAutoScanned.current) {
      hasAutoScanned.current = true;
      scanForPrinters();
    }
  }, [scanForPrinters]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const openWeightDialog = useCallback((product: Product) => {
    setWeightProduct(product);
    setWeightInput('');
    setWeightUnit('g');
    setIsWeightDialogOpen(true);
  }, []);

  const closeWeightDialog = useCallback(() => {
    setIsWeightDialogOpen(false);
    setWeightProduct(null);
    setWeightInput('');
  }, []);

  const getWeightInGrams = useCallback((input: string, unit: 'g' | 'kg'): number => {
    const val = parseFloat(input);
    if (isNaN(val) || val <= 0) return 0;
    return unit === 'kg' ? val * 1000 : val;
  }, []);

  const getCalculatedAmount = useCallback((product: Product, grams: number): number => {
    // price is per kg, convert grams to kg
    const kg = grams / 1000;
    const pricePerKg = product.soldBy === 'both' ? (product.pricePerKg || product.price) : product.price;
    return kg * pricePerKg;
  }, []);

  const addWeightToCart = useCallback(() => {
    if (!weightProduct) return;
    const grams = getWeightInGrams(weightInput, weightUnit);
    if (grams <= 0) return;

    const calculatedAmount = getCalculatedAmount(weightProduct, grams);
    const kg = grams / 1000;

    setCart(prev => {
      // Generate a unique id for this weight-based entry (same product can be added multiple times with different weights)
      const weightKey = `${weightProduct.id}_w${grams}`;
      const existing = prev.find(i => i.id === weightKey);
      if (existing) {
        return prev.map(i =>
          i.id === weightKey
            ? { ...i, quantity: i.quantity + kg, totalPrice: i.totalPrice + calculatedAmount, weightInGrams: (i.weightInGrams || 0) + grams }
            : i
        );
      }
      return [...prev, {
        id: weightKey,
        productId: weightProduct.id,
        productName: weightProduct.name,
        quantity: kg,
        unitPrice: weightProduct.soldBy === 'both' ? (weightProduct.pricePerKg || weightProduct.price) : weightProduct.price,
        totalPrice: calculatedAmount,
        image: weightProduct.imageUrl,
        soldBy: 'weight',
        weightInGrams: grams,
        gstRate: weightProduct.gstRate,
        hsnCode: weightProduct.hsnCode,
      }];
    });

    closeWeightDialog();
  }, [weightProduct, weightInput, weightUnit, getWeightInGrams, getCalculatedAmount, closeWeightDialog]);

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const openDualUnitDialog = useCallback((product: Product) => {
    setDualUnitProduct(product);
  }, []);

  const closeDualUnitDialog = useCallback(() => {
    setDualUnitProduct(null);
  }, []);

  const addPieceToCart = useCallback((product: Product) => {
    const priceToUse = product.soldBy === 'both' ? (product.pricePerPiece || product.price) : product.price;
    const idKey = product.soldBy === 'both' ? `${product.id}_p` : product.id;

    setCart(prev => {
      const existing = prev.find(i => i.id === idKey);
      if (existing) {
        return prev.map(i =>
          i.id === idKey
            ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice }
            : i
        );
      }
      return [...prev, {
        id: idKey, productId: product.id, productName: product.name,
        quantity: 1, unitPrice: priceToUse, totalPrice: priceToUse,
        image: product.imageUrl,
        soldBy: 'piece',
        gstRate: product.gstRate,
        hsnCode: product.hsnCode,
      }];
    });
  }, []);

  const selectUnitForDual = useCallback((type: 'piece' | 'weight') => {
    if (!dualUnitProduct) return;
    const prod = dualUnitProduct;
    closeDualUnitDialog();
    
    if (type === 'weight') {
      openWeightDialog(prod);
    } else {
      addPieceToCart(prod);
    }
  }, [dualUnitProduct, closeDualUnitDialog, openWeightDialog, addPieceToCart]);

  const addToCart = useCallback((product: Product) => {
    if (product.soldBy === 'both') {
      openDualUnitDialog(product);
      return;
    }
    if (product.soldBy === 'weight') {
      openWeightDialog(product);
      return;
    }
    addPieceToCart(product);
  }, [openDualUnitDialog, openWeightDialog, addPieceToCart]);

  const updateQuantity = useCallback((id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i;

      // For weight-based items, adjust weight in grams instead of quantity
      if (i.soldBy === 'weight' && i.weightInGrams) {
        const newGrams = Math.max(100, i.weightInGrams + delta * 100); // +/- adjusts by 100g
        const kg = newGrams / 1000;
        return {
          ...i,
          weightInGrams: newGrams,
          quantity: kg,
          totalPrice: kg * i.unitPrice,
        };
      }
      // Piece-based items: adjust by whole units
      return { ...i, quantity: Math.max(1, i.quantity + delta), totalPrice: Math.max(1, i.quantity + delta) * i.unitPrice };
    }));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  // ── Derived values ────────────────────────────────────────────────────────
  const subtotal = cart.reduce((s, i) => s + i.totalPrice, 0);
  const taxAmount = 0;
  const total = subtotal;

  const currency = settings?.invoiceSettings?.currency || 'INR';
  const currencySymbol = getCurrencySymbol(currency);
  const businessName = settings?.businessProfile?.businessName || 'My Bakery';

  const categories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => { if (p.category) cats.add(p.category); });
    return ['All', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() =>
    products.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedCategory === 'All' || p.category === selectedCategory)
    ), [products, searchQuery, selectedCategory]);

  // ── Pay & Print ───────────────────────────────────────────────────────────
  const handlePayAndPrint = async () => {
    if (!currentUser || cart.length === 0) return;

    if (connectionStatus !== 'connected') {
      toast({ variant: 'destructive', title: 'Printer Not Connected', description: 'Open Printer Settings and connect a printer first.' });
      setIsPrinterSettingsOpen(true);
      return;
    }

    setSaving(true);
    try {
      // 1. Save invoice
      const now = new Date();
      const seq = settings?.invoiceSettings?.nextInvoiceSequence ?? 1;
      const prefix = settings?.businessProfile?.invoicePrefix ?? 'INV-';
      const invoiceNumber = `${prefix}${seq.toString().padStart(4, '0')}`;

      const newInvoice: Partial<Invoice> & { createdAt: Timestamp } = {
        invoiceNumber,
        customerName: 'Walk-in Customer',
        issueDate: now.toISOString(),
        dueDate: now.toISOString(),
        invoiceType: 'Retail',
        items: cart.map(c => ({
          productId: c.productId, productName: c.productName,
          quantity: c.quantity, unitPrice: c.unitPrice, totalPrice: c.totalPrice,
          gstRate: 0, taxAmount: 0
        })),
        subtotal, taxRate: 0, taxAmount: 0, totalAmount: total,
        status: 'paid', currency,
        notes: `POS Sale – Paid via ${paymentMode.toUpperCase()}`,
        createdAt: Timestamp.now(),
      };
      
      const newInvoiceRef = doc(collection(db, `users/${currentUser.uid}/invoices`));
      // Save locally and sync in background to unblock printing when offline
      setDoc(newInvoiceRef, newInvoice).catch(console.error);

      // 2. Increment nextInvoiceSequence in Firestore and local state so the
      //    next sale always gets the next sequential invoice number.
      const nextSeq = seq + 1;
      updateDoc(
        doc(db, `users/${currentUser.uid}/settings`, 'appSettings'),
        { 'invoiceSettings.nextInvoiceSequence': nextSeq }
      ).then(() => {
        // Optimistically update settings cache
        mutateSettings((prev) => prev ? {
          ...prev,
          invoiceSettings: {
            ...prev.invoiceSettings,
            nextInvoiceSequence: nextSeq,
          }
        } : prev, false);
      }).catch(console.error);

      // 3. Print receipt
      try {
        const payload = generateReceiptPayload(
          settings?.businessProfile || { businessName },
          invoiceNumber,
          cart,
          subtotal,
          taxAmount,
          total,
          paymentMode,
          currencySymbol
        );
        await writeToPrinter(payload);
      } catch (printErr: any) {
        console.error('Print failed:', printErr);
        toast({ variant: 'destructive', title: 'Print Failed', description: 'Invoice saved. Could not reach printer – reconnect in settings.' });
        setConnectionStatus('disconnected');
      }

      clearCart();
      toast({ title: "Order Complete ✓", description: "Invoice saved and receipt printed." });
    } catch (err) {
      console.error("Save error:", err);
      toast({ variant: "destructive", title: "Error", description: "Failed to save the invoice." });
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FB]">
        <Loader2 className="h-8 w-8 animate-spin text-[#E87B1E]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full bg-[#F8F9FB] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <div className="h-16 bg-white border-b flex items-center px-4 md:px-6 justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-gray-100 shrink-0">
            <Link href="/dashboard"><ArrowLeft className="h-5 w-5 text-[#1a2b4b]" /></Link>
          </Button>
          <div className="relative w-40 sm:w-64 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search products…"
              className="pl-9 bg-gray-50 border-gray-200 rounded-full focus-visible:ring-[#E87B1E]"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-[#1a2b4b] hidden md:block">{businessName}</span>

          {/* Printer status indicator in header */}
          <PrinterStatusBadge status={connectionStatus} />

          {/* ── Printer Settings Modal ──────────────────────────────────── */}
          <Dialog open={isPrinterSettingsOpen} onOpenChange={handleSettingsOpenChange}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full shadow-sm relative">
                <Settings className="h-4 w-4 text-gray-600" />
                {connectionStatus === 'connected' && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                )}
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-[#1a2b4b]">
                  <Printer className="h-5 w-5" /> Bluetooth Printer Settings
                </DialogTitle>
                <DialogDescription>
                  {usingWebBluetooth()
                    ? 'Click "Connect Printer" to open the browser Bluetooth picker and select your thermal printer.'
                    : 'Pair, connect, and test your 80mm ESC/POS thermal printer.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 pt-2">

                {/* ── Current printer status card ─────────────────────── */}
                <div className="rounded-xl border bg-gray-50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {connectionStatus === 'connected'
                        ? <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><BluetoothConnected className="h-5 w-5 text-green-600" /></div>
                        : <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center"><BluetoothOff className="h-5 w-5 text-gray-400" /></div>
                      }
                      <div>
                        <p className="font-semibold text-sm text-[#1a2b4b]">
                          {usingWebBluetooth()
                            ? (webDeviceName || (connectionStatus === 'connected' ? 'Printer Connected' : 'No printer selected'))
                            : (savedPrinterName || savedPrinterMac || 'No printer selected')}
                        </p>
                        {!usingWebBluetooth() && savedPrinterMac && savedPrinterName && (
                          <p className="text-xs text-gray-400 font-mono">{savedPrinterMac}</p>
                        )}
                        {usingWebBluetooth() && connectionStatus === 'connected' && (
                          <p className="text-xs text-green-600">✓ Ready to print</p>
                        )}
                      </div>
                    </div>
                    <PrinterStatusBadge status={connectionStatus} />
                  </div>

                  {/* Action buttons row */}
                  <div className="flex gap-2">
                    {/* Connect button for Web Bluetooth */}
                    {usingWebBluetooth() && connectionStatus !== 'connected' && (
                      <Button
                        size="sm"
                        className="flex-1 bg-[#E87B1E] hover:bg-[#d66a15] text-white"
                        disabled={connectionStatus === 'connecting'}
                        onClick={handleWebBluetoothConnect}
                      >
                        {connectionStatus === 'connecting'
                          ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Connecting…</>
                          : <><Bluetooth className="h-4 w-4 mr-1" /> Connect Printer</>}
                      </Button>
                    )}

                    {/* Disconnect */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                      disabled={connectionStatus !== 'connected'}
                      onClick={handleDisconnect}
                    >
                      {connectionStatus === 'disconnecting'
                        ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        : <XCircle className="h-4 w-4 mr-1" />}
                      Disconnect
                    </Button>

                    {/* Test Print */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-[#E87B1E] border-orange-200 hover:bg-orange-50"
                      disabled={connectionStatus !== 'connected' || isTestPrinting}
                      onClick={handleTestPrint}
                    >
                      {isTestPrinting
                        ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        : <Zap className="h-4 w-4 mr-1" />}
                      Test Print
                    </Button>
                  </div>
                </div>

                {/* ── Web Bluetooth hint / APK device list ────────────── */}
                {usingWebBluetooth() ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700 space-y-2">
                    <p className="font-semibold flex items-center gap-2"><Bluetooth className="h-4 w-4" /> How it works</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-600 text-xs leading-relaxed">
                      <li>Click <strong>Connect Printer</strong> above.</li>
                      <li>Chrome will show a popup listing nearby Bluetooth devices.</li>
                      <li>Select your thermal printer from the list.</li>
                      <li>Click <strong>Test Print</strong> to verify it works.</li>
                      <li>From now on, clicking <strong>PAY &amp; PRINT</strong> instantly sends the receipt!</li>
                    </ol>
                    <p className="text-[11px] text-blue-500 pt-1">⚠️ Web Bluetooth requires <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>. It does not work in Firefox or Safari.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#1a2b4b]">Paired Devices</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#E87B1E] hover:bg-orange-50 h-8"
                        onClick={scanForPrinters}
                        disabled={isScanning}
                      >
                        {isScanning
                          ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                          : <RefreshCw className="h-4 w-4 mr-1.5" />}
                        {isScanning ? 'Scanning…' : 'Scan'}
                      </Button>
                    </div>

                    <div className="border rounded-xl overflow-hidden divide-y max-h-64 overflow-y-auto">
                      {isScanning ? (
                        <div className="p-6 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                          <Loader2 className="h-6 w-6 animate-spin text-[#E87B1E]" />
                          Scanning for paired devices…
                        </div>
                      ) : devices.length === 0 ? (
                        <div className="p-6 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                          <WifiOff className="h-6 w-6 opacity-40" />
                          <span>No paired devices found.<br />Pair your printer in Android Bluetooth Settings first.</span>
                        </div>
                      ) : (
                        devices.map(device => {
                          const isActive = savedPrinterMac === device.address && connectionStatus === 'connected';
                          const isSaved = savedPrinterMac === device.address;
                          return (
                            <div key={device.address} className={`p-3 flex items-center justify-between ${isActive ? 'bg-green-50' : 'hover:bg-gray-50'} transition-colors`}>
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
                                  {isActive
                                    ? <BluetoothConnected className="h-4 w-4 text-green-600" />
                                    : <Bluetooth className="h-4 w-4 text-gray-400" />}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-[#1a2b4b]">{device.name || 'Unknown Device'}</p>
                                  <p className="text-xs text-gray-400 font-mono">{device.address}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {isSaved && !isActive && (
                                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">SAVED</span>
                                )}
                                {isActive ? (
                                  <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> ACTIVE
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant={isSaved ? 'outline' : 'default'}
                                    className={`h-7 text-xs ${isSaved ? 'border-[#E87B1E] text-[#E87B1E] hover:bg-orange-50' : 'bg-[#E87B1E] hover:bg-[#d66a15] text-white'}`}
                                    onClick={() => handleConnect(device.address, device.name)}
                                    disabled={connectionStatus === 'connecting'}
                                  >
                                    {connectionStatus === 'connecting' && savedPrinterMac === device.address
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : 'Connect'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      💡 MAC address and device name are stored in local storage and the app automatically reconnects on next startup.
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row h-[calc(100vh-64px)] w-full overflow-hidden">

        {/* ── Left: Products ────────────────────────────────────────────── */}
        <div className="w-full md:w-[70%] flex flex-col h-[55%] md:h-full overflow-hidden">
          <div className="px-4 md:px-8 pt-4 md:pt-6 pb-2 flex flex-col gap-4 shrink-0">
            {/* ── Categories at the top for quick filtering ── */}
            {categories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap border ${selectedCategory === cat
                      ? 'bg-[#1a2b4b] text-white border-[#1a2b4b] shadow-md'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-[#1a2b4b]">Available Products</h2>
              <div className="flex bg-white rounded-lg p-1 border shadow-sm">
                {(['list', 'grid'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${viewMode === mode ? 'bg-[#E87B1E] text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    {mode === 'list' ? 'List' : 'Grid'} View
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ScrollArea className="flex-grow px-4 md:px-8 pb-4 md:pb-8">
            <div className={`grid gap-3 md:gap-5 pt-4 ${viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}>
              {filteredProducts.map(product => (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`cursor-pointer bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group flex ${viewMode === 'list' ? 'flex-row items-center p-3 gap-4' : 'flex-col'}`}
                >
                  <div className={`${viewMode === 'list' ? 'w-16 h-16 rounded-xl shrink-0' : 'w-full aspect-[4/3]'} bg-gray-100 relative overflow-hidden`}>
                    {product.imageUrl
                      ? <Image src={product.imageUrl} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                      : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-gray-300 bg-gray-50">{product.name.charAt(0)}</div>
                    }
                    {/* Sold by badge */}
                    {product.soldBy === 'weight' && (
                      <span className="absolute top-2 left-2 bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                        <Weight className="h-3 w-3" /> /kg
                      </span>
                    )}
                  </div>
                  <div className={`flex flex-col ${viewMode === 'list' ? 'flex-grow py-1' : 'p-4'}`}>
                    <h3 className="font-bold text-[#1a2b4b] text-sm leading-snug mb-1">{product.name}</h3>
                    <div className="flex justify-between items-center mt-auto pt-1">
                      <span className="font-bold text-[#E87B1E]">{currencySymbol}{product.price.toFixed(2)}</span>
                      <button
                        className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-[#E87B1E] group-hover:text-white transition-colors"
                      >
                        {product.soldBy === 'weight' ? <Weight className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="col-span-full py-20 text-center text-gray-400">No products found in this category.</div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* ── Right: Cart ───────────────────────────────────────────────── */}
        <div className="w-full md:w-[30%] bg-white border-t md:border-t-0 md:border-l shadow-xl flex flex-col shrink-0 h-[45%] md:h-full z-20">
          <div className="p-4 md:p-6 border-b flex justify-between items-center shrink-0">
            <div>
              <h2 className="font-bold text-2xl text-[#1a2b4b]">Current Order</h2>
              <p className="text-xs text-gray-400 mt-0.5">{cart.length} item{cart.length !== 1 ? 's' : ''} · Walk-in Customer</p>
            </div>
            <button onClick={clearCart} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Clear order">
              <Trash className="h-5 w-5" />
            </button>
          </div>

          <ScrollArea className="flex-grow p-4 md:p-6">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 pt-10">
                <Printer className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg font-medium text-gray-400">Your order is empty</p>
                <p className="text-sm text-gray-300">Add products to start billing</p>
              </div>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 relative shrink-0 overflow-hidden">
                      {item.image
                        ? <Image src={item.image} alt={item.productName} fill className="object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-300 font-bold">{item.productName.charAt(0)}</div>}
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm text-[#1a2b4b] pr-2 leading-snug">{item.productName}</span>
                        <span className="font-bold text-sm text-[#1a2b4b] whitespace-nowrap">{currencySymbol}{item.totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <button onClick={() => updateQuantity(item.id, -1)} className="h-6 w-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"><Minus className="h-3 w-3" /></button>
                        <span className="text-xs font-bold w-12 text-center text-[#1a2b4b]">
                          {item.soldBy === 'weight'
                            ? `${Number(item.quantity.toFixed(3))}kg`
                            : item.quantity
                          }
                        </span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="h-6 w-6 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100"><Plus className="h-3 w-3" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Cart footer */}
          <div className="p-4 md:p-6 bg-[#fafafa] border-t shrink-0">
            <div className="space-y-1.5 mb-3 md:mb-5">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Subtotal</span><span className="font-semibold text-[#1a2b4b]">{currencySymbol}{subtotal.toFixed(2)}</span></div>
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm"><span className="text-gray-500">Tax {settings?.invoiceSettings?.enableAdvancedInvoiceSystem ? '' : `(${(settings?.invoiceSettings as any)?.taxRate || 0}%)`}</span><span className="font-semibold text-[#1a2b4b]">{currencySymbol}{taxAmount.toFixed(2)}</span></div>
              )}
              <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-200">
                <span className="text-lg font-bold text-[#1a2b4b]">Total</span>
                <span className="text-2xl font-bold text-[#E87B1E]">{currencySymbol}{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment mode */}
            <div className="grid grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4">
              {(['cash', 'upi'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  className={`py-2 md:py-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${paymentMode === mode
                    ? 'border-[#E87B1E] bg-[#fff8f3] text-[#E87B1E]'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                    }`}
                >
                  {mode === 'cash' ? <Banknote className="h-5 w-5 md:h-6 md:w-6" /> : <Smartphone className="h-5 w-5 md:h-6 md:w-6" />}
                  <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider">{mode}</span>
                </button>
              ))}
            </div>

            {/* PAY NOW */}
            <button
              className="w-full bg-[#E87B1E] hover:bg-[#d66a15] text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:shadow-none"
              disabled={cart.length === 0 || saving}
              onClick={handlePayAndPrint}
            >
              {saving
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <><Printer className="h-5 w-5" /> PAY &amp; PRINT <ArrowRight className="h-5 w-5" /></>}
            </button>

            {/* Printer warning if not connected */}
            {connectionStatus !== 'connected' && (
              <p className="text-center text-[11px] text-amber-600 font-medium mt-3 flex items-center justify-center gap-1">
                <BluetoothOff className="h-3.5 w-3.5" />
                Printer not connected – tap <Settings className="h-3 w-3 mx-0.5" /> to connect
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Weight Entry Dialog ───────────────────────────────────────── */}
      <Dialog open={isWeightDialogOpen} onOpenChange={(open) => { if (!open) closeWeightDialog(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#1a2b4b]">
              <Weight className="h-5 w-5 text-purple-600" />
              Enter Weight — {weightProduct?.name || ''}
            </DialogTitle>
            <DialogDescription>
              Weight-based product · Price: {currencySymbol}{(weightProduct?.soldBy === 'both' ? (weightProduct.pricePerKg || weightProduct.price) : (weightProduct?.price || 0)).toFixed(2)} / kg
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Unit toggle */}
            <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
              {(['g', 'kg'] as const).map(unit => (
                <button
                  key={unit}
                  onClick={() => { setWeightUnit(unit); setWeightInput(''); }}
                  className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${weightUnit === unit ? 'bg-white text-[#1a2b4b] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  {unit === 'g' ? 'Grams (g)' : 'Kilograms (kg)'}
                </button>
              ))}
            </div>

            {/* Weight input */}
            <div className="relative">
              <Input
                type="number"
                step={weightUnit === 'g' ? '1' : '0.1'}
                min="0"
                placeholder={weightUnit === 'g' ? 'e.g. 500' : 'e.g. 0.5'}
                value={weightInput}
                onChange={e => setWeightInput(e.target.value)}
                className="text-lg font-bold text-center h-14 rounded-xl border-2 focus-visible:ring-purple-500"
                autoFocus
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">
                {weightUnit}
              </span>
            </div>

            {/* Auto-calculated amount */}
            {weightProduct && (() => {
              const grams = getWeightInGrams(weightInput, weightUnit);
              const amount = getCalculatedAmount(weightProduct, grams);
              return (
                <div className="rounded-xl bg-purple-50 border border-purple-100 p-4 text-center">
                  <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider">Calculated Amount</p>
                  <p className="text-3xl font-bold text-purple-700 mt-1">
                    {grams > 0 ? `${currencySymbol}${amount.toFixed(2)}` : '—'}
                  </p>
                  <p className="text-xs text-purple-500 mt-1">
                    {grams > 0 ? `${grams >= 1000 ? (grams / 1000).toFixed(3) : grams} ${grams >= 1000 ? 'kg' : 'g'} × ${currencySymbol}${weightProduct.price.toFixed(2)}/kg` : 'Enter a valid weight'}
                  </p>
                </div>
              );
            })()}

            {/* Add to cart button */}
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 text-lg font-bold rounded-xl"
              disabled={!weightInput || parseFloat(weightInput) <= 0}
              onClick={addWeightToCart}
            >
              <Weight className="h-5 w-5 mr-2" />
              Add to Cart
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* ── End Weight Entry Dialog ────────────────────────────────────── */}

      {/* Dual Unit Selection Dialog */}
      <Dialog open={!!dualUnitProduct} onOpenChange={(open) => !open && closeDualUnitDialog()}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl text-center">
          <DialogHeader>
            <DialogTitle className="text-center">How are you selling this?</DialogTitle>
          </DialogHeader>
          {dualUnitProduct && (
            <div className="py-6 space-y-4">
              <div className="flex flex-col gap-3">
                <Button 
                  variant="outline" 
                  className="h-16 text-lg justify-between px-6 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                  onClick={() => selectUnitForDual('piece')}
                >
                  <span className="flex items-center gap-3">
                    <Package className="h-5 w-5" /> By Piece
                  </span>
                  <span className="text-sm font-normal text-gray-500">
                    ₹{(dualUnitProduct.pricePerPiece || dualUnitProduct.price).toFixed(2)}/pc
                  </span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-16 text-lg justify-between px-6 border-purple-200 hover:bg-purple-50 hover:text-purple-700"
                  onClick={() => selectUnitForDual('weight')}
                >
                  <span className="flex items-center gap-3">
                    <Scale className="h-5 w-5" /> By Weight
                  </span>
                  <span className="text-sm font-normal text-gray-500">
                    ₹{(dualUnitProduct.pricePerKg || dualUnitProduct.price).toFixed(2)}/kg
                  </span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
