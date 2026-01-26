
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
import { Loader2 } from 'lucide-react';
import FirebaseErrorListener from '../shared/FirebaseErrorListener';
import NotificationProvider from './NotificationProvider';

interface AuthenticatedLayoutProps {
  children: ReactNode;
  pageTitle?: string;
}

export default function AuthenticatedLayout({ children, pageTitle }: AuthenticatedLayoutProps) {
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
      // This case should ideally be handled by the redirect in onAuthStateChanged,
      // but as a fallback or if redirect is slow.
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
        <Sidebar variant="sidebar" collapsible="icon" side="left" className="shadow-lg no-print">
          <SidebarNav />
        </Sidebar>
        <SidebarInset className="bg-background">
          {/* Mobile Header */}
          <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:hidden">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">{pageTitle}</h1>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </NotificationProvider>
  );
}
