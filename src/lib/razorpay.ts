import Razorpay from 'razorpay';

// Use environment variables or fallback to dummy values prevents build crash
const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_build_dummy_id';
const key_secret = process.env.RAZORPAY_KEY_SECRET || 'build_dummy_secret';

if (!process.env.RAZORPAY_KEY_ID) {
    console.warn("WARN: Razorpay keys are missing. Using dummy keys to prevent build failure.");
}

export const razorpay = new Razorpay({
    key_id,
    key_secret,
});
