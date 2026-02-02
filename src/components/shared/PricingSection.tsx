
"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { useState } from "react";

declare global {
    interface Window {
        Razorpay: any;
    }
}

export function PricingSection({ titleOverride }: { titleOverride?: string }) {
    const [loading, setLoading] = useState<string | null>(null);

    const plans = [
        {
            name: "Monthly",
            price: "₹299",
            period: "/ month",
            description: "Perfect for getting started",
            features: ["All Premium Features", "Unlimited Invoices", "Priority Support"]
        },
        {
            name: "3 Months",
            price: "₹799",
            period: "/ 3 months",
            description: "Save ~10% with quarterly billing",
            features: ["All Premium Features", "Unlimited Invoices", "Priority Support", "Quarterly Reports"]
        },
        {
            name: "Yearly",
            price: "₹2499",
            period: "/ year",
            description: "Best Value: Save ~30%",
            popular: true,
            features: ["All Premium Features", "Unlimited Invoices", "Priority Support", "Dedicated Account Manager"]
        }
    ];

    const loadRazorpay = () => {
        return new Promise((resolve) => {
            if (window.Razorpay) {
                resolve(true);
                return;
            }
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

    const handleSubscribe = async (planName: string) => {
        setLoading(planName);
        const res = await loadRazorpay();

        if (!res) {
            alert('Razorpay SDK failed to load. Are you online?');
            setLoading(null);
            return;
        }

        try {
            const response = await fetch('/api/razorpay/subscription', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ planType: planName }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create subscription');
            }

            const options = {
                key: data.keyId,
                subscription_id: data.subscriptionId,
                name: "NextN Studio",
                description: `${planName} Subscription`,
                handler: function (response: any) {
                    // console.log(response);
                    alert("Subscription Successful! Payment ID: " + response.razorpay_payment_id);
                    // TODO: Verify payment on server
                },
                theme: {
                    color: "#0F172A" // Fits the dark/primary theme
                }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();

        } catch (error: any) {
            console.error('Subscription Error:', error);

            // Show more helpful error messages
            let errorMessage = error.message || 'Something went wrong';

            if (errorMessage.includes('Authentication failed') || errorMessage.includes('not configured')) {
                errorMessage = '⚠️ Razorpay Configuration Error\n\n' +
                    'Please check your .env file and ensure:\n' +
                    '1. RAZORPAY_KEY_ID is set to your actual Key ID\n' +
                    '2. RAZORPAY_KEY_SECRET is set to your actual Secret\n' +
                    '3. Plan IDs are configured correctly\n\n' +
                    'Error: ' + errorMessage;
            }

            alert(errorMessage);
        } finally {
            setLoading(null);
        }
    };

    return (
        <section className="py-12 px-4 md:px-6">
            {titleOverride && (
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-5xl font-headline font-bold text-foreground mb-4">{titleOverride}</h2>
                    <p className="text-muted-foreground">Choose the plan that fits your business needs</p>
                </div>
            )}
            <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto items-center">
                {plans.map((plan) => (
                    <div key={plan.name} className={`relative flex flex-col rounded-2xl p-8 transition-all duration-300 ${plan.popular ? 'bg-primary text-primary-foreground shadow-2xl md:scale-110 z-10' : 'bg-white/80 border border-border hover:shadow-xl shadow-lg hover:-translate-y-2'}`}>
                        {plan.popular && (
                            <div className="absolute top-0 left-0 right-0 bg-emerald-400 text-emerald-900 text-center text-sm font-bold py-1 rounded-t-2xl uppercase tracking-wider">
                                Most Popular
                            </div>
                        )}
                        <div className={`text-center space-y-2 ${plan.popular ? 'mt-6' : ''}`}>
                            <h3 className={`text-xl font-bold ${plan.popular ? 'text-primary-foreground' : 'text-foreground'}`}>{plan.name}</h3>
                            <div className="flex items-center justify-center gap-1">
                                <span className="text-4xl font-bold">{plan.price}</span>
                            </div>
                        </div>

                        <ul className="space-y-4 my-8 text-sm">
                            {plan.features.map((feature, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <div className={`rounded-full p-1 ${plan.popular ? 'bg-white/20' : 'bg-primary/10'}`}>
                                        <Check className={`h-4 w-4 ${plan.popular ? 'text-white' : 'text-primary'}`} />
                                    </div>
                                    <span className={plan.popular ? 'text-primary-foreground/90' : 'text-muted-foreground'}>{feature}</span>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-auto">
                            <Button
                                className={`w-full py-6 text-lg font-semibold rounded-xl transition-all ${plan.popular ? 'bg-white text-primary hover:bg-white/90 shadow-lg' : 'bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground'}`}
                                onClick={() => handleSubscribe(plan.name)}
                                disabled={loading === plan.name}
                            >
                                {loading === plan.name ? 'Processing...' : 'Subscribe Now'}
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
            <div className="text-center mt-16 text-sm text-muted-foreground">
                <p>Secure payment processing via Razorpay.</p>
            </div>
        </section>
    );
}

