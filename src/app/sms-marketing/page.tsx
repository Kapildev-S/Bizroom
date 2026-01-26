
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from 'firebase/auth';
import { collection, query, getDocs, Timestamp } from 'firebase/firestore';
import type { Customer, SmsCampaign } from '@/lib/mockData';
import { Loader2, Send, Clock, Users, MessageSquareText, History, Info } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const smsTemplates = [
    { id: 'promo1', text: 'Hi {{customer_name}}, special offer just for you! Get 20% off on your next purchase. Visit us today!' },
    { id: 'update1', text: 'Hi {{customer_name}}, your order is ready for pickup. Thank you for shopping with us!' },
    { id: 'festive1', text: 'Wishing you and your family a Happy Diwali, {{customer_name}}! Enjoy our festive discounts in-store.' },
];

export default function SmsMarketingPage() {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [smsType, setSmsType] = useState<'promotional' | 'transactional'>('promotional');
    const [isSending, setIsSending] = useState(false);
    const [campaignHistory, setCampaignHistory] = useState<SmsCampaign[]>([]);

    const { toast } = useToast();

    const fetchCustomers = useCallback(async (userId: string) => {
        setLoading(true);
        try {
            const customersCollectionRef = collection(db, `users/${userId}/customers`);
            const q = query(customersCollectionRef);
            const querySnapshot = await getDocs(q);
            const fetchedCustomers = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Customer))
                .filter(c => c.phone); // Only include customers with a phone number
            setCustomers(fetchedCustomers);
        } catch (error) {
            console.error("Failed to fetch customers:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not load customers." });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            if (user) {
                fetchCustomers(user.uid);
            } else {
                setLoading(false);
                setCustomers([]);
            }
        });
        return () => unsubscribe();
    }, [fetchCustomers]);

    const filteredCustomers = useMemo(() =>
        customers.filter(customer =>
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.phone.toLowerCase().includes(searchTerm.toLowerCase())
        ), [customers, searchTerm]);

    const handleSelectAll = (checked: boolean | 'indeterminate') => {
        if (checked === true) {
            setSelectedCustomers(filteredCustomers.map(c => c.id));
        } else {
            setSelectedCustomers([]);
        }
    };

    const handleSelectCustomer = (customerId: string, checked: boolean) => {
        if (checked) {
            setSelectedCustomers(prev => [...prev, customerId]);
        } else {
            setSelectedCustomers(prev => prev.filter(id => id !== customerId));
        }
    };
    
    const handleTemplateChange = (templateId: string) => {
        const template = smsTemplates.find(t => t.id === templateId);
        if (template) {
            setMessage(template.text);
        }
    };

    const handleSendCampaign = async () => {
        if (selectedCustomers.length === 0) {
            toast({ variant: 'destructive', title: 'No Recipients', description: 'Please select at least one customer to send the message to.' });
            return;
        }
        if (!message.trim()) {
            toast({ variant: 'destructive', title: 'Empty Message', description: 'Please write a message to send.' });
            return;
        }
        
        setIsSending(true);

        // This is a mock implementation. In a real app, you would
        // make an API call to your SMS provider here.
        await new Promise(resolve => setTimeout(resolve, 1500));

        toast({ title: 'Campaign Sent!', description: `Your message has been sent to ${selectedCustomers.length} customers.` });
        
        const newCampaign: SmsCampaign = {
            id: Date.now().toString(),
            message: message,
            template: smsTemplates.find(t => t.text === message)?.id || 'custom',
            type: smsType,
            sentAt: new Date().toISOString(),
            recipientCount: selectedCustomers.length,
            status: 'Sent',
        };
        setCampaignHistory(prev => [newCampaign, ...prev]);

        setIsSending(false);
        setMessage('');
        setSelectedCustomers([]);
    };
    
    const messagePreview = useMemo(() => {
        const sampleCustomerName = customers.find(c => c.id === selectedCustomers[0])?.name || 'Customer';
        return message.replace(/{{customer_name}}/g, sampleCustomerName);
    }, [message, selectedCustomers, customers]);

    if (loading) {
        return <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading customer data...</p></div>;
    }
    
    if (customers.length === 0) {
         return (
            <EmptyState
                title="No Customers with Phone Numbers"
                description="To use SMS Marketing, you need to add customers with their phone numbers."
                actionText="Add New Customer"
                actionLink="/customers/new"
            >
              <Image 
                src="https://placehold.co/300x240.png"
                width={300}
                height={240}
                alt="Empty customers list illustration"
                data-ai-hint="customers empty"
              />
            </EmptyState>
        );
    }

    return (
        <div className="space-y-6">
            <PageHeader title="SMS Marketing" description="Engage your customers directly with SMS campaigns." />
            <Tabs defaultValue="campaign">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="campaign"><MessageSquareText className="mr-2 h-4 w-4" />New Campaign</TabsTrigger>
                    <TabsTrigger value="history"><History className="mr-2 h-4 w-4" />History</TabsTrigger>
                </TabsList>
                <TabsContent value="campaign" className="mt-6">
                    <div className="grid lg:grid-cols-3 gap-6">
                        <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle>1. Select Customers</CardTitle>
                                <CardDescription>Choose who will receive your message.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <Input placeholder="Search by name or phone..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                <div className="rounded-md border h-96 overflow-auto">
                                    <Table>
                                        <TableHeader className="sticky top-0 bg-background">
                                            <TableRow>
                                                <TableHead className="w-12"><Checkbox checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0} onCheckedChange={handleSelectAll} /></TableHead>
                                                <TableHead>Name</TableHead>
                                                <TableHead>Phone</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredCustomers.map(customer => (
                                                <TableRow key={customer.id}>
                                                    <TableCell><Checkbox checked={selectedCustomers.includes(customer.id)} onCheckedChange={(checked) => handleSelectCustomer(customer.id, !!checked)} /></TableCell>
                                                    <TableCell className="font-medium">{customer.name}</TableCell>
                                                    <TableCell className="text-muted-foreground">{customer.phone}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                                <p className="text-sm text-muted-foreground">{selectedCustomers.length} of {filteredCustomers.length} customers selected.</p>
                            </CardContent>
                        </Card>
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>2. Compose Message</CardTitle>
                                <CardDescription>Write your SMS, use templates, and personalize.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Use a Template</Label>
                                        <Select onValueChange={handleTemplateChange}>
                                            <SelectTrigger><SelectValue placeholder="Select a template" /></SelectTrigger>
                                            <SelectContent>{smsTemplates.map(t => <SelectItem key={t.id} value={t.id}>{t.text.substring(0, 30)}...</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                     <div className="space-y-2">
                                        <Label>SMS Type</Label>
                                        <RadioGroup defaultValue={smsType} onValueChange={(v: 'promotional' | 'transactional') => setSmsType(v)} className="flex items-center space-x-4">
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="promotional" id="r1" /><Label htmlFor="r1">Promotional</Label></div>
                                            <div className="flex items-center space-x-2"><RadioGroupItem value="transactional" id="r2" /><Label htmlFor="r2">Transactional</Label></div>
                                        </RadioGroup>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sms-message">Message</Label>
                                    <Textarea id="sms-message" placeholder="Type your message here..." className="min-h-32" value={message} onChange={e => setMessage(e.target.value)} />
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Use <code className="bg-muted px-1 rounded-sm">{"{{customer_name}}"}</code> for personalization.</span>
                                        <span className={cn(message.length > 160 && "text-destructive")}>{message.length} / 160 characters</span>
                                    </div>
                                </div>
                                <Card className="bg-muted/50 shadow-inner">
                                    <CardHeader className="pb-2"><CardDescription>Message Preview</CardDescription></CardHeader>
                                    <CardContent><p className="text-sm">{messagePreview || "Your message preview will appear here."}</p></CardContent>
                                </Card>
                            </CardContent>
                            <CardFooter className="flex justify-between items-center">
                                <Button variant="outline" disabled={true}><Clock className="mr-2 h-4 w-4" /> Schedule (soon)</Button>
                                <Button onClick={handleSendCampaign} disabled={isSending}>
                                    {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                    Send to {selectedCustomers.length} Customers
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="history" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Campaign History</CardTitle>
                            <CardDescription>A log of all your past SMS campaigns.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {campaignHistory.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">Your campaign history will appear here once you send your first message.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Date Sent</TableHead>
                                            <TableHead className="w-[40%]">Message</TableHead>
                                            <TableHead>Recipients</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {campaignHistory.map(c => (
                                            <TableRow key={c.id}>
                                                <TableCell>{new Date(c.sentAt).toLocaleDateString()}</TableCell>
                                                <TableCell className="text-muted-foreground">{c.message.substring(0, 60)}...</TableCell>
                                                <TableCell>{c.recipientCount}</TableCell>
                                                <TableCell><Badge variant="outline" className="capitalize">{c.type}</Badge></TableCell>
                                                <TableCell><Badge className={cn("capitalize", c.status !== 'Sent' && 'bg-destructive')}>{c.status}</Badge></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
