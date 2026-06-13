'use client';

import { useEffect } from 'react';
import { getMessagingInstance } from '@/lib/firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { useToast } from '@/hooks/use-toast';
import { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface NotificationProviderProps {
  children: React.ReactNode;
  user: User;
}

export default function NotificationProvider({ children, user }: NotificationProviderProps) {
  const { toast } = useToast();

  // Request FCM permission + store token
  useEffect(() => {
    if (!user) return;

    const requestPermissionAndToken = async () => {
      try {
        // getMessagingInstance() returns null in Capacitor WebView / unsupported envs
        const messaging = await getMessagingInstance();
        if (!messaging) return;

        if (!('Notification' in window)) return;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
        if (!vapidKey) {
          console.warn('VAPID key not set – push notifications disabled.');
          return;
        }

        const currentToken = await getToken(messaging, { vapidKey });
        if (currentToken) {
          const tokenRef = doc(db, `users/${user.uid}/fcmTokens`, currentToken);
          await setDoc(tokenRef, {
            uid: user.uid,
            createdAt: serverTimestamp(),
            userAgent: navigator.userAgent,
          }, { merge: true });
        }
      } catch (err) {
        // Swallow silently – push notifications are non-critical
        console.warn('FCM setup skipped:', err);
      }
    };

    requestPermissionAndToken();
  }, [user]);

  // Listen for foreground messages
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const messaging = await getMessagingInstance();
        if (!messaging) return;
        unsubscribe = onMessage(messaging, (payload) => {
          toast({
            title: payload.notification?.title || 'New Notification',
            description: payload.notification?.body,
          });
        });
      } catch {
        // Unsupported environment – no-op
      }
    };

    setupListener();
    return () => { unsubscribe?.(); };
  }, [toast]);

  return <>{children}</>;
}
