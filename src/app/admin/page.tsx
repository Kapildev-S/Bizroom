"use client";

import React, { useEffect, useState } from 'react';
import { KPIGrid } from '@/components/admin/dashboard/KPIGrid';
import { AdminCharts } from '@/components/admin/dashboard/AdminCharts';
import { useAuth } from '@/lib/useAuth';
import { fetchPlatformKPIs } from '@/app/actions/adminDashboardActions';

export default function AdminPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPlatformKPIs(user.uid)
        .then(res => {
            setData(res);
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
    }
  }, [user]);

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Live Platform Stats...</div>;
  if (!data) return <div className="p-8 text-center text-destructive">Failed to load platform data.</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of platform performance, growth, and financials.
          </p>
        </div>
      </div>

      <KPIGrid data={data.kpis} />
      
      <AdminCharts data={data.charts} />
      
    </div>
  );
}
