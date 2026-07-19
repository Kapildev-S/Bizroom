"use client";

import { Button } from "@/components/ui/button";
import { Check, Sparkles, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { startSubscriptionCheckout } from "@/lib/razorpayCheckout";

export default function Pay299Page() {
    const [loading, setLoading] = useState(false);
    const { isExpired, mutateSettings } = useSubscription();
    const router = useRouter();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push("/auth/login");
                return;
            }
        });

        return () => unsubscribe();
    }, [router]);

    const handleSubscribe = async () => {
        setLoading(true);

        await startSubscriptionCheckout({
            planType: 'Monthly',
            name: 'BizRoom Premium',
            description: 'Monthly Subscription - ₹299',
            themeColor: '#6366f1',
            onSuccess: async ({ isPremium }) => {
                setLoading(false);
                await mutateSettings();
                if (isPremium) {
                    alert("Subscription Successful! Enjoy Premium Features.");
                    router.push("/dashboard");
                } else {
                    alert("Payment received - your account will update shortly.");
                }
            },
            onError: (message) => {
                console.error('Subscription Error:', message);

                let errorMessage = message;
                if (errorMessage.includes('Authentication failed') || errorMessage.includes('not configured')) {
                    errorMessage = '⚠️ Razorpay Configuration Error\n\n' +
                        'Please check your .env file and ensure:\n' +
                        '1. RAZORPAY_KEY_ID is set to your actual Key ID\n' +
                        '2. RAZORPAY_KEY_SECRET is set to your actual Secret\n' +
                        '3. Plan IDs are configured correctly\n\n' +
                        'Error: ' + errorMessage;
                }

                alert(errorMessage);
                setLoading(false);
            },
            onDismiss: () => setLoading(false),
        });
    };



    const features = [
        "Unlimited Invoices & Bills",
        "Customer Management",
        "Product Inventory",
        "Staff Management",
        "Daily Ledger Tracking",
        "Event Organization & Booking",
        "AI-Powered Feedback Insights",
        "SMS Marketing",
        "Delivery Management",
        "Advanced Reports & Analytics",
        "Priority Support",
        "All Future Features"
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <div className="container mx-auto px-4 py-12">
                {/* Back Button */}
                <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                </Link>

                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                            <Sparkles className="w-4 h-4" />
                            {isExpired ? 'Renew Your Premium Plan' : 'Upgrade to Premium'}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
                            Unlock All Features
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Get access to all premium features and take your business management to the next level
                        </p>
                    </div>

                    {/* Pricing Card */}
                    <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-indigo-100">
                        {/* Popular Badge */}
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-center py-3 px-4">
                            <p className="font-bold text-sm uppercase tracking-wider">Most Popular Plan</p>
                        </div>

                        <div className="p-8 md:p-12">
                            {/* Price */}
                            <div className="text-center mb-8">
                                <div className="flex items-center justify-center gap-2 mb-2">
                                    <span className="text-6xl font-bold text-foreground">₹299</span>
                                    <span className="text-2xl text-muted-foreground">/ month</span>
                                </div>
                                <p className="text-sm text-muted-foreground">Billed monthly • Cancel anytime</p>
                            </div>

                            {/* Features Grid */}
                            <div className="grid md:grid-cols-2 gap-4 mb-10">
                                {features.map((feature, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className="rounded-full p-1 bg-indigo-100 mt-0.5">
                                            <Check className="h-4 w-4 text-indigo-600" />
                                        </div>
                                        <span className="text-sm text-foreground">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA Button */}
                            <Button
                                className="w-full py-7 text-lg font-bold rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
                                onClick={handleSubscribe}
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="animate-spin">⏳</span>
                                        Processing...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Sparkles className="w-5 h-5" />
                                        {isExpired ? 'Renew Now' : 'Subscribe Now'}
                                    </span>
                                )}
                            </Button>

                            {/* Trust Badges */}
                            <div className="mt-8 pt-8 border-t border-gray-200">
                                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-600" />
                                        Secure Payment
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-600" />
                                        Instant Activation
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-600" />
                                        Cancel Anytime
                                    </div>
                                </div>
                                <p className="text-center text-xs text-muted-foreground mt-4">
                                    Powered by Razorpay • 100% Secure Payment Gateway
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Additional Info */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-muted-foreground">
                            Need more options? <Link href="/pricing" className="text-indigo-600 hover:text-indigo-700 font-semibold">View all plans</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
