"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Save, ShieldCheck, Key, CreditCard } from 'lucide-react';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    toast({
      title: "Settings Saved",
      description: "Platform configurations updated successfully.",
    });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Platform Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure global variables, commissions, and API keys.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-500" />
                Financial Settings
              </CardTitle>
              <CardDescription>Adjust global platform commissions and taxes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Platform Commission (%)</Label>
                <Input type="number" step="0.1" defaultValue="2.0" required />
              </div>
              <div className="space-y-2">
                <Label>BizRecharge Margin (%)</Label>
                <Input type="number" step="0.1" defaultValue="1.5" required />
              </div>
              <div className="flex items-center justify-between mt-4 p-4 border rounded-lg bg-slate-50">
                <div className="space-y-0.5">
                  <Label>Auto-Payouts</Label>
                  <p className="text-sm text-muted-foreground">Automatically settle wallets every Friday.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5 text-emerald-500" />
                API & Integrations
              </CardTitle>
              <CardDescription>Manage third-party service keys.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Razorpay Key ID</Label>
                <Input type="password" defaultValue="rzp_test_123456789" />
              </div>
              <div className="space-y-2">
                <Label>Razorpay Secret</Label>
                <Input type="password" defaultValue="secret_key_12345" />
              </div>
              <div className="space-y-2">
                <Label>Google GenAI API Key</Label>
                <Input type="password" defaultValue="AIzaSy..." />
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t py-4">
              <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                <Save className="h-4 w-4 mr-2" /> {loading ? "Saving..." : "Save Settings"}
              </Button>
            </CardFooter>
          </Card>
        </form>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-500" />
                Admin Security
              </CardTitle>
              <CardDescription>Manage your super admin access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Two-Factor Authentication</Label>
                  <p className="text-sm text-muted-foreground">Require OTP for admin login.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label>Audit Logging</Label>
                  <p className="text-sm text-muted-foreground">Record every admin action.</p>
                </div>
                <Switch defaultChecked disabled />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
