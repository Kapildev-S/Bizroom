"use client";

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    signInWithEmailAndPassword,
    type AuthError,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    getAdditionalUserInfo
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
    email: z.string().email({ message: "Invalid email address." }),
    password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export function AuthVisualPanel() {
  return (
    <div className="hidden lg:flex flex-1 bg-[#0a1128] relative flex-col justify-between p-8 xl:p-12 overflow-hidden">
        {/* Grid Background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />
        
        {/* Mesh gradient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs font-medium mb-6">
                <span className="text-primary">✦</span> Built for growing businesses
            </div>
            
            <h2 className="text-3xl xl:text-5xl font-bold text-white leading-tight mb-8 max-w-lg">
                From a single client detail to a professional invoice in minutes.
            </h2>
            
            {/* Mock Floating UI Card */}
            <div className="bg-[#111827]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl max-w-md w-full">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                           <span className="text-primary text-lg">⚡</span>
                        </div>
                        <span className="text-white font-medium text-sm">Generating layout</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                        Live
                    </div>
                </div>
                
                {/* Skeleton UI lines */}
                <div className="space-y-3 mb-5">
                    <div className="h-2.5 w-3/4 bg-white/10 rounded-full"></div>
                    <div className="h-2 w-full bg-white/5 rounded-full"></div>
                    <div className="h-2 w-5/6 bg-white/5 rounded-full"></div>
                </div>
                
                {/* Skeleton UI blocks */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="h-16 rounded-xl bg-primary/20 border border-primary/30"></div>
                    <div className="h-16 rounded-xl bg-white/5"></div>
                    <div className="h-16 rounded-xl bg-white/5"></div>
                </div>
            </div>
        </div>
        
        {/* Social Proof */}
        <div className="relative z-10 flex items-center gap-4 mt-auto">
            <div className="flex -space-x-3">
                {['JZ', 'AK', 'MF'].map((initials, i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold border-2 border-[#0a1128]">
                        {initials}
                    </div>
                ))}
                <div className="w-10 h-10 rounded-full bg-[#1e293b] flex items-center justify-center text-white/70 text-xs font-bold border-2 border-[#0a1128]">
                    +50
                </div>
            </div>
            <div className="flex flex-col">
                <div className="flex gap-1 text-primary text-sm">
                    ★★★★★
                </div>
                <span className="text-white/60 text-xs font-medium mt-1">Loved by 50+ businesses</span>
            </div>
        </div>
    </div>
  );
}

function LoginPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect');
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Check auth state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                router.replace(redirectUrl || "/dashboard");
            }
        });
        return () => unsubscribe();
    }, [router]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, values.email, values.password);
            toast({
                title: "Login Successful",
                description: "Welcome back!",
            });
            router.push(redirectUrl || "/dashboard");
        } catch (error) {
            const authError = error as AuthError;
            console.error("Login error:", authError);
            let errorMessage = "An unexpected error occurred. Please try again.";
            if (authError.code === "auth/user-not-found" || authError.code === "auth/wrong-password" || authError.code === "auth/invalid-credential") {
                errorMessage = "Invalid email or password. Please check your credentials.";
            } else if (authError.code === "auth/too-many-requests") {
                errorMessage = "Too many login attempts. Please try again later.";
            }
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: errorMessage,
            });
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleLogin() {
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
                router.push(redirectUrl || "/settings?onboarding=true");
            } else {
                router.push(redirectUrl || "/dashboard");
            }
        } catch (error) {
            const authError = error as AuthError;

            if (authError.code === "auth/popup-closed-by-user" || authError.code === "auth/cancelled-popup-request") {
                toast({
                    title: "Login Cancelled",
                    description: "You closed the login popup.",
                });
                return;
            }

            console.error("Google login error:", authError);

            toast({
                variant: "destructive",
                title: "Login Failed",
                description: "Could not sign in with Google. Please try again.",
            });
        }
    }

    async function handlePasswordReset() {
        const email = form.getValues("email");
        if (!email || !z.string().email().safeParse(email).success) {
            toast({
                variant: "destructive",
                title: "Email Required",
                description: "Please enter a valid email address above to reset your password.",
            });
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            toast({
                title: "Password Reset Email Sent",
                description: "Please check your inbox for a link to reset your password.",
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Reset Failed",
                description: "Could not send reset email. Ensure the email is correct.",
            });
        }
    }

    return (
        <div className="h-screen bg-white flex w-full overflow-hidden">
            {/* Left Column - Form */}
            <div className="w-full lg:w-1/2 flex flex-col p-8 xl:p-12 relative overflow-y-auto">
                <div className="w-full max-w-[400px] mx-auto my-auto flex flex-col">
                    
                    {/* Logo & Header */}
                    <div className="mb-6">
                        <Link href="/" className="inline-flex items-center gap-3">
                            <div className="w-9 h-9 relative">
                                <img src="/bizroom-icon.png" alt="BizRoom Logo" className="w-full h-full object-contain" />
                            </div>
                            <span className="text-slate-900 text-xl font-bold tracking-tight">Bizroom</span>
                        </Link>
                    </div>
                    
                    <div className="mb-6">
                        <h1 className="text-slate-900 text-2xl xl:text-3xl font-bold mb-2 tracking-tight">
                            Welcome back
                        </h1>
                        <p className="text-slate-500 text-xs xl:text-sm">
                            Sign in to pick up your projects right where you left off.
                        </p>
                    </div>

                    {/* Google Button */}
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        className="flex items-center justify-center gap-3 w-full h-10 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm mb-4"
                    >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Google
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-px flex-1 bg-slate-100"></div>
                        <span className="text-slate-400 text-[10px] font-bold tracking-wider uppercase">Or with email</span>
                        <div className="h-px flex-1 bg-slate-100"></div>
                    </div>

                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3">
                        {/* Email Field */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-slate-700 text-[11px] font-bold uppercase tracking-wider">Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                                </div>
                                <input
                                    {...form.register("email")}
                                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                    placeholder="hello@bizroom.app"
                                    type="email"
                                />
                            </div>
                            {form.formState.errors.email && <p className="text-red-500 text-xs mt-0.5">{form.formState.errors.email.message}</p>}
                        </div>

                        {/* Password Field */}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-slate-700 text-[11px] font-bold uppercase tracking-wider">Password</label>
                                <button type="button" onClick={handlePasswordReset} className="text-primary text-xs font-bold hover:text-primary/80">
                                    Forgot password?
                                </button>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                </div>
                                <input
                                    {...form.register("password")}
                                    className="w-full h-10 pl-10 pr-10 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
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
                            {form.formState.errors.password && <p className="text-red-500 text-xs mt-0.5">{form.formState.errors.password.message}</p>}
                        </div>

                        {/* Remember Me */}
                        <div className="flex items-center gap-2 mt-1">
                            <input 
                                type="checkbox" 
                                id="remember" 
                                className="w-4 h-4 rounded text-primary focus:ring-primary border-slate-300"
                                defaultChecked
                            />
                            <label htmlFor="remember" className="text-slate-600 text-xs">
                                Keep me signed in
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            className="mt-2 w-full h-10 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            type="submit"
                            disabled={loading || form.formState.isSubmitting}
                        >
                            {loading || form.formState.isSubmitting ? "Signing In..." : (
                                <>
                                    Sign In 
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                </>
                            )}
                        </button>

                        {/* Sign Up Link */}
                        <div className="text-center mt-2">
                            <p className="text-slate-500 text-sm">
                                Don't have an account?
                                <Link className="text-primary font-bold hover:text-primary/80 ml-1.5" href="/auth/signup">Sign up free</Link>
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

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Loading...</div>}>
            <LoginPageContent />
        </Suspense>
    );
}
