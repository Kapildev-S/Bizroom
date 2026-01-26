
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

  useEffect(() => {
    const requestPermissionAndToken = async () => {
      // Ensure this code runs only on the client
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const messaging = getMessagingInstance();
          if (!messaging) return;

          // 1. Request Permission
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.log('Notification permission not granted.');
            return;
          }

          // 2. Get VAPID key from environment variables
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
          if (!vapidKey) {
            console.warn('VAPID key not found. Push notifications will be disabled. Set NEXT_PUBLIC_VAPID_KEY to enable.');
            return;
          }

          // 3. Get Token
          const currentToken = await getToken(messaging, { vapidKey: vapidKey });

          if (currentToken) {
            console.log('FCM Token:', currentToken);
            // 4. Save the token to Firestore
            const tokenRef = doc(db, `users/${user.uid}/fcmTokens`, currentToken);
            await setDoc(tokenRef, {
              uid: user.uid,
              createdAt: serverTimestamp(),
              userAgent: navigator.userAgent,
            }, { merge: true });
          } else {
            console.log('No registration token available. Request permission to generate one.');
          }

        } catch (error) {
          console.error('An error occurred while retrieving token. ', error);
        }
      }
    };

    if (user) {
      requestPermissionAndToken();
    }
  }, [user]);

  useEffect(() => {
    const messaging = getMessagingInstance();
    if (messaging) {
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground message received. ', payload);
        toast({
          title: payload.notification?.title || 'New Notification',
          description: payload.notification?.body,
        });
      });
      return () => unsubscribe();
    }
  }, [toast]);

  return <>{children}</>;
}
