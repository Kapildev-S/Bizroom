import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";

export async function POST(req: Request) {
    try {
        const { planType, userId } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        let planId = "";
        let totalCount = 12; // default

        // Map the plan names from your frontend to environment variables
        switch (planType) {
            case "Monthly":
                planId = process.env.RAZORPAY_PLAN_ID_MONTHLY || "";
                totalCount = 60; // 5 years
                break;
            case "3 Months":
                planId = process.env.RAZORPAY_PLAN_ID_QUARTERLY || "";
                totalCount = 20; // 5 years
                break;
            case "Yearly":
                planId = process.env.RAZORPAY_PLAN_ID_YEARLY || "";
                totalCount = 5; // 5 years
                break;
            default:
                return NextResponse.json({ error: "Invalid plan type" }, { status: 400 });
        }

        console.log("Debug Razorpay Env:", {
            keyIdExists: !!process.env.RAZORPAY_KEY_ID,
            keySecretExists: !!process.env.RAZORPAY_KEY_SECRET,
            keyIdPrefix: process.env.RAZORPAY_KEY_ID?.substring(0, 4),
            planId: planId,
            planType: planType
        });


        if (!planId) {
            return NextResponse.json({
                error: `Plan ID for ${planType} not configured. Please set RAZORPAY_PLAN_ID_* in .env`
            }, { status: 500 });
        }

        // Create subscription
        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            customer_notify: 1,
            total_count: totalCount,
            notes: {
                userId: userId
            }
        });

        return NextResponse.json({
            subscriptionId: subscription.id,
            keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID
        });

    } catch (error: any) {
        console.error("Razorpay Error:", error);

        // Check if it's an authentication error
        if (error.statusCode === 401 || error.error?.code === 'BAD_REQUEST_ERROR') {
            return NextResponse.json({
                error: "Authentication failed - Please verify your Razorpay API credentials in .env file"
            }, { status: 500 });
        }

        return NextResponse.json({
            error: error.message || error.error?.description || "Something went wrong"
        }, { status: 500 });
    }

}
