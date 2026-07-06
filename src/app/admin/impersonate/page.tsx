"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function ImpersonateContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const [status, setStatus] = useState("Authenticating...");

    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setStatus("Invalid token.");
            toast({ title: "Error", description: "No impersonation token provided.", variant: "destructive" });
            return;
        }

        const auth = getAuth(app);
        
        signInWithCustomToken(auth, token)
            .then(() => {
                setStatus("Success! Redirecting to Dashboard...");
                setTimeout(() => {
                    router.push('/dashboard');
                }, 1000);
            })
            .catch((error) => {
                console.error("Impersonation error:", error);
                setStatus("Failed to authenticate.");
                toast({ title: "Authentication Failed", description: error.message, variant: "destructive" });
            });
    }, [searchParams, router, toast]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center max-w-md w-full text-center">
                <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-6" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Logging you in...</h1>
                <p className="text-gray-500">{status}</p>
            </div>
        </div>
    );
}

export default function ImpersonatePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
            </div>
        }>
            <ImpersonateContent />
        </Suspense>
    );
}
