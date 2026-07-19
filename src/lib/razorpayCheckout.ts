import { auth } from '@/lib/firebase';

declare global {
    interface Window {
        Razorpay: any;
    }
}

export function loadRazorpayScript(): Promise<boolean> {
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
}

export type PlanType = 'Monthly' | '3 Months' | 'Yearly';

export interface StartCheckoutOptions {
    planType: PlanType;
    name?: string;
    description?: string;
    themeColor?: string;
    onSuccess: (result: { isPremium: boolean; status: string }) => void;
    onError: (message: string) => void;
    onDismiss?: () => void;
}

/**
 * Shared checkout flow used by every premium-subscription entry point in the app.
 * Creates the subscription via the authenticated API route, opens Razorpay checkout,
 * and on success asks the server to verify + sync state with Razorpay directly
 * (src/app/api/razorpay/verify-payment) rather than trusting the client callback to
 * grant anything. The webhook + reconciliation cron remain the durable source of
 * truth if this verification call itself fails for any reason.
 */
export async function startSubscriptionCheckout(options: StartCheckoutOptions): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
        options.onError('You must be signed in to subscribe.');
        return;
    }

    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
        options.onError('Razorpay SDK failed to load. Are you online?');
        return;
    }

    try {
        const idToken = await user.getIdToken();

        const createRes = await fetch('/api/razorpay/subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({ planType: options.planType }),
        });

        const createData = await createRes.json();
        if (!createRes.ok) {
            throw new Error(createData.error || 'Failed to create subscription');
        }

        const razorpayOptions = {
            key: createData.keyId,
            subscription_id: createData.subscriptionId,
            name: options.name || 'Bizroom',
            description: options.description || `${options.planType} Subscription`,
            theme: { color: options.themeColor || '#0F172A' },
            handler: async function (response: any) {
                try {
                    const freshToken = await user.getIdToken();
                    const verifyRes = await fetch('/api/razorpay/verify-payment', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${freshToken}`,
                        },
                        body: JSON.stringify({
                            razorpay_subscription_id: response.razorpay_subscription_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        }),
                    });

                    const verifyData = await verifyRes.json();
                    if (!verifyRes.ok || !verifyData.success) {
                        throw new Error(verifyData.error || 'Payment verification failed');
                    }

                    options.onSuccess({ isPremium: verifyData.isPremium, status: verifyData.status });
                } catch (error: any) {
                    // The payment itself may well have succeeded on Razorpay's side even
                    // if this instant-confirmation call failed - the webhook and the
                    // reconciliation cron will still pick it up within minutes.
                    options.onError(
                        error.message ||
                            'Payment received, but we could not confirm it instantly. Your account will update automatically within a few minutes.'
                    );
                }
            },
            modal: {
                ondismiss: () => {
                    options.onDismiss?.();
                },
            },
        };

        const paymentObject = new window.Razorpay(razorpayOptions);
        paymentObject.open();
    } catch (error: any) {
        options.onError(error.message || 'Something went wrong');
    }
}
