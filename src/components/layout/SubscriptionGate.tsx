
'use client';

import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { User } from 'firebase/auth';
import type { AppSettings } from '@/lib/mockData';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useSubscription } from '@/lib/hooks/useSubscription';

export function SubscriptionGate({ children, user }: { children: React.ReactNode, user: User }) {
  const { isPremium, isExpired, loading, settings } = useSubscription();

  let modalMessage = 'Please subscribe to access premium features.';
  if (settings) {
    if (settings.subscriptionStatus === 'premium' && isExpired) {
      modalMessage = 'Your premium subscription has expired. Please renew to continue.';
    } else if (settings.subscriptionStatus !== 'premium') {
      modalMessage = 'Your subscription is inactive. Please subscribe to continue.';
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Verifying subscription...</p>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Subscription Required</CardTitle>
            <CardDescription>{modalMessage}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Unlock all features by subscribing to a plan.</p>
          </CardContent>
          <CardFooter className="flex flex-col items-center gap-4">
            <Button asChild className="w-full">
              <Link href="/pricing">View Plans</Link>
            </Button>
            <Button variant="outline" onClick={() => auth.signOut()}>Logout</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
