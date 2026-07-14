"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/useAuth';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Bell, Check, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface AppNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  channel: string;
  createdAt: any;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const notifRef = collection(db, `users/${user.uid}/notifications`);
    const q = query(notifRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: AppNotification[] = [];
      let unread = 0;
      snapshot.forEach(doc => {
        const data = doc.data() as Omit<AppNotification, 'id'>;
        if (!data.read) unread++;
        notifs.push({ id: doc.id, ...data });
      });
      setNotifications(notifs);
      setUnreadCount(unread);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    if (!user) return;
    try {
      const docRef = doc(db, `users/${user.uid}/notifications`, id);
      await updateDoc(docRef, { read: true });
    } catch (e) {
      console.error("Failed to mark as read", e);
    }
  };

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    try {
      const batch = writeBatch(db);
      notifications.forEach(n => {
        if (!n.read) {
          const ref = doc(db, `users/${user.uid}/notifications`, n.id);
          batch.update(ref, { read: true });
        }
      });
      await batch.commit();
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-background animate-in zoom-in">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 mr-4" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground">
              <Check className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[350px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground flex flex-col items-center gap-2">
              <BellRing className="h-8 w-8 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-4 border-b last:border-0 transition-colors hover:bg-muted/50 cursor-pointer ${notif.read ? 'opacity-70' : 'bg-blue-50/30 dark:bg-blue-900/10'}`}
                  onClick={() => { if (!notif.read) markAsRead(notif.id); }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-sm font-semibold leading-tight">{notif.title}</h5>
                    {!notif.read && <Badge variant="default" className="h-2 w-2 rounded-full p-0 flex-shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap leading-relaxed">{notif.body}</p>
                  <p className="text-[10px] text-muted-foreground mt-2 opacity-75">
                    {notif.createdAt ? (
                      notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString('en-IN', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      }) : new Date(notif.createdAt).toLocaleString('en-IN')
                    ) : 'Just now'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
