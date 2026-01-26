
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Smartphone, User, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendRechargeEmail } from '@/app/actions/emailActions';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

const rechargeSchema = z.object({
    name: z.string().min(2, { message: "Please enter your name." }),
    mobileNumber: z.string().min(10, { message: "Please enter a valid 10-digit mobile number." }).max(10, { message: "Please enter a valid 10-digit mobile number." }),
    operator: z.string({ required_error: "Please select an operator." }),
    amount: z.coerce.number().min(10, { message: "Recharge amount must be at least ₹10." }),
});

type RechargeFormValues = z.infer<typeof rechargeSchema>;

const operators = ["Airtel", "Jio", "Vodafone Idea (Vi)", "BSNL"];

const popularPlans = {
    Airtel: {
        "Top Data Packs": [
            { amount: 77, validity: '7 days', data: '5 GB' },
            { amount: 22, validity: '1 day', data: '1 GB' },
            { amount: 33, validity: '1 day', data: '2 GB' },
            { amount: 49, validity: '1 day', data: 'Unlimited 5G' },
            { amount: 100, validity: '30 days', data: '6 GB', note: 'SunNXT + 20 OTTs' },
            { amount: 161, validity: '30 days', data: '12 GB' },
            { amount: 361, validity: '30 days', data: '50 GB' },
        ],
        "Max Data": [
            { amount: 449, validity: '28 days', data: '4 GB/day', note: 'Google One' },
            { amount: 429, validity: '1 month', data: '2.5 GB/day', note: 'Unlimited 5G' },
            { amount: 409, validity: '28 days', data: '2.5 GB/day', note: 'SunNXT + 20 OTTs' },
            { amount: 838, validity: '56 days', data: '3 GB/day', note: 'Amazon Prime' },
            { amount: 1199, validity: '84 days', data: '2.5 GB/day', note: 'Amazon Prime' },
            { amount: 1798, validity: '84 days', data: '3 GB/day', note: 'Netflix Basic' },
            { amount: 3999, validity: '365 days', data: '2.5 GB/day' },
        ],
        "Monthly Packs": [
            { amount: 379, validity: '1 month', data: '2 GB/day', note: 'Google One' },
            { amount: 429, validity: '1 month', data: '2.5 GB/day', note: 'Unlimited 5G' },
            { amount: 609, validity: '1 month', data: '60 GB', note: 'Spam Fighting Network' },
        ],
        "Unlimited 5G Plan": [
            { amount: 379, validity: '1 month', data: '2 GB/day', note: 'Google One' },
            { amount: 349, validity: '28 days', data: '2 GB/day', note: 'SunNXT + 20 OTTs' },
            { amount: 398, validity: '28 days', data: '2 GB/day', note: 'JioHotstar Mobile' },
            { amount: 409, validity: '28 days', data: '2.5 GB/day', note: 'SunNXT + 20 OTTs' },
            { amount: 449, validity: '28 days', data: '4 GB/day', note: 'Google One' },
            { amount: 598, validity: '28 days', data: '2 GB/day', note: 'Netflix Basic' },
            { amount: 1029, validity: '84 days', data: '2 GB/day', note: 'JioHotstar Mobile' },
            { amount: 838, validity: '56 days', data: '3 GB/day', note: 'Amazon Prime' },
            { amount: 979, validity: '84 days', data: '2 GB/day', note: 'SunNXT + 20 OTTs' },
            { amount: 3599, validity: '365 days', data: '2 GB/day', note: 'Unlimited 5G' },
            { amount: 649, validity: '56 days', data: '2 GB/day', note: 'Unlimited 5G' },
            { amount: 1199, validity: '84 days', data: '2.5 GB/day', note: 'Amazon Prime' },
            { amount: 1729, validity: '84 days', data: '2 GB/day', note: 'Netflix Basic' },
            { amount: 1798, validity: '84 days', data: '3 GB/day', note: 'Netflix Basic' },
            { amount: 3999, validity: '365 days', data: '2.5 GB/day', note: 'JioHotstar Mobile for 1 year' },
        ],
        "Entertainment": [
            { amount: 279, validity: '1 month', data: '1 GB', note: 'Netflix Basic' },
            { amount: 598, validity: '28 days', data: '2 GB/day', note: 'Netflix Basic' },
            { amount: 1729, validity: '84 days', data: '2 GB/day', note: 'Netflix Basic' },
            { amount: 398, validity: '28 days', data: '2 GB/day', note: 'JioHotstar Mobile' },
            { amount: 1199, validity: '84 days', data: '2.5 GB/day', note: 'Amazon Prime' },
            { amount: 1029, validity: '84 days', data: '2 GB/day', note: 'JioHotstar Mobile' },
            { amount: 838, validity: '56 days', data: '3 GB/day', note: 'Amazon Prime' },
            { amount: 1798, validity: '84 days', data: '3 GB/day', note: 'Netflix Basic' },
            { amount: 449, validity: '28 days', data: '4 GB/day', note: 'Google One' },
            { amount: 979, validity: '84 days', data: '2 GB/day', note: 'SunNXT + 20 OTTs' },
            { amount: 100, validity: '30 days', data: '6 GB', note: 'SunNXT + 20 OTTs' },
        ],
        "Cricket Plans": [
            { amount: 195, validity: '30 days', data: '12 GB', note: 'JioHotstar Mobile' },
            { amount: 49, validity: '1 day', data: 'Unlimited 5G' },
            { amount: 598, validity: '28 days', data: '2 GB/day', note: 'Netflix Basic' },
            { amount: 1729, validity: '84 days', data: '2 GB/day', note: 'Netflix Basic' },
            { amount: 398, validity: '28 days', data: '2 GB/day', note: 'JioHotstar Mobile' },
            { amount: 1029, validity: '84 days', data: '2 GB/day', note: 'JioHotstar Mobile' },
            { amount: 3999, validity: '365 days', data: '2.5 GB/day', note: 'JioHotstar Mobile for 1 year' },
        ],
        "Plan Vouchers": [
            { amount: 3599, validity: '365 days', data: '2 GB/day', note: 'Unlimited 5G' },
            { amount: 3999, validity: '365 days', data: '2.5 GB/day', note: 'JioHotstar Mobile for 1 year' },
            { amount: 609, validity: '1 month', data: '60 GB', note: 'Spam Fighting Network' },
            { amount: 589, validity: '30 days', data: '50 GB', note: 'Spam Fighting Network' },
        ],
    },
    Jio: {
        "True 5G Unlimited Plans": [
            { amount: 3999, validity: '365 Days', data: '2.5 GB/Day', note: 'FANCODE INCLUDED' },
            { amount: 2025, validity: '200 Days', data: '2.5 GB/Day', note: 'Pro Google Gemini' },
            { amount: 3599, validity: '365 Days', data: '2.5 GB/Day', note: 'Pro Google Gemini' },
            { amount: 1799, validity: '84 Days', data: '3 GB/Day', note: 'NETFLIX INCLUDED' },
            { amount: 1199, validity: '84 Days', data: '3 GB/Day', note: 'Festive offer' },
            { amount: 1049, validity: '84 Days', data: '2 GB/Day', note: 'SonyLIV + Zee5' },
            { amount: 1029, validity: '84 Days', data: '2 GB/Day', note: 'Amazon Prime' },
            { amount: 1028, validity: '84 Days', data: '2 GB/Day', note: 'SWIGGY ONE LITE' },
            { amount: 999, validity: '98 Days', data: '2 GB/Day', note: 'Festive offer' },
            { amount: 949, validity: '84 Days', data: '2 GB/Day', note: 'JIOHOTSTAR INCLUDED' },
            { amount: 899, validity: '90 Days', data: '2 GB/Day +20 GB', note: 'Pro Google Gemini' },
            { amount: 629, validity: '56 Days', data: '2 GB/Day', note: 'Festive offer' },
            { amount: 449, validity: '28 Days', data: '3 GB/Day', note: 'Festive offer' },
            { amount: 500, validity: '28 Days', data: '2 GB/Day', note: 'Happy New Year' },
            { amount: 445, validity: '28 Days', data: '2 GB/Day', note: '10 OTTs Included' },
            { amount: 399, validity: '28 Days', data: '2.5 GB/Day', note: 'Pro Google Gemini' },
            { amount: 349, validity: '28 Days', data: '2 GB/Day' },
            { amount: 198, validity: '14 Days', data: '2 GB/Day' },
        ],
        "Gaming": [
            { amount: 545, validity: '28 days', data: '2 GB/day + 5GB' },
            { amount: 495, validity: '28 days', data: '1.5 GB/day + 5GB' },
            { amount: 298, validity: '28 days', data: '3 GB', note: 'Gaming Add-on' },
            { amount: 98, validity: '7 days', data: '10 MB', note: 'Gaming Add-on' },
            { amount: 48, validity: '3 days', data: '10 MB', note: 'Gaming Add-on' },
        ],
        "True Unlimited Upgrade": [
            { amount: 151, validity: 'Active Plan', data: 'Unlimited 5G + 9GB' },
            { amount: 101, validity: 'Active Plan', data: 'Unlimited 5G + 6GB' },
            { amount: 51, validity: 'Active Plan', data: 'Unlimited 5G + 3GB' },
        ],
        "Annual Plans": [
            { amount: 3999, validity: '365 Days', data: '2.5 GB/Day', note: 'FANCODE' },
            { amount: 3599, validity: '365 Days', data: '2.5 GB/Day', note: 'Gemini AI' },
        ],
        "JioPhone": [
            { amount: 895, validity: '336 days', data: '2 GB/month' },
            { amount: 223, validity: '28 days', data: '2 GB/day' },
            { amount: 186, validity: '28 days', data: '1 GB/day' },
            { amount: 152, validity: '28 days', data: '0.5 GB/day' },
            { amount: 125, validity: '23 days', data: '0.5 GB/day' },
            { amount: 91, validity: '28 days', data: '0.1 GB/day +200MB' },
            { amount: 75, validity: '23 days', data: '0.1 GB/day +200MB' },
        ],
        "Data Packs": [
            { amount: 103, validity: "28 Days", data: "5 GB", note: "Flexi Pack" },
            { amount: 100, validity: "30 Days", data: "5 GB", note: "Festive offer: Add-on pack" },
            { amount: 195, validity: "90 Days", data: "15 GB", note: "JIOHOTSTAR DATA PACK" },
            { amount: 77, validity: "5 Days", data: "3 GB", note: "Sony LIV Data Pack" },
            { amount: 39, validity: "3 Days", data: "3 GB/Day", note: "DATA ONLY PACK" },
            { amount: 49, validity: "1 day", data: "Unlimited Data", note: "Cricket offer" },
            { amount: 69, validity: "7 Days", data: "6 GB", note: "DATA ONLY PACK" },
            { amount: 139, validity: "7 Days", data: "12 GB", note: "DATA ONLY PACK" },
            { amount: 29, validity: "2 Days", data: "2 GB", note: "DATA ONLY PACK" },
            { amount: 19, validity: "1 Day", data: "1 GB", note: "DATA ONLY PACK" },
            { amount: 175, validity: "28 Days", data: "10 GB", note: "DATA ONLY PACK + 10 OTT" },
            { amount: 11, validity: "1 Hour", data: "Unlimited Data", note: "DATA ONLY PACK" },
            { amount: 219, validity: "30 Days", data: "30 GB", note: "DATA ONLY PACK" },
            { amount: 289, validity: "30 Days", data: "40 GB", note: "DATA ONLY PACK" },
            { amount: 359, validity: "30 Days", data: "50 GB", note: "DATA ONLY PACK" }
        ],
        "JioBharat Phone": [
            { amount: 1234, validity: "336 Days", data: "0.5 GB/Day" },
            { amount: 369, validity: "84 Days", data: "0.5 GB/Day" },
            { amount: 234, validity: "56 Days", data: "0.5 GB/Day" },
            { amount: 123, validity: "28 Days", data: "0.5 GB/Day" }
        ]
    },
    'Vodafone Idea (Vi)': [],
    BSNL: []
};

