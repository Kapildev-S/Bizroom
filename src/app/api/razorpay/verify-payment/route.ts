import { NextResponse } from "next/server";
import { validatePaymentVerification } from "razorpay/dist/utils/razorpay-utils";
import { verifyRequestAuth } from "@/lib/firebase-admin";
import { syncSubscriptionFromRazorpay } from "@/lib/subscriptionSync";

const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";

/**
 * Called from the Razorpay checkout `handler` callback right after a successful
 * payment, purely to give the user instant "you're premium now" feedback without
 * waiting for the webhook. This does NOT grant premium based on the client's say-so -
 * it verifies the payment/subscription signature (proving the response genuinely came
 * from Razorpay) and then re-fetches the subscription from Razorpay's API as the
 * actual source of truth, via the same sync function the webhook and reconciliation
 * job use. The webhook + reconciliation cron remain the durable path; this is a
 * fast-path convenience only.
 */
export async function POST(req: Request) {
    try {
        const userId = await verifyRequestAuth(req);
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { razorpay_subscription_id, razorpay_payment_id, razorpay_signature } = await req.json();

        if (!razorpay_subscription_id || !razorpay_payment_id || !razorpay_signature) {
            return NextResponse.json({ error: "Missing payment verification fields" }, { status: 400 });
        }

        if (!KEY_SECRET) {
            console.error("RAZORPAY_KEY_SECRET is not configured");
            return NextResponse.json({ error: "Payment verification not configured" }, { status: 500 });
        }

        const isValid = validatePaymentVerification(
            { payment_id: razorpay_payment_id, subscription_id: razorpay_subscription_id },
            razorpay_signature,
            KEY_SECRET
        );

        if (!isValid) {
            console.error(`Payment signature verification failed for user ${userId}, subscription ${razorpay_subscription_id}`);
            return NextResponse.json({ error: "Invalid payment signature" }, { status: 401 });
        }

        const result = await syncSubscriptionFromRazorpay(razorpay_subscription_id, "verify-endpoint");

        // Defend against a signature that verifies but belongs to a different user's subscription.
        if (result.userId !== userId) {
            console.error(`Subscription ${razorpay_subscription_id} owner mismatch: caller=${userId}, notes.userId=${result.userId}`);
            return NextResponse.json({ error: "Subscription does not belong to this account" }, { status: 403 });
        }

        return NextResponse.json({
            success: true,
            isPremium: result.isPremium,
            status: result.status,
        });
    } catch (error: any) {
        console.error("Verify Payment Error:", error);
        return NextResponse.json({ error: error.message || "Failed to verify payment" }, { status: 500 });
    }
}
