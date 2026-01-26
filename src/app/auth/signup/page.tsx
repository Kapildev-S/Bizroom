"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword, updateProfile, type AuthError, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { AppSettings } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  businessName: z.string().min(2, { message: "Business name must be at least 2 characters." }),
  email: z.string().email({ message: "Invalid email address." }),
  mobileNumber: z.string().min(10, { message: "Please enter a valid mobile number." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      businessName: "",
      email: "",
      mobileNumber: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      if (user) {
        // Update Firebase Auth profile
        await updateProfile(user, {
          displayName: values.name,
        });

        // Create default settings document in Firestore
        const settingsDocRef = doc(db, `users/${user.uid}/settings`, 'appSettings');
        const defaultSettings: AppSettings = {
          businessProfile: {
            businessName: values.businessName,
            phone: values.mobileNumber,
            invoicePrefix: 'INV-',
          },
          invoiceSettings: { currency: 'INR', defaultTaxRate: 18, defaultDueDateDays: 7, enableDiscounts: true, defaultInvoiceType: 'gst' },
          notificationSettings: { email: false, paymentReminders: false, dailySummary: false },
          appearanceSettings: { theme: 'system' },
          customizationSettings: { themeColor: 'Default', template: 'classic', showPartyBalance: false },
        };
        await setDoc(settingsDocRef, defaultSettings);

        toast({
          title: "Signup Successful",
          description: "Your account has been created. Redirecting to dashboard...",
        });
        router.push("/dashboard");
      }
    } catch (error) {
      const authError = error as AuthError;
      console.error("Signup error:", authError);
      let errorMessage = "An unexpected error occurred during signup.";
      if (authError.code === "auth/email-already-in-use") {
        errorMessage = "This email address is already in use.";
      } else if (authError.code === "auth/weak-password") {
        errorMessage = "The password is too weak.";
      }
      toast({
        variant: "destructive",
        title: "Signup Failed",
        description: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignup() {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const additionalUserInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalUserInfo?.isNewUser;

      toast({
        title: "Login Successful",
        description: "Welcome back with Google!",
      });

      if (isNewUser) {
        router.push("/settings");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      const authError = error as AuthError;
      if (authError.code === "auth/popup-closed-by-user" || authError.code === "auth/cancelled-popup-request") {
        toast({ title: "Cancelled", description: "Sign in cancelled." });
        return;
      }
      console.error("Google login error:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Could not sign in with Google.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <div className="size-10 relative">
            <img src="/bizroom-icon.png" alt="BizRoom Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-slate-900 text-2xl font-bold">Bizroom</h2>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50"
        >
          Back to Website
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[560px] bg-white rounded-2xl border border-slate-200 p-8 md:p-10">
          <div className="text-center mb-8">
            <h1 className="text-slate-900 text-2xl md:text-3xl font-bold mb-2">
              Create your account
            </h1>
            <p className="text-slate-500 text-sm">Join and simplify your billing today.</p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
            {/* Name & Business Name Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 text-sm font-medium">Full Name</label>
                <input
                  {...form.register("name")}
                  className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Alex Rivera"
                  type="text"
                />
                {form.formState.errors.name && <p className="text-red-500 text-xs">{form.formState.errors.name.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 text-sm font-medium">Business Name</label>
                <input
                  {...form.register("businessName")}
                  className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Acme Corp"
                  type="text"
                />
                {form.formState.errors.businessName && <p className="text-red-500 text-xs">{form.formState.errors.businessName.message}</p>}
              </div>
            </div>

            {/* Email & Mobile Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 text-sm font-medium">Email</label>
                <input
                  {...form.register("email")}
                  className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="alex@company.com"
                  type="email"
                />
                {form.formState.errors.email && <p className="text-red-500 text-xs">{form.formState.errors.email.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 text-sm font-medium">Mobile Number</label>
                <input
                  {...form.register("mobileNumber")}
                  className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="+91 98765 43210"
                  type="tel"
                />
                {form.formState.errors.mobileNumber && <p className="text-red-500 text-xs">{form.formState.errors.mobileNumber.message}</p>}
              </div>
            </div>

            {/* Password Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 text-sm font-medium">Password</label>
                <input
                  {...form.register("password")}
                  className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="••••••••"
                  type="password"
                />
                {form.formState.errors.password && <p className="text-red-500 text-xs">{form.formState.errors.password.message}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-700 text-sm font-medium">Confirm Password</label>
                <input
                  {...form.register("confirmPassword")}
                  className="w-full h-12 px-4 rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="••••••••"
                  type="password"
                />
                {form.formState.errors.confirmPassword && <p className="text-red-500 text-xs">{form.formState.errors.confirmPassword.message}</p>}
              </div>
            </div>

            {/* Submit Button */}
            <button
              className="mt-2 w-full h-12 rounded-lg bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              type="submit"
              disabled={loading || form.formState.isSubmitting}
            >
              {loading || form.formState.isSubmitting ? "Creating Account..." : "Sign Up"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-2">
              <div className="h-px flex-1 bg-slate-200"></div>
              <span className="text-slate-400 text-xs font-medium uppercase">or</span>
              <div className="h-px flex-1 bg-slate-200"></div>
            </div>

            {/* Google Button */}
            <button
              type="button"
              onClick={handleGoogleSignup}
              className="flex items-center justify-center gap-3 w-full h-12 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            {/* Login Link */}
            <div className="text-center mt-4">
              <p className="text-slate-500 text-sm">
                Already have an account?
                <Link className="text-blue-600 font-medium hover:text-blue-700 ml-1" href="/auth/login">Login</Link>
              </p>
            </div>
          </form>

          <div className="text-center mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400 leading-relaxed">
              By signing up, you agree to our
              <Link className="text-blue-600 hover:text-blue-700 ml-1" href="#">Terms of Service</Link>
              {" "}and
              <Link className="text-blue-600 hover:text-blue-700 ml-1" href="#">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </main>

      <footer className="py-6 px-8 text-center">
        <p className="text-slate-400 text-sm">© 2024 Bizroom Inc. All rights reserved.</p>
      </footer>
    </div>
  );
}
