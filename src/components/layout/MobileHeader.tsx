"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Menu, PanelLeft } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface MobileHeaderProps {
    title?: string;
    showSearch?: boolean;
    showNotification?: boolean;
    showSidebarTrigger?: boolean;
    rightAction?: React.ReactNode;
    className?: string;
}

export function MobileHeader({
    title = "BizRoom",
    showSearch = false,
    showNotification = true,
    showSidebarTrigger = true,
    rightAction,
    className
}: MobileHeaderProps) {
    return (
        <header className={cn(
            "sticky top-0 z-40 md:hidden",
            "flex items-center justify-between h-14 px-4",
            "bg-background/95 backdrop-blur-md border-b border-border",
            "safe-area-top",
            className
        )}>
            {/* Left - Logo/Title */}
            <div className="flex items-center gap-2">
                {showSidebarTrigger && <SidebarTrigger className="mr-1" />}
                <Link href="/dashboard" className="flex items-center gap-2">
                    <Image
                        src="/bizroom-icon.png"
                        alt="BizRoom"
                        width={32}
                        height={32}
                        className="rounded-lg"
                    />
                    <span className="font-semibold text-lg text-[#1fb2a6]">{title}</span>
                </Link>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-1">
                {showSearch && (
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Search className="h-5 w-5" />
                    </Button>
                )}
                {showNotification && (
                    <NotificationBell />
                )}
                {rightAction}
            </div>
        </header>
    );
}
