"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Home,
    FileText,
    PlusCircle,
    Users,
    Settings,
    Package,
    BarChart3,
    Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
    href: string;
    icon: React.ReactNode;
    label: string;
    activeIcon?: React.ReactNode;
}

const navItems: NavItem[] = [
    {
        href: '/dashboard',
        icon: <Home className="h-5 w-5" />,
        label: 'Home',
    },
    {
        href: '/invoices',
        icon: <FileText className="h-5 w-5" />,
        label: 'Invoices',
    },
    {
        href: '/invoices/new',
        icon: <PlusCircle className="h-6 w-6" />,
        label: 'New',
    },
    {
        href: '/customers',
        icon: <Users className="h-5 w-5" />,
        label: 'Customers',
    },
    {
        href: '/settings',
        icon: <Settings className="h-5 w-5" />,
        label: 'Settings',
    },
];

export function MobileBottomNav() {
    const pathname = usePathname();

    const isActive = (href: string) => {
        if (href === '/dashboard') {
            return pathname === '/dashboard';
        }
        return pathname.startsWith(href);
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background border-t border-border safe-area-bottom">
            <div className="flex items-center justify-around h-16 px-2">
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    const isCenter = item.href === '/invoices/new';

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center gap-0.5 min-w-[60px] py-1 transition-all",
                                isCenter && "relative -top-3",
                                active ? "text-primary" : "text-muted-foreground"
                            )}
                        >
                            {isCenter ? (
                                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg">
                                    {item.icon}
                                </div>
                            ) : (
                                <div className={cn(
                                    "flex items-center justify-center w-10 h-10 rounded-xl transition-all",
                                    active && "bg-primary/10"
                                )}>
                                    {item.icon}
                                </div>
                            )}
                            <span className={cn(
                                "text-[10px] font-medium",
                                isCenter && "mt-1"
                            )}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