type Operator = keyof typeof popularPlans;

export default function RechargePage() {
    const { toast } = useToast();
    const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);

    const form = useForm<RechargeFormValues>({
        resolver: zodResolver(rechargeSchema),
        defaultValues: {
            name: "",
            mobileNumber: "",
            amount: undefined,
        },
    });

    const handlePlanSelect = (amount: number) => {
        form.setValue('amount', amount, { shouldValidate: true });
    };

    const onSubmit = async (data: RechargeFormValues) => {
        try {
            const result = await sendRechargeEmail(data);

            if (result.success) {
                toast({
                    title: "Request Submitted!",
                    description: "Your recharge will be done soon and updated",
                });
                form.reset();
                setSelectedOperator(null);
            } else {
                toast({
                    variant: 'destructive',
                    title: "Failed to Submit",
                    description: result.error || "Could not submit your request.",
                });
            }
        } catch (error) {
            console.error("Failed to submit request:", error);
            toast({
                variant: 'destructive',
                title: "Client Error",
                description: "An unexpected error occurred.",
            });
        }
    };

    const operatorPlans = selectedOperator ? popularPlans[selectedOperator] : null;

    return (
        <Card className="w-full max-w-md shadow-xl">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle className="text-3xl font-headline text-primary flex items-center gap-2">
                            <Smartphone className="h-8 w-8" /> BizRecharge Service
                        </CardTitle>
                        <CardDescription>Fill out the form to request a mobile recharge.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Your Name</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                            <Input placeholder="Enter your name" {...field} className="pl-10" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="mobileNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mobile Number</FormLabel>
                                    <FormControl><Input type="tel" placeholder="Enter 10-digit number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="operator"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Operator</FormLabel>
                                    <Select
                                        onValueChange={(value: Operator) => {
                                            field.onChange(value);
                                            setSelectedOperator(value);
                                        }}
                                        defaultValue={field.value}
                                    >
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select mobile operator" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {operators.map(op => <SelectItem key={op} value={op}>{op}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <AnimatePresence>
                            {selectedOperator && operatorPlans && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-4 overflow-hidden"
                                >
                                    {typeof operatorPlans === 'object' && !Array.isArray(operatorPlans) ? (
                                        <Accordion type="single" collapsible className="w-full">
                                            {Object.entries(operatorPlans).map(([category, plans]) => (
                                                <AccordionItem value={category} key={category}>
                                                    <AccordionTrigger>{category}</AccordionTrigger>
                                                    <AccordionContent>
                                                        <div className="grid grid-cols-2 gap-2 pt-2">
                                                            {(plans as any[]).map((plan: any) => (
                                                                <Button
                                                                    type="button"
                                                                    key={plan.amount + plan.validity}
                                                                    variant="outline"
                                                                    className="h-auto text-left flex flex-col items-start p-2"
                                                                    onClick={() => handlePlanSelect(plan.amount)}
                                                                >
                                                                    <span className="font-bold text-base">₹{plan.amount}</span>
                                                                    <span className="text-xs text-muted-foreground">{plan.data}</span>
                                                                    <span className="text-xs text-muted-foreground">{plan.validity}</span>
                                                                    {plan.note && <span className="text-xs text-primary font-semibold">{plan.note}</span>}
                                                                </Button>
                                                            ))}
                                                        </div>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            ))}
                                        </Accordion>
                                    ) : (
                                        (operatorPlans as any[]).length > 0 &&
                                        <div className="space-y-2">
                                            <FormLabel>Popular Plans</FormLabel>
                                            <div className="grid grid-cols-2 gap-2">
                                                {(operatorPlans as any[]).map(plan => (
                                                    <Button
                                                        type="button"
                                                        key={plan.amount}
                                                        variant="outline"
                                                        className="h-auto text-left flex flex-col items-start p-2"
                                                        onClick={() => handlePlanSelect(plan.amount)}
                                                    >
                                                        <span className="font-bold text-base">₹{plan.amount}</span>
                                                        <span className="text-xs text-muted-foreground">{plan.data}</span>
                                                        <span className="text-xs text-muted-foreground">{plan.validity}</span>
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>


                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Recharge Amount (₹)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                            <Input
                                                type="number"
                                                placeholder="Enter amount or select a plan"
                                                {...field}
                                                onChange={e => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                                                value={field.value ?? ''}
                                                className="pl-10"
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex flex-col items-center gap-4 p-4 bg-muted rounded-lg">
                            <p className="text-sm font-medium text-center">Scan QR code to pay, then submit your request.</p>
                            <Image
                                src="https://firebasestorage.googleapis.com/v0/b/bill-7362b.firebasestorage.app/o/WhatsApp%20Image%202026-01-03%20at%201.55.35%20AM.jpeg?alt=media&token=ceb7fc0e-acdc-4cda-be5b-c534fc3ef350"
                                alt="Payment QR Code"
                                width={180}
                                height={180}
                                className="rounded-md"
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                            ) : ("Submit Recharge Request")}
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}
