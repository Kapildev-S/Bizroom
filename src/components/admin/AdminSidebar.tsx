"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Building2, 
  Crown, 
  CreditCard, 
  LineChart, 
  Bot, 
  Zap, 
  FileText, 
  Bell, 
  Settings,
  Users,
  Smartphone
} from 'lucide-react';

const sidebarItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Business Management', href: '/admin/business-management', icon: Users },
  { name: 'Subscription Management', href: '/admin/subscription-management', icon: Crown },
  { name: 'Billing & POS', href: '/admin/billing', icon: CreditCard },
  { name: 'Financial Dashboard', href: '/admin/financial', icon: LineChart },
  { name: 'AI Assistant', href: '/admin/ai-assistant', icon: Bot },
  { name: 'BizRecharge Analytics', href: '/admin/bizrecharge', icon: Zap },
  { name: 'Recharge Records', href: '/admin/bizrecharge/records', icon: Smartphone },
  { name: 'Reports', href: '/admin/reports', icon: FileText },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: LayoutDashboard },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 bg-card border-r flex flex-col hidden md:flex h-full">
      <div className="p-6">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Crown className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight">Super Admin</span>
        </Link>
      </div>
      
      <div className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </div>
      
      <div className="p-4 border-t mt-auto">
        <div className="bg-muted rounded-xl p-4 text-sm">
          <p className="font-semibold mb-1">System Status</p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </div>
  );
}
