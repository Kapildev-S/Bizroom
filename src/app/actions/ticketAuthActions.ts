'use server';

import { getAdminDb } from "@/lib/firebase-admin";
import * as admin from 'firebase-admin';

// Helper to send email via Resend API using existing configuration
async function sendOTPEmail(email: string, otp: string) {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey || apiKey === 're_your_key_here') {
        console.log(`[DEMO MODE OTP] Email to: ${email}, OTP Code: ${otp}`);
        return { success: true };
    }

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: 'BizRoom Events <info@bizroom.in>',
                to: [email],
                subject: `Your Ticket Access Code: ${otp}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; color: #0f172a;">
                    <h2 style="color: #06b6d4; text-align: center; margin-bottom: 24px;">BizRoom Ticket Verification</h2>
                    <p style="font-size: 15px; line-height: 1.5;">Hello,</p>
                    <p style="font-size: 15px; line-height: 1.5;">You requested access to view your booked tickets. Use the 6-digit verification code below to access your tickets:</p>
                    
                    <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
                      <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0891b2;">${otp}</span>
                    </div>

                    <p style="font-size: 13px; color: #64748b;">This code is valid for 10 minutes. If you did not request this code, you can safely ignore this email.</p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
                    <p style="font-size: 12px; color: #94a3b8; text-align: center;">BizRoom Events Platform &bull; www.bizroom.in</p>
                  </div>
                `
            })
        });

        if (!response.ok) {
            const err = await response.json();
            console.error("Resend API error sending OTP:", err);
            return { success: false, error: err };
        }

        return { success: true };
    } catch (err: any) {
        console.error("Network error sending OTP email:", err);
        return { success: false, error: err.message };
    }
}

// Generate & send OTP
export async function sendTicketOTP(email: string) {
    try {
        const cleanEmail = email.toLowerCase().trim();
        if (!cleanEmail || !cleanEmail.includes('@')) {
            return { success: false, error: 'Please enter a valid email address.' };
        }

        // Generate 6-digit OTP code
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

        const adminDb = getAdminDb();
        await adminDb.collection("ticket_otps").add({
            email: cleanEmail,
            otp,
            expiresAt,
            used: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send email
        const emailResult = await sendOTPEmail(cleanEmail, otp);
        if (!emailResult.success) {
            console.warn("Failed to send OTP email via Resend, but code logged to console.");
        }

        return { success: true, message: "Verification code sent to your email." };
    } catch (error: any) {
        console.error("Error sending ticket OTP:", error);
        return { success: false, error: error.message || "Failed to send code." };
    }
}

// Verify OTP
export async function verifyTicketOTP(email: string, otp: string) {
    try {
        const cleanEmail = email.toLowerCase().trim();
        const cleanOtp = otp.trim();

        if (!cleanEmail || !cleanOtp) {
            return { success: false, error: "Email and code are required." };
        }

        const adminDb = getAdminDb();
        const snapshot = await adminDb.collection("ticket_otps")
            .where("email", "==", cleanEmail)
            .where("otp", "==", cleanOtp)
            .where("used", "==", false)
            .get();

        if (snapshot.empty) {
            return { success: false, error: "Invalid code. Please check your email and try again." };
        }

        const docRef = snapshot.docs[0];
        const data = docRef.data();

        if (data.expiresAt < Date.now()) {
            return { success: false, error: "Code has expired. Please request a new code." };
        }

        // Mark as used
        await docRef.ref.update({ used: true });

        return { success: true };
    } catch (error: any) {
        console.error("Error verifying ticket OTP:", error);
        return { success: false, error: error.message || "Failed to verify code." };
    }
}

// Fetch guest bookings by verified email
export async function fetchGuestBookings(email: string) {
    try {
        const cleanEmail = email.toLowerCase().trim();
        const adminDb = getAdminDb();
        
        const snapshot = await adminDb.collection("bookings")
            .where("userEmail", "==", cleanEmail)
            .get();

        const bookings: any[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            bookings.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt
            });
        });

        // Sort descending by date
        bookings.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        return { success: true, bookings };
    } catch (error: any) {
        console.error("Error fetching guest bookings:", error);
        return { success: false, bookings: [], error: error.message };
    }
}
