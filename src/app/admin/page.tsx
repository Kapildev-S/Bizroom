"use client";

import React, { useEffect, useState } from 'react';
import { KPIGrid } from '@/components/admin/dashboard/KPIGrid';
import { AdminCharts } from '@/components/admin/dashboard/AdminCharts';
import { useAuth } from '@/lib/useAuth';
import { fetchPlatformKPIs } from '@/app/actions/adminDashboardActions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
      {/* KPI Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={`rounded-xl border bg-card p-6 ${i === 2 ? 'lg:col-span-2' : ''}`}>
            <Skeleton className="h-5 w-40 mb-2" />
            <Skeleton className="h-4 w-60 mb-6" />
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPlatformKPIs(user.uid);
      setData(res);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to load platform stats. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center p-8">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">Failed to load platform stats</h2>
        <p className="text-muted-foreground text-sm max-w-md">{error}</p>
        <Button onClick={load} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of platform performance, growth, and financials.
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm" className="gap-2 shrink-0">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      <KPIGrid data={data.kpis} />
      <AdminCharts data={data.charts} />
    </div>
  );
}
