
"use client";

import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  SidebarProvider,
  Sidebar,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { SidebarNav } from './SidebarNav';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileHeader } from './MobileHeader';
import { Loader2 } from 'lucide-react';
import FirebaseErrorListener from '../shared/FirebaseErrorListener';
import NotificationProvider from './NotificationProvider';

interface AuthenticatedLayoutProps {
  children: ReactNode;
  pageTitle?: string;
  showMobileHeader?: boolean;
}

export default function AuthenticatedLayout({
  children,
  pageTitle,
  showMobileHeader = true
}: AuthenticatedLayoutProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/auth/login');
      } else {
        setUser(currentUser);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading your experience...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-lg text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <NotificationProvider user={user}>
      <SidebarProvider defaultOpen={true}>
        <FirebaseErrorListener />

        {/* Desktop Sidebar - Hidden on Mobile */}
        <Sidebar variant="sidebar" collapsible="icon" side="left" className="shadow-lg no-print hidden lg:flex">
          <SidebarNav />
        </Sidebar>

        <SidebarInset className="bg-background">
          {/* Mobile Header - Only visible on mobile */}
          {showMobileHeader && (
            <div className="lg:hidden">
              <MobileHeader title={pageTitle || "BizRoom"} showSidebarTrigger={true} />
            </div>
          )}

          {/* Desktop Header - Only visible on desktop with sidebar trigger */}
          <header className="sticky top-0 z-10 hidden lg:flex h-14 items-center gap-4 border-b bg-background px-4">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">{pageTitle}</h1>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
            {children}
          </main>

          {/* Mobile Bottom Navigation - Only visible on mobile */}
          <MobileBottomNav />
        </SidebarInset>
      </SidebarProvider>
    </NotificationProvider>
  );
}
