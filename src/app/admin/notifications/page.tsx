"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Clock, Smartphone, Mail, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AdminKPICard } from '@/components/admin/ui/AdminKPICard';

export default function NotificationsAdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState('push');
  
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate server action
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: "Notification Dispatched!",
      description: `Successfully queued for sending via ${channel.toUpperCase()}.`,
      variant: "default",
    });
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Campaigns & Notifications</h1>
        <p className="text-muted-foreground mt-1">
          Broadcast messages to businesses via Push, SMS, WhatsApp, and Email.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminKPICard title="Total Sent (This Month)" value="124,592" icon={Send} />
        <AdminKPICard title="Avg Delivery Rate" value="98.2%" icon={CheckCircle2} iconColor="text-emerald-500" />
        <AdminKPICard title="Avg Open Rate" value="45.1%" icon={Mail} iconColor="text-amber-500" />
        <AdminKPICard title="Failed Deliveries" value="1,204" icon={AlertCircle} iconColor="text-rose-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Compose Message</CardTitle>
            <CardDescription>Select target audience and channel.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSend} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <Select defaultValue="all">
                    <SelectTrigger>
                      <SelectValue placeholder="Select Audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Businesses</SelectItem>
                      <SelectItem value="premium">Premium Users</SelectItem>
                      <SelectItem value="trial">Trial Users</SelectItem>
                      <SelectItem value="selected">Selected Businesses...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Channel</Label>
                  <Select value={channel} onValueChange={setChannel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="push">Push Notification</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Message Title (Optional for SMS/WhatsApp)</Label>
                <Input placeholder="E.g., Huge Diwali Discount!" required={channel === 'push' || channel === 'email'} />
              </div>

              <div className="space-y-2">
                <Label>Message Body</Label>
                <Textarea placeholder="Type your message here..." className="min-h-[150px]" required />
              </div>

              <div className="flex gap-4 pt-4 border-t">
                <Button type="button" variant="outline" className="w-full flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" /> Schedule for Later
                </Button>
                <Button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2">
                  <Send className="h-4 w-4" /> {loading ? "Dispatching..." : "Send Immediately"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>How it looks on user's device.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center bg-slate-50 rounded-lg p-6 min-h-[400px]">
            <div className="w-[280px] h-[500px] bg-white border-[8px] border-slate-900 rounded-[3rem] relative shadow-xl overflow-hidden flex flex-col">
              <div className="absolute top-0 w-full h-6 flex justify-center">
                <div className="w-1/2 h-full bg-slate-900 rounded-b-2xl"></div>
              </div>
              <div className="flex-1 p-4 pt-10 bg-slate-100 flex flex-col gap-4">
                
                {/* Mock Notification Bubble */}
                <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-white flex gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="h-8 w-8 bg-indigo-500 rounded-full flex items-center justify-center shrink-0">
                    {channel === 'whatsapp' ? <MessageSquare className="h-4 w-4 text-white" /> :
                     channel === 'sms' ? <Smartphone className="h-4 w-4 text-white" /> :
                     channel === 'email' ? <Mail className="h-4 w-4 text-white" /> :
                     <AlertCircle className="h-4 w-4 text-white" />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">BizRoom Update</p>
                    <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-3">
                      This is a live preview of how your message will appear on a user's mobile screen.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
