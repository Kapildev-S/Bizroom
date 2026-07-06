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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-8">
      <AdminKPICard title="Total Registered Businesses" value={data.totalBusinesses} icon={Building2} iconColor="text-indigo-500" />
      <AdminKPICard title="Active Businesses" value={data.activeBusinesses} icon={Activity} iconColor="text-emerald-500" />
      <AdminKPICard title="Trial Users" value={data.trialUsers} icon={Users} iconColor="text-blue-500" />
      <AdminKPICard title="Premium Subscribers" value={data.premiumSubscribers} icon={Crown} iconColor="text-amber-500" />
      
      <AdminKPICard title="Revenue Today" value={data.revenueToday} icon={CreditCard} iconColor="text-emerald-500" />
      <AdminKPICard title="Revenue This Month" value={data.revenueThisMonth} icon={CreditCard} iconColor="text-emerald-500" />
      <AdminKPICard title="Monthly Recurring Revenue" value={data.mrr} icon={TrendingUp} iconColor="text-emerald-500" />
      <AdminKPICard title="Annual Recurring Revenue" value={data.arr} icon={TrendingUp} iconColor="text-emerald-500" />
      
      <AdminKPICard title="Total Transactions" value={data.totalTransactions} icon={Receipt} iconColor="text-slate-500" />
      <AdminKPICard title="Bills Created Today" value={data.billsCreatedToday} icon={FileText} iconColor="text-emerald-500" />
      <AdminKPICard title="Bills Created Through POS" value={data.billsCreatedThroughPOS} icon={Smartphone} iconColor="text-indigo-500" />
      <AdminKPICard title="POS Today Created Bill" value={data.posBillsToday} icon={Smartphone} iconColor="text-amber-500" />
      
      <AdminKPICard title="Total Bills Generated" value={data.totalBillsGenerated} icon={FileText} iconColor="text-slate-500" />
      <AdminKPICard title="Total Products" value={data.totalProducts} icon={ShoppingCart} iconColor="text-orange-500" />
      <AdminKPICard title="Total Customers" value={data.totalCustomers} icon={Users} iconColor="text-indigo-500" />
      <AdminKPICard title="Customer Growth" value={data.customerGrowth} icon={TrendingUp} iconColor="text-emerald-500" />
    </div>
  );
}
