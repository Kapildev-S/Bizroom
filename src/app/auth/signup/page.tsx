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
import { AuthVisualPanel } from '../login/page';

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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <div className="h-screen bg-white flex w-full overflow-hidden">
      {/* Left Column - Form */}
      <div className="w-full lg:w-1/2 flex flex-col p-8 xl:p-12 relative overflow-y-auto">
          <div className="w-full max-w-[500px] mx-auto my-auto flex flex-col">
          
              {/* Logo & Header */}
              <div className="mb-4 xl:mb-6">
                  <Link href="/" className="inline-flex items-center gap-3">
                      <div className="w-9 h-9 relative">
                          <img src="/bizroom-icon.png" alt="BizRoom Logo" className="w-full h-full object-contain" />
                      </div>
                      <span className="text-slate-900 text-xl font-bold tracking-tight">Bizroom</span>
                  </Link>
              </div>
              
              <div className="mb-4 xl:mb-6">
                  <h1 className="text-slate-900 text-2xl xl:text-3xl font-bold mb-1 tracking-tight">
                      Create your account
                  </h1>
                  <p className="text-slate-500 text-xs xl:text-sm">
                      Join and simplify your billing today.
                  </p>
              </div>

              {/* Google Button */}
              <button
                  type="button"
                  onClick={handleGoogleSignup}
                  className="flex items-center justify-center gap-3 w-full h-10 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm mb-4"
              >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Sign up with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1 bg-slate-100"></div>
                  <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase">Or with email</span>
                  <div className="h-px flex-1 bg-slate-100"></div>
              </div>

              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Name Field */}
                      <div className="flex flex-col gap-1.5">
                          <label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Full Name</label>
                          <input
                              {...form.register("name")}
                              className="w-full h-10 px-4 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                              placeholder="Alex Rivera"
                              type="text"
                          />
                          {form.formState.errors.name && <p className="text-red-500 text-xs mt-1">{form.formState.errors.name.message}</p>}
                      </div>
                      
                      {/* Business Name Field */}
                      <div className="flex flex-col gap-1.5">
                          <label className="text-slate-700 text-[11px] font-bold uppercase tracking-wider">Business Name</label>
                          <input
                              {...form.register("businessName")}
                              className="w-full h-10 px-4 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                              placeholder="Acme Corp"
                              type="text"
                          />
                          {form.formState.errors.businessName && <p className="text-red-500 text-xs mt-1">{form.formState.errors.businessName.message}</p>}
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Email Field */}
                      <div className="flex flex-col gap-1.5">
                          <label className="text-slate-700 text-[11px] font-bold uppercase tracking-wider">Email</label>
                          <input
                              {...form.register("email")}
                              className="w-full h-10 px-4 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                              placeholder="hello@bizroom.app"
                              type="email"
                          />
                          {form.formState.errors.email && <p className="text-red-500 text-xs mt-1">{form.formState.errors.email.message}</p>}
                      </div>
                      
                      {/* Mobile Number Field */}
                      <div className="flex flex-col gap-1.5">
                          <label className="text-slate-700 text-[11px] font-bold uppercase tracking-wider">Mobile</label>
                          <input
                              {...form.register("mobileNumber")}
                              className="w-full h-10 px-4 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                              placeholder="+91 98765 43210"
                              type="tel"
                          />
                          {form.formState.errors.mobileNumber && <p className="text-red-500 text-xs mt-1">{form.formState.errors.mobileNumber.message}</p>}
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Password Field */}
                      <div className="flex flex-col gap-1.5">
                          <label className="text-slate-700 text-[11px] font-bold uppercase tracking-wider">Password</label>
                          <div className="relative">
                              <input
                                  {...form.register("password")}
                                  className="w-full h-10 pl-4 pr-10 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                  placeholder="••••••••"
                                  type={showPassword ? "text" : "password"}
                              />
                              <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                              >
                                  {showPassword ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/><line x1="3" x2="21" y1="3" y2="21"/></svg>
                                  ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                  )}
                              </button>
                          </div>
                          {form.formState.errors.password && <p className="text-red-500 text-xs mt-1">{form.formState.errors.password.message}</p>}
                      </div>
                      
                      {/* Confirm Password Field */}
                      <div className="flex flex-col gap-1.5">
                          <label className="text-slate-700 text-[11px] font-bold uppercase tracking-wider">Confirm</label>
                          <div className="relative">
                              <input
                                  {...form.register("confirmPassword")}
                                  className="w-full h-10 pl-4 pr-10 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                  placeholder="••••••••"
                                  type={showConfirmPassword ? "text" : "password"}
                              />
                              <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                              >
                                  {showConfirmPassword ? (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/><line x1="3" x2="21" y1="3" y2="21"/></svg>
                                  ) : (
                                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                  )}
                              </button>
                          </div>
                          {form.formState.errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{form.formState.errors.confirmPassword.message}</p>}
                      </div>
                  </div>

                  {/* Submit Button */}
                  <button
                      className="mt-2 w-full h-11 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      type="submit"
                      disabled={loading || form.formState.isSubmitting}
                  >
                      {loading || form.formState.isSubmitting ? "Creating Account..." : (
                          <>
                              Create Account 
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                          </>
                      )}
                  </button>

                  {/* Sign In Link */}
                  <div className="text-center mt-2">
                      <p className="text-slate-500 text-sm">
                          Already have an account?
                          <Link className="text-primary font-bold hover:text-primary/80 ml-1.5" href="/auth/login">Sign in</Link>
                      </p>
                  </div>
              </form>
          </div>
      </div>
      
      {/* Right Column - Visual Panel */}
      <AuthVisualPanel />
    </div>
  );
}
