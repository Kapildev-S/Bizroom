import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";

export async function POST(req: Request) {
    try {
        const { amount, bookingData } = await req.json();

        if (!amount) {
            return NextResponse.json({ error: "Amount is required" }, { status: 400 });
        }

        // Razorpay expects amount in paise
        const options = {
            amount: Math.round(Number(amount) * 100),
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            notes: {
                ...bookingData,
                type: "ticket_booking"
            }
        };

        const order = await razorpay.orders.create(options);

        return NextResponse.json({
            id: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID
        });

    } catch (error: any) {
        console.error("Razorpay Order Error:", error);
        return NextResponse.json({
            error: error.message || "Failed to create Razorpay order"
        }, { status: 500 });
    }
}
