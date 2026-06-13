"use client";

import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCurrencySymbol } from "@/lib/utils";
import { Download, Share2, Sparkles, TrendingUp, Users, Receipt, PieChart as PieChartIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/clipboard";

type ReportCardData = {
  title: string;
  periodLabel: string;
  totalRevenue: number;
  totalInvoices: number;
  averageInvoiceValue: number;
  paidRevenue: number;
  totalPaid: number;
  totalUnpaid: number;
  statusDistribution: Array<{ name: string; value: number; color: string }>;
  monthlyTrend: Array<{ name: string; sales: number; count: number }>;
  topCustomers: Array<{ name: string; sales: number }>;
  topProducts: Array<{ name: string; qty: number; revenue: number }>;
  highlights: string[];
  exportRows: Array<Record<string, string | number>>;
};

interface ChatReportCardProps {
  report: ReportCardData;
}

export default function ChatReportCard({ report }: ChatReportCardProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const currencySymbol = getCurrencySymbol("INR");

  const topCustomers = useMemo(() => report.topCustomers.slice(0, 5), [report.topCustomers]);
  const topProducts = useMemo(() => report.topProducts.slice(0, 5), [report.topProducts]);

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const headers = Object.keys(report.exportRows[0] || {
        invoiceNumber: "",
        customerName: "",
        date: "",
        status: "",
        totalAmount: "",
        items: "",
      });
      const rows = report.exportRows.map((row) =>
        headers.map((header) => String(row[header] ?? "").replace(/"/g, '""'))
      );
      const csv = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.title.replace(/\s+/g, "-").toLowerCase()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "Report exported", description: "CSV download started." });
    } catch (error) {
      toast({ variant: "destructive", title: "Export failed", description: "Could not export the report." });
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    const summary = `${report.title}\n${report.periodLabel}\nRevenue: ${currencySymbol}${report.totalRevenue.toFixed(2)}\nInvoices: ${report.totalInvoices}\nAvg Value: ${currencySymbol}${report.averageInvoiceValue.toFixed(2)}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: report.title,
          text: summary,
        });
      } else {
        await copyToClipboard(summary);
        toast({ title: "Copied", description: "Report summary copied to clipboard." });
      }
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        toast({ variant: "destructive", title: "Share failed", description: "Could not share the report." });
      }
    }
  };

  const statusColors = report.statusDistribution.map((entry) => entry.color);

  return (
    <div className="mt-3 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
      <div className="bg-gradient-to-r from-[#0f6f80] via-[#114a8a] to-[#19CB97] px-5 py-4 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-white/75">
              <Sparkles className="h-3.5 w-3.5" />
              Report Snapshot
            </div>
            <h3 className="mt-1 text-lg font-extrabold">{report.title}</h3>
            <p className="text-sm text-white/85">{report.periodLabel}</p>
          </div>
          <Badge className="rounded-full bg-white/15 text-white hover:bg-white/20">{report.totalInvoices} invoices</Badge>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-4">
        <StatCard label="Revenue" value={`${currencySymbol}${report.totalRevenue.toFixed(2)}`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Avg value" value={`${currencySymbol}${report.averageInvoiceValue.toFixed(2)}`} icon={<Receipt className="h-4 w-4" />} />
        <StatCard label="Collected" value={`${currencySymbol}${report.totalPaid.toFixed(2)}`} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Uncollected" value={`${currencySymbol}${report.totalUnpaid.toFixed(2)}`} icon={<PieChartIcon className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 px-5 pb-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Revenue trend</p>
              <p className="text-xs text-slate-500">Monthly sales and invoice volume</p>
            </div>
            <span className="text-xs font-medium text-slate-500">{report.monthlyTrend.length} points</span>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <AreaChart data={report.monthlyTrend} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="chat-report-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f6f80" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#0f6f80" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={11} />
                <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" fontSize={11} tickFormatter={(value) => `${currencySymbol}${Number(value) / 1000}k`} />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#0f6f80" strokeWidth={3} fill="url(#chat-report-area)" />
                <Area type="monotone" dataKey="count" stroke="#19CB97" strokeWidth={2} fill="none" strokeDasharray="5 5" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="mb-3 flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-[#0f6f80]" />
              <p className="text-sm font-semibold text-slate-900">Status split</p>
            </div>
            <div className="h-[160px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={report.statusDistribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {report.statusDistribution.map((entry, index) => (
                      <Cell key={entry.name} fill={statusColors[index]} stroke="white" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {report.statusDistribution.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span>{entry.name}</span>
                  <span className="ml-auto font-semibold text-slate-900">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">Highlights</p>
            <div className="space-y-2">
              {report.highlights.map((item) => (
                <div key={item} className="rounded-2xl bg-white px-3 py-2 text-sm text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-5 pb-5 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-900">Top customers</p>
          <div className="space-y-3">
            {topCustomers.map((customer, index) => {
              const max = topCustomers[0]?.sales || 1;
              return (
                <div key={customer.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="truncate text-slate-700">{index + 1}. {customer.name}</span>
                    <span className="font-semibold text-slate-900">{currencySymbol}{customer.sales.toFixed(2)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-[#0f6f80]" style={{ width: `${(customer.sales / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-900">Top products</p>
          <div className="space-y-3">
            {topProducts.map((product, index) => {
              const max = topProducts[0]?.revenue || 1;
              return (
                <div key={product.name}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="truncate text-slate-700">{index + 1}. {product.name}</span>
                    <span className="font-semibold text-slate-900">{product.qty} units</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-[#19CB97]" style={{ width: `${(product.revenue / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-200 px-5 py-4">
        <Button onClick={handleExportCSV} disabled={isExporting} className="rounded-full bg-[#0f6f80] text-white hover:bg-[#0b5f6e]">
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
        <Button variant="outline" onClick={handleShare} className="rounded-full border-slate-200">
          <Share2 className="mr-2 h-4 w-4" />
          Share report
        </Button>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
          <p className="mt-2 text-lg font-black text-slate-900">{value}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0f6f80]/10 text-[#0f6f80]">
          {icon}
        </div>
      </div>
    </div>
  );
}
