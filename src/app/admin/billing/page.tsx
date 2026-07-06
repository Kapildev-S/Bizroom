"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchBillingStats } from '@/app/actions/adminBillingActions';
import { useAuth } from '@/lib/useAuth';
import { Receipt, XCircle, Undo2, Printer, Smartphone, BarChart3, Clock, LayoutDashboard } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { AdminKPICard } from '@/components/admin/ui/AdminKPICard';

export default function BillingAdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchBillingStats(user.uid).then(setStats).catch(console.error);
    }
  }, [user]);

  if (!stats) return <div className="p-8 text-center">Loading Billing & POS Stats...</div>;

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing & POS Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Monitor platform-wide invoicing, hardware status, and store performance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKPICard title="Total Bills Generated" value={stats.totalBills} icon={Receipt} iconColor="text-indigo-500" />
        <AdminKPICard title="Live Bills Today" value={stats.liveBillsToday} icon={LayoutDashboard} iconColor="text-emerald-500" />
        <AdminKPICard title="Avg Bill Value" value={`₹${Math.round(stats.avgBillValue)}`} icon={BarChart3} iconColor="text-amber-500" />
        <AdminKPICard title="Refunds / Cancelled" value={`${stats.refunds} / ${stats.cancelledBills}`} icon={Undo2} iconColor="text-rose-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Printer className="h-4 w-4" /> Printer Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mt-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-500">{stats.printerStatus.online}</div>
                <div className="text-xs text-muted-foreground">Online</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-rose-500">{stats.printerStatus.offline}</div>
                <div className="text-xs text-muted-foreground">Offline</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Smartphone className="h-4 w-4" /> POS Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mt-2">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-500">{stats.posDevices.active}</div>
                <div className="text-xs text-muted-foreground">Active Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-muted-foreground">{stats.posDevices.inactive}</div>
                <div className="text-xs text-muted-foreground">Inactive</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Top Products</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topProducts}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Payment Modes</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.paymentModes} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {stats.paymentModes.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
