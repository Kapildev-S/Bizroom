"use client";

import React from 'react';
import {
  Building2, Users, Crown, CreditCard, Activity, TrendingUp,
  ShoppingCart, Receipt, Smartphone, FileText
} from 'lucide-react';
import { AdminKPICard } from '@/components/admin/ui/AdminKPICard';

export function KPIGrid({ data }: { data: any }) {
  if (!data) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
      <AdminKPICard title="Total Registered Businesses" value={data.totalBusinesses} icon={Building2} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
      <AdminKPICard title="Active Businesses" value={data.activeBusinesses} icon={Activity} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
      <AdminKPICard title="Trial Users" value={data.trialUsers} icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" />
      <AdminKPICard title="Premium Subscribers" value={data.premiumSubscribers} icon={Crown} iconColor="text-amber-600" iconBg="bg-amber-50" />

      <AdminKPICard title="Revenue Today" value={data.revenueToday} icon={CreditCard} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
      <AdminKPICard title="Revenue This Month" value={data.revenueThisMonth} icon={CreditCard} iconColor="text-teal-600" iconBg="bg-teal-50" />
      <AdminKPICard title="Monthly Recurring Revenue" value={data.mrr} icon={TrendingUp} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
      <AdminKPICard title="Annual Recurring Revenue" value={data.arr} icon={TrendingUp} iconColor="text-green-600" iconBg="bg-green-50" />

      <AdminKPICard title="Total Transactions" value={data.totalTransactions} icon={Receipt} iconColor="text-slate-600" iconBg="bg-slate-100" />
      <AdminKPICard title="Bills Created Today" value={data.billsCreatedToday} icon={FileText} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
      <AdminKPICard title="Bills via POS (Total)" value={data.billsCreatedThroughPOS} icon={Smartphone} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
      <AdminKPICard title="POS Bills Today" value={data.posBillsToday} icon={Smartphone} iconColor="text-amber-600" iconBg="bg-amber-50" />

      <AdminKPICard title="Total Bills Generated" value={data.totalBillsGenerated} icon={FileText} iconColor="text-slate-600" iconBg="bg-slate-100" />
      <AdminKPICard title="Total Products" value={data.totalProducts} icon={ShoppingCart} iconColor="text-orange-600" iconBg="bg-orange-50" />
      <AdminKPICard title="Total Customers" value={data.totalCustomers} icon={Users} iconColor="text-indigo-600" iconBg="bg-indigo-50" />
      <AdminKPICard title="Customer Growth" value={data.customerGrowth} icon={TrendingUp} iconColor="text-emerald-600" iconBg="bg-emerald-50" />
    </div>
  );
}
