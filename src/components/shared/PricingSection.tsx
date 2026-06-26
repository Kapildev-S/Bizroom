"use client";

import { motion } from "framer-motion";
import { Check, Monitor, Palette, Zap } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";

declare global {
    interface Window {
        Razorpay: any;
    }
}

const FeatureCard = ({ title, price, period, description, features, icon: Icon, isRecommended, delay, onClick, loading }: any) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: "easeOut", delay }}
            className={`relative flex flex-col justify-start items-start w-full max-w-[280px] md:max-w-[320px] mx-auto cursor-pointer group ${isRecommended ? 'z-10' : 'z-0'} mt-${isRecommended ? '0' : '4'}`}
            onClick={onClick}
        >
            <div
                className={`relative self-stretch rounded-sm flex flex-col h-full bg-[#0a0a0a] transition-all duration-500 ease-out group-hover:-translate-y-3 ${
                    isRecommended 
                    ? 'border-2 border-primary shadow-[0_0_25px_rgba(var(--primary),0.1)] group-hover:shadow-[0_0_40px_rgba(var(--primary),0.3)]' 
                    : 'border border-white/10 hover:border-white/20 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                }`}
            >
                {isRecommended && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-sm uppercase tracking-wider z-20">
                        Recommended
                    </div>
                )}
                <div className="p-8 flex flex-col justify-between flex-grow">
                    <div>
                        <h3 className="text-white font-medium text-xl mb-1 tracking-tight">{title}</h3>
                        <p className="text-gray-400 text-[13px] leading-[1.6] font-normal mb-6 min-h-[40px]">
                            {description}
                        </p>
                        <div className="flex items-end gap-1 mb-8">
                            <span className="text-4xl md:text-5xl font-bold text-white tracking-tighter">{price}</span>
                            <span className="text-gray-500 text-sm mb-1">{period}</span>
                        </div>
                        <ul className="space-y-4 mb-8">
                            {features.map((feat: string, i: number) => (
                                <li key={i} className="flex items-start gap-3 text-[14px] text-gray-300">
                                    <Check size={18} className="text-primary shrink-0 mt-0.5" />
                                    <span>{feat}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <button
                        disabled={loading}
                        className={`w-full py-3.5 text-sm font-bold tracking-wide rounded-sm transition-all duration-300 flex items-center justify-center uppercase
                            ${isRecommended 
                                ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.2)]' 
                                : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                            }`}
                    >
                        {loading ? "Processing..." : "GET STARTED"}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};

export function PricingSection({ titleOverride }: { titleOverride?: string }) {
    const [loading, setLoading] = useState<string | null>(null);
    const router = useRouter();

    const plans = [
        {
            name: "Monthly",
            price: "₹299",
            period: "/mo",
            description: "For individuals exploring business management.",
            features: ["All Premium Features", "Unlimited Invoices", "Priority Support"],
            icon: Monitor,
            delay: 0.1,
            isRecommended: false
        },
        {
            name: "3 Months",
            price: "₹799",
            period: "/3mo",
            description: "For professional teams and growing businesses.",
            features: ["All Premium Features", "Unlimited Invoices", "Priority Support", "Quarterly Reports", "Advanced API Access"],
            icon: Palette,
            delay: 0.2,
            isRecommended: true
        },
        {
            name: "Yearly",
            price: "₹2499",
            period: "/yr",
            description: "For large teams needing comprehensive solutions.",
            features: ["All Premium Features", "Unlimited Invoices", "Priority Support", "Dedicated Manager", "Custom Branding"],
            icon: Zap,
            delay: 0.3,
            isRecommended: false
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

        const user = auth.currentUser;
        if (!user) {
            let redirectPath = "/pay-299";
            if (planName === "3 Months") redirectPath = "/pay-799";
            if (planName === "Yearly") redirectPath = "/pay-2499";

            router.push(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
            setLoading(null);
            return;
        }

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
                name: "Bizroom",
                description: `${planName} Subscription`,
                handler: function (response: any) {
                    alert("Subscription Successful! Payment ID: " + response.razorpay_payment_id);
                },
                theme: {
                    color: "#0F172A"
                }
            };

            const paymentObject = new window.Razorpay(options);
            paymentObject.open();

        } catch (error: any) {
            console.error('Subscription Error:', error);
            let errorMessage = error.message || 'Something went wrong';
            alert(errorMessage);
        } finally {
            setLoading(null);
        }
    };

    return (
        <section className="bg-black py-24 md:py-32 px-6 md:px-12 font-sans flex flex-col items-center justify-center border-y border-white/5 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
            
            <div className="text-center mb-20 relative z-10 max-w-2xl mx-auto">
                <h2 className="text-4xl md:text-5xl font-sans font-bold text-white mb-6 tracking-tight">
                    {titleOverride || "Simple, Transparent Pricing"}
                </h2>
                <p className="text-gray-400 text-lg">Start for free, scale as you grow.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 w-full max-w-6xl relative z-10 items-stretch">
                {plans.map((plan) => (
                    <FeatureCard
                        key={plan.name}
                        title={plan.name}
                        price={plan.price}
                        period={plan.period}
                        description={plan.description}
                        features={plan.features}
                        icon={plan.icon}
                        delay={plan.delay}
                        isRecommended={plan.isRecommended}
                        onClick={() => handleSubscribe(plan.name)}
                        loading={loading === plan.name}
                    />
                ))}
            </div>
            <div className="text-center mt-16 text-sm text-gray-600 relative z-10">
                <p>Secure payment processing via Razorpay.</p>
            </div>
        </section>
    );
}

