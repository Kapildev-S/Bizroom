
"use client";

import React, { useEffect, useState } from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building, FileText, Database, Bell, Loader2, Paintbrush, CreditCard } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { useRouter, useSearchParams } from 'next/navigation';

import type { AppSettings, BusinessProfile } from '@/lib/mockData';
import UserAccountSettings from '@/components/settings/UserAccountSettings';
import BusinessProfileSettings from '@/components/settings/BusinessProfileSettings';
import InvoiceSettings from '@/components/settings/InvoiceSettings';
import NotificationSettings from '@/components/settings/NotificationSettings';
import DataManagementSettings from '@/components/settings/DataManagementSettings';
import InvoiceCustomizationSettings from '@/components/settings/InvoiceCustomizationSettings';
import PaymentSettings from '@/components/settings/PaymentSettings';

export default function SettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("account");

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab) {
      setActiveTab(requestedTab);
    }
  }, [searchParams]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const settingsDocRef = doc(db, `users/${user.uid}/settings`, 'appSettings');

        // Logic for special users (auto-healing)
        const specialUsers: Record<string, { businessName?: string; logoUrl: string }> = {
          '9rTopcIGpZUuoXmKT5wh16ZPGFn2': {
            logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/1.png?alt=media&token=b6937899-163c-4d86-a68c-74d4b36fabbc',
            businessName: 'Malai Unavagam',
          },
          'ZQjI1GM1UFblXixJtfLN8ec8gzw2': {
            logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/2.png?alt=media&token=6e940339-365a-426c-b55d-cfd9ce639eb8',
          },
          'lRHn6d89L0MTxvYZ0iL9KQhK5R73': {
            logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/WhatsApp%20Image%202025-07-07%20at%201.07.10%20PM.jpeg?alt=media&token=9189bbf6-b391-4f55-95b2-f44cea2f3164',
          },
          '3l2SpTceF9Qany7x5IRHdHBPU9J3': {
            logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/Logo.png?alt=media&token=b47e09b3-c628-489d-bfd0-962e67a0a057',
          },
          'aK0m8ztpT0cRHw40HU4ADw50OxL2': {
            logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/WhatsApp%20Image%202025-07-07%20at%201.07.10%20PM.jpeg?alt=media&token=9189bbf6-b391-4f55-95b2-f44cea2f3164',
          },
          'Wn0CV9sO5BaZRt8xPJaNa61nigK2': {
            logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/Brown%20White%20Circle%20Modern%20Cake%20%26%20Bakery%20Brand%20Logo%20(1).png?alt=media&token=3a820f2f-8857-4330-9de9-53a958263895',
          },
          'SpbYDQQ7JGMYY88e9NVIfTtzgWt1': {
            logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/WhatsApp%20Image%202025-07-20%20at%204.48.26%20PM.jpeg?alt=media&token=7c9d65d0-d588-48a9-b688-ce6c0a218d4a',
          },
          'atlcR4LjcARBwRH4a2P5qBMEGam1': {
            logoUrl: 'https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/WhatsApp%20Image%202025-07-20%20at%204.48.26%20PM.jpeg?alt=media&token=7c9d65d0-d588-48a9-b688-ce6c0a218d4a',
          },
        };

        const specialUserData = specialUsers[user.uid];
        if (specialUserData) {
          try {
            // Perform the check and update asynchronously/independently
            // We don't want to block the UI loading on this
            getDoc(settingsDocRef).then(async (docSnap) => {
              const currentProfile = docSnap.exists() ? (docSnap.data().businessProfile || {}) : {};
              const profileUpdate: Partial<BusinessProfile> = {};
              let needsUpdate = false;

              if (currentProfile.logoUrl !== specialUserData.logoUrl) {
                profileUpdate.logoUrl = specialUserData.logoUrl;
                needsUpdate = true;
              }
              if (specialUserData.businessName && currentProfile.businessName !== specialUserData.businessName) {
                profileUpdate.businessName = specialUserData.businessName;
                needsUpdate = true;
              }
              if (needsUpdate) {
                await setDoc(settingsDocRef, {
                  businessProfile: {
                    ...currentProfile,
                    ...profileUpdate,
                  }
                }, { merge: true });
                console.log("Special user profile synchronized");
              }
            });
          } catch (e) {
            console.error("Error in special user sync:", e);
          }
        }

        // Realtime listener for settings
        const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
          if (docSnap.exists()) {
            setSettings(docSnap.data() as AppSettings);
          } else {
            // Initialize defaults if doc doesn't exist
            console.warn("Settings document not found, creating defaults.");
            const defaultSettings: AppSettings = {
              businessProfile: {
                invoicePrefix: 'INV-',
                businessName: '',
                logoUrl: '',
              },
              invoiceSettings: { currency: 'INR', defaultTaxRate: 18, defaultDueDateDays: 7, enableDiscounts: true, defaultInvoiceType: 'gst', enableAdvancedInvoiceSystem: false },
              notificationSettings: { email: false, paymentReminders: false, dailySummary: false },
              appearanceSettings: { theme: 'system' },
              customizationSettings: { themeColor: 'Default', template: 'classic', showPartyBalance: false, paperSize: 'A4', customWidth: 4, customHeight: 3, unit: 'in' },
            };
            setDoc(settingsDocRef, defaultSettings).then(() => {
              toast({ variant: 'default', title: 'Settings Initialized', description: 'Default settings have been created for your account.' });
            });
            // Local set to avoid waiting for listener roundtrip for initial display
            setSettings(defaultSettings);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to settings:", error);
          setLoading(false);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not load your settings.' });
        });

        return () => unsubscribeSettings();

      } else {
        router.push('/auth/login');
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [toast, router]);

  const handleSettingsSave = async (newSettings: Partial<AppSettings>) => {
    if (!currentUser || !settings) return;

    // Deep merge new settings with existing settings
    const updatedSettings: AppSettings = {
      ...settings,
      businessProfile: { ...settings.businessProfile, ...newSettings.businessProfile },
      invoiceSettings: { ...settings.invoiceSettings, ...newSettings.invoiceSettings },
      notificationSettings: { ...settings.notificationSettings, ...newSettings.notificationSettings },
      appearanceSettings: { ...settings.appearanceSettings, ...newSettings.appearanceSettings },
      customizationSettings: { ...settings.customizationSettings, ...newSettings.customizationSettings },
      paymentSettings: { ...settings.paymentSettings, ...newSettings.paymentSettings },
    };

    // --- Sync nextInvoiceSequence to the Firestore counter doc ---
    // When the user explicitly sets a "Next Invoice Sequence No.", we must write
    // that value into the counter document (lastId = nextSequence - 1) so that
    // the advanced invoice system picks it up correctly on the next invoice.
    const nextSeq = newSettings.invoiceSettings?.nextInvoiceSequence;
    if (nextSeq && nextSeq >= 1) {
      try {
        const counterDocRef = doc(db, `users/${currentUser.uid}/counters`, 'invoices');
        await setDoc(counterDocRef, { lastId: nextSeq - 1 }, { merge: true });
        console.log(`Counter doc updated: lastId set to ${nextSeq - 1}`);
      } catch (e) {
        console.error('Failed to update invoice counter doc:', e);
      }
      // Clear nextInvoiceSequence from the saved settings so it doesn't
      // interfere on every subsequent invoice creation.
      updatedSettings.invoiceSettings = {
        ...updatedSettings.invoiceSettings,
        nextInvoiceSequence: null as any,
      };
    }

    const settingsDocRef = doc(db, `users/${currentUser.uid}/settings`, 'appSettings');
    try {
      console.log("Saving settings to Firestore...");
      await setDoc(settingsDocRef, updatedSettings, { merge: true });
      console.log("Settings saved to Firestore successfully.");
      // No manual setSettings needed, onSnapshot will pick it up
      toast({ title: 'Settings Saved', description: 'Your new settings have been saved successfully.' });
    } catch (error) {
      console.error('Failed to save settings: ', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save your settings.' });
      throw error; // Re-throw so child components know it failed
    }
  };

  if (loading || !settings || !currentUser) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account, business profile, and application preferences."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto flex-wrap">
          <TabsTrigger value="account"><User className="mr-2 h-4 w-4" />Account</TabsTrigger>
          <TabsTrigger value="business"><Building className="mr-2 h-4 w-4" />Business</TabsTrigger>
          <TabsTrigger value="invoicing"><FileText className="mr-2 h-4 w-4" />Invoicing</TabsTrigger>
          <TabsTrigger value="payments"><CreditCard className="mr-2 h-4 w-4" />Payments</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4" />Notifications</TabsTrigger>
          <TabsTrigger value="customization"><Paintbrush className="mr-2 h-4 w-4" />Customization</TabsTrigger>
          <TabsTrigger value="data"><Database className="mr-2 h-4 w-4" />Data</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="mt-6">
          <UserAccountSettings currentUser={currentUser} />
        </TabsContent>
        <TabsContent value="business" className="mt-6">
          <BusinessProfileSettings settings={settings.businessProfile} onSave={handleSettingsSave} />
        </TabsContent>
        <TabsContent value="invoicing" className="mt-6">
          <InvoiceSettings settings={settings.invoiceSettings} onSave={handleSettingsSave} />
        </TabsContent>
        <TabsContent value="payments" className="mt-6">
          <PaymentSettings settings={settings.paymentSettings || {}} onSave={handleSettingsSave} />
        </TabsContent>
        <TabsContent value="notifications" className="mt-6">
          <NotificationSettings settings={settings.notificationSettings} onSave={handleSettingsSave} />
        </TabsContent>
        <TabsContent value="customization" className="mt-6">
          <InvoiceCustomizationSettings settings={settings.customizationSettings || {}} onSave={handleSettingsSave} />
        </TabsContent>
        <TabsContent value="data" className="mt-6">
          <DataManagementSettings />
        </TabsContent>

      </Tabs>
    </div>
  );
}
