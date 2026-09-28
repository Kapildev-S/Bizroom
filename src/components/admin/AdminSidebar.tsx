"use client";

import React, { useState } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const sidebarItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Business Management', href: '/admin/business-management', icon: Users },
  { name: 'Subscription Management', href: '/admin/subscription-management', icon: Crown },
  { name: 'Billing & POS', href: '/admin/billing', icon: CreditCard },
  { name: 'Financial Dashboard', href: '/admin/financial', icon: LineChart },
  { name: 'AI Assistant', href: '/admin/ai-assistant', icon: Bot },
  { name: 'BizRecharge Analytics', href: '/admin/bizrecharge', icon: Zap },
  { name: 'Reports', href: '/admin/reports', icon: FileText },
  { name: 'Notifications', href: '/admin/notifications', icon: Bell },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: LayoutDashboard },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={cn(
        "hidden md:flex flex-col bg-card border-r h-full transition-all duration-300 ease-in-out",
        collapsed ? "w-[68px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-2 p-5 border-b", collapsed && "justify-center px-3")}>
        <Link href="/admin" className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Crown className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="font-bold text-lg tracking-tight truncate">Super Admin</span>
          )}
        </Link>
      </div>

      {/* Nav Items */}
      <div className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {sidebarItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                collapsed ? "justify-center" : "",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="p-3 border-t mt-auto space-y-2">
        {!collapsed && (
          <div className="bg-muted rounded-xl p-3 text-sm">
            <p className="font-semibold mb-1 text-xs">System Status</p>
            <div className="flex items-center gap-2 text-muted-foreground text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              All systems operational
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors text-xs"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );
}
