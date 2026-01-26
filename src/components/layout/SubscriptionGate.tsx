
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

export function SubscriptionGate({ children, user }: { children: React.ReactNode, user: User }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  useEffect(() => {
    const checkSubscription = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const settingsDocRef = doc(db, `users/${user.uid}/settings`, 'appSettings');
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
          const appSettings = docSnap.data() as AppSettings;
          setSettings(appSettings);

          const sub = appSettings.subscription;
          if (sub?.status === 'active') {
            setIsSubscriptionActive(true);
          } else if (sub?.status === 'trial') {
            const trialEndDate = sub.endDate ? new Date(sub.endDate) : new Date(0);
            if (trialEndDate > new Date()) {
              setIsSubscriptionActive(true); // Trial is still active
            } else {
              setIsSubscriptionActive(false); // Trial expired
              setModalMessage('Your free trial has expired. Please subscribe to continue.');
            }
          } else {
            // Inactive or no subscription info
            setIsSubscriptionActive(false);
            setModalMessage('Your subscription is inactive. Please subscribe to continue using all features.');
          }
        } else {
          // No settings found, could be a new user, treat as active for now.
          // The default settings creation will handle this.
          setIsSubscriptionActive(true); 
        }
      } catch (error) {
        console.error("Error checking subscription status:", error);
        setIsSubscriptionActive(true); // Fail open
      } finally {
        setLoading(false);
      }
    };

    checkSubscription();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Verifying subscription...</p>
      </div>
    );
  }

  if (!isSubscriptionActive) {
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
