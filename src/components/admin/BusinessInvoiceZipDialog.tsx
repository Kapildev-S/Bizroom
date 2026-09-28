"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { Loader2, Download, FileArchive } from 'lucide-react';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/useAuth';
import { getPaperDimensions, isLandscapePaper } from '@/lib/paperSize';
import type { Invoice } from '@/lib/mockData';
import {
  fetchBusinessInvoicesForExport,
  type BusinessInvoiceExportData
} from '@/app/actions/adminInvoiceExportActions';

import ClassicInvoice from '@/components/invoices/templates/ClassicInvoice';
import ModernInvoice from '@/components/invoices/templates/ModernInvoice';
import StylishInvoice from '@/components/invoices/templates/StylishInvoice';
import ProfessionalInvoice from '@/components/invoices/templates/ProfessionalInvoice';
import GstTaxInvoice from '@/components/invoices/templates/GstTaxInvoice';

interface BusinessInvoiceZipDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: { id: string; businessName: string } | null;
}

type Phase = 'idle' | 'loading' | 'ready' | 'rendering' | 'zipping' | 'done' | 'error';

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const slugify = (value: string) =>
  (value || 'business').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'business';

// Windows/macOS both reject these in filenames, and a stray slash would silently
// create a nested folder inside the archive.
const safeFileName = (value: string) => value.replace(/[\\/:*?"<>|]/g, '-').trim() || 'invoice';

const asInputDate = (date: Date) => format(date, 'yyyy-MM-dd');

/**
 * Waits until the offscreen invoice is actually paintable - fonts resolved, logo
 * decoded, and two frames committed - so html2canvas never captures a half-laid-out
 * page. Every wait is raced against a timeout so one broken image can't stall a
 * multi-hundred-invoice export.
 */
const waitForRender = async (node: HTMLElement) => {
  const fonts = (document as any).fonts;
  if (fonts?.ready) {
    await Promise.race([fonts.ready, delay(1500)]);
  }

  const images = Array.from(node.querySelectorAll('img'));
  await Promise.race([
    Promise.all(images.map(img =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>(resolve => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          })
    )),
    delay(8000),
  ]);

  await new Promise<void>(resolve =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
};

export function BusinessInvoiceZipDialog({ open, onOpenChange, business }: BusinessInvoiceZipDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>('idle');
  const [data, setData] = useState<BusinessInvoiceExportData | null>(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [exportList, setExportList] = useState<Invoice[]>([]);
  const [renderIndex, setRenderIndex] = useState(-1);
  const [zipPercent, setZipPercent] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const captureRef = useRef<HTMLDivElement>(null);
  const zipRef = useRef<JSZip | null>(null);
  const usedNamesRef = useRef<Set<string>>(new Set());
  const cancelledRef = useRef(false);

  const settings = data?.settings ?? null;
  const paperSize = settings?.customizationSettings?.paperSize || 'A4';
  const customWidth = settings?.customizationSettings?.customWidth;
  const customHeight = settings?.customizationSettings?.customHeight;
  const customUnit = settings?.customizationSettings?.unit;
  const isLandscape = isLandscapePaper(paperSize, customWidth, customHeight);

  // Mirrors InvoiceView: the template is laid out at a fixed base width and the
  // resulting bitmap is then stretched onto the real paper size, so these PDFs are
  // byte-for-byte the same design the business downloads from its own invoice page.
  const baseWidth = isLandscape || paperSize === '4x3' ? 297 : 210;
  const baseHeight = isLandscape || paperSize === '4x3' ? 210 : 297;
  const template = settings?.customizationSettings?.template || 'classic';
  const paperClass = `paper-${paperSize.toLowerCase()} orientation-${isLandscape ? 'landscape' : 'portrait'}`;

  // Filtering happens here rather than in the server action so the range means the
  // same thing it does on the business's own Reports page - a local-time calendar
  // day. Filtering on a UTC server would shift late-evening IST bills into the
  // previous month, which is exactly the boundary that matters for GST periods.
  const selectedInvoices = useMemo(() => {
    const all = data?.invoices ?? [];
    const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : null;
    const toTime = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : null;

    return all.filter(invoice => {
      if (fromTime === null && toTime === null) return true;
      if (!invoice.issueDate) return false;
      const issued = new Date(invoice.issueDate).getTime();
      if (Number.isNaN(issued)) return false;
      if (fromTime !== null && issued < fromTime) return false;
      if (toTime !== null && issued > toTime) return false;
      return true;
    });
  }, [data, fromDate, toDate]);

  const applyPreset = (preset: 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisFy' | 'all') => {
    const now = new Date();

    if (preset === 'all') {
      setFromDate('');
      setToDate('');
      return;
    }
    if (preset === 'thisMonth') {
      setFromDate(asInputDate(new Date(now.getFullYear(), now.getMonth(), 1)));
      setToDate(asInputDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
      return;
    }
    if (preset === 'lastMonth') {
      setFromDate(asInputDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
      setToDate(asInputDate(new Date(now.getFullYear(), now.getMonth(), 0)));
      return;
    }
    if (preset === 'thisQuarter') {
      const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
      setFromDate(asInputDate(new Date(now.getFullYear(), quarterStartMonth, 1)));
      setToDate(asInputDate(new Date(now.getFullYear(), quarterStartMonth + 3, 0)));
      return;
    }
    // Indian financial year: 1 April to 31 March.
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    setFromDate(asInputDate(new Date(fyStartYear, 3, 1)));
    setToDate(asInputDate(new Date(fyStartYear + 1, 2, 31)));
  };

  const resetState = useCallback(() => {
    cancelledRef.current = true;
    zipRef.current = null;
    usedNamesRef.current = new Set();
    setPhase('idle');
    setData(null);
    setFromDate('');
    setToDate('');
    setExportList([]);
    setRenderIndex(-1);
    setZipPercent(0);
    setFailedCount(0);
    setError(null);
  }, []);

  useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  // Loads up front so the admin can see how many bills fall in a range before
  // committing to a render that may take minutes.
  const loadInvoices = useCallback(async () => {
    if (!user || !business) return;

    cancelledRef.current = false;
    setPhase('loading');
    setError(null);

    try {
      const idToken = await user.getIdToken();
      const exportData = await fetchBusinessInvoicesForExport(idToken, business.id);
      if (cancelledRef.current) return;

      setData(exportData);
      setPhase('ready');
    } catch (e: any) {
      if (cancelledRef.current) return;
      setError(e?.message || 'Could not load this business’s invoices.');
      setPhase('error');
    }
  }, [user, business]);

  useEffect(() => {
    if (open && phase === 'idle' && user && business) {
      loadInvoices();
    }
  }, [open, phase, user, business, loadInvoices]);

  const handleStart = () => {
    if (selectedInvoices.length === 0) {
      toast({ title: 'No bills in range', description: 'Widen the date range and try again.' });
      return;
    }
    cancelledRef.current = false;
    zipRef.current = new JSZip();
    usedNamesRef.current = new Set();
    setFailedCount(0);
    setZipPercent(0);
    setExportList(selectedInvoices);
    setRenderIndex(0);
    setPhase('rendering');
  };

  const rangeLabel = fromDate || toDate
    ? `${fromDate || 'start'}_to_${toDate || 'today'}`
    : 'all';

  const finish = useCallback(async () => {
    const zip = zipRef.current;
    if (!zip) return;

    setPhase('zipping');
    try {
      const blob = await zip.generateAsync(
        // PDFs already embed compressed PNGs, so heavy DEFLATE would burn time for
        // almost no size win.
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } },
        meta => setZipPercent(Math.round(meta.percent))
      );

      if (cancelledRef.current) return;

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${slugify(data?.businessName || business?.businessName || 'business')}-bills-${rangeLabel}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setPhase('done');
    } catch (e: any) {
      setError(e?.message || 'Could not build the ZIP file.');
      setPhase('error');
    }
  }, [business?.businessName, data?.businessName, rangeLabel]);

  // Drives the export one invoice at a time: each pass renders a single invoice
  // offscreen, waits for it to settle, captures it, and advances the index. Going
  // sequentially keeps peak memory to one canvas instead of one per invoice.
  useEffect(() => {
    if (phase !== 'rendering' || !data || renderIndex < 0) return;

    if (renderIndex >= exportList.length) {
      finish();
      return;
    }

    let abandoned = false;

    (async () => {
      const invoice = exportList[renderIndex];
      const node = captureRef.current;

      if (node) {
        try {
          await waitForRender(node);
          if (abandoned || cancelledRef.current) return;

          const canvas = await html2canvas(node, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            imageTimeout: 8000,
          });

          const imgData = canvas.toDataURL('image/png', 1.0);
          // Drop the backing store immediately - a few hundred A4 canvases at
          // scale 2 will exhaust the tab otherwise.
          canvas.width = 0;
          canvas.height = 0;

          const { width: pdfWidth, height: pdfHeight } =
            getPaperDimensions(paperSize, isLandscape, customWidth, customHeight, customUnit);

          const pdf = new jsPDF({
            orientation: pdfWidth > pdfHeight ? 'l' : 'p',
            unit: 'mm',
            format: [pdfWidth, pdfHeight],
          });
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

          const datePart = invoice.issueDate ? format(new Date(invoice.issueDate), 'yyyy-MM-dd') : 'undated';
          let fileName = safeFileName(`${invoice.invoiceNumber || invoice.id}_${datePart}`);
          if (usedNamesRef.current.has(fileName)) {
            fileName = `${fileName}_${invoice.id.slice(0, 6)}`;
          }
          usedNamesRef.current.add(fileName);

          zipRef.current?.file(`${fileName}.pdf`, pdf.output('arraybuffer'));
        } catch (e) {
          // One unrenderable invoice must not abort the whole archive.
          console.error(`Failed to render invoice ${invoice.invoiceNumber || invoice.id}:`, e);
          setFailedCount(count => count + 1);
        }
      }

      if (abandoned || cancelledRef.current) return;

      // Yield between invoices so the progress bar repaints and the GC gets a
      // chance to reclaim the canvas we just released.
      await delay(50);
      if (abandoned || cancelledRef.current) return;

      setRenderIndex(index => index + 1);
    })();

    return () => { abandoned = true; };
  }, [phase, renderIndex, data, exportList, finish, paperSize, isLandscape, customWidth, customHeight, customUnit]);

  const total = exportList.length;
  const completed = Math.min(renderIndex, total);
  const renderPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const busy = phase === 'loading' || phase === 'rendering' || phase === 'zipping';

  const currentInvoice = phase === 'rendering' && renderIndex >= 0 && renderIndex < total
    ? exportList[renderIndex]
    : null;

  const templateProps = currentInvoice && data ? {
    invoice: currentInvoice,
    customer: currentInvoice.customerId ? data.customersById[currentInvoice.customerId] ?? null : null,
    settings: data.settings,
    logoDataUri: data.logoDataUri,
    onImageLoad: () => {},
    onImageError: () => {},
    pageHeightMm: baseHeight,
  } : null;

  return (
    <>
      <Dialog open={open} onOpenChange={next => { if (!busy || !next) onOpenChange(next); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileArchive className="w-5 h-5" /> Download Bills
            </DialogTitle>
            <DialogDescription>
              Generates a PDF of every invoice created by{' '}
              <span className="font-medium">{business?.businessName}</span>, rendered with that
              business&apos;s own template and branding, and bundles them into a single ZIP.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-4">
            {phase === 'loading' && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading invoices&hellip;
              </p>
            )}

            {phase === 'ready' && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => applyPreset('thisMonth')}>This Month</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyPreset('lastMonth')}>Last Month</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyPreset('thisQuarter')}>This Quarter</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyPreset('thisFy')}>This FY</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => applyPreset('all')}>All Time</Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">From</Label>
                    <Input
                      type="date"
                      value={fromDate}
                      max={toDate || undefined}
                      onChange={e => setFromDate(e.target.value)}
                      onClick={e => (e.target as HTMLInputElement).showPicker?.()}
                      className="h-9 text-sm cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">To</Label>
                    <Input
                      type="date"
                      value={toDate}
                      min={fromDate || undefined}
                      onChange={e => setToDate(e.target.value)}
                      onClick={e => (e.target as HTMLInputElement).showPicker?.()}
                      className="h-9 text-sm cursor-pointer"
                    />
                  </div>
                </div>

                <p className="text-sm">
                  <span className="font-semibold">{selectedInvoices.length}</span> of {data?.invoices.length ?? 0} bills
                  {fromDate || toDate ? ' in this range' : ' (all time)'}.
                  {selectedInvoices.length > 0 && (
                    <span className="text-muted-foreground"> Keep this tab open while the export runs.</span>
                  )}
                </p>
              </>
            )}

            {phase === 'rendering' && (
              <>
                <Progress value={renderPercent} />
                <p className="text-sm text-muted-foreground">
                  Rendering bill {Math.min(completed + 1, total)} of {total}
                  {currentInvoice?.invoiceNumber ? ` (#${currentInvoice.invoiceNumber})` : ''}
                </p>
              </>
            )}

            {phase === 'zipping' && (
              <>
                <Progress value={zipPercent} />
                <p className="text-sm text-muted-foreground">Compressing archive&hellip; {zipPercent}%</p>
              </>
            )}

            {phase === 'done' && (
              <p className="text-sm text-emerald-600">
                Done. {total - failedCount} of {total} bills exported and the ZIP has been downloaded.
              </p>
            )}

            {failedCount > 0 && phase !== 'error' && (
              <p className="text-sm text-amber-600">
                {failedCount} bill{failedCount === 1 ? '' : 's'} could not be rendered and were skipped.
              </p>
            )}

            {phase === 'error' && <p className="text-sm text-rose-500">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
              {phase === 'done' ? 'Close' : 'Cancel'}
            </Button>

            {phase === 'done' && (
              <Button variant="outline" onClick={() => { setPhase('ready'); setRenderIndex(-1); setExportList([]); }}>
                Export Another Range
              </Button>
            )}

            {phase === 'error' && (
              <Button onClick={loadInvoices}>
                <Download className="mr-2 h-4 w-4" /> Retry
              </Button>
            )}

            {(phase === 'ready' || busy) && (
              <Button onClick={handleStart} disabled={busy || selectedInvoices.length === 0}>
                {busy
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Working&hellip;</>
                  : <><Download className="mr-2 h-4 w-4" /> Export {selectedInvoices.length} Bill{selectedInvoices.length === 1 ? '' : 's'}</>}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offscreen capture stage. It must stay laid out (not display:none) for
          html2canvas to measure it, so it is pushed out of the viewport instead. */}
      {templateProps && (
        <div
          aria-hidden
          style={{ position: 'fixed', top: 0, left: '-10000px', width: `${baseWidth}mm`, pointerEvents: 'none', zIndex: -1 }}
        >
          <Card
            ref={captureRef}
            className={`flex-shrink-0 bg-white shadow-none ring-0 ${paperClass}`}
            style={{ width: `${baseWidth}mm`, minHeight: `${baseHeight}mm`, boxSizing: 'border-box' }}
          >
            {template === 'gst' ? <GstTaxInvoice {...templateProps} /> : (
              template === 'modern' ? <ModernInvoice {...templateProps} /> : (
                template === 'stylish' ? <StylishInvoice {...templateProps} /> : (
                  template === 'professional' ? <ProfessionalInvoice {...templateProps} /> : <ClassicInvoice {...templateProps} />
                )
              )
            )}
          </Card>
        </div>
      )}
    </>
  );
}
