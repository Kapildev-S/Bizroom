"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MessageCircleQuestion, Mail, Phone, Sparkles, ArrowLeft, ExternalLink } from "lucide-react";

const helpItems = [
  {
    title: "Billing assistant",
    description: "Use the AI agent to create invoices, check sales, and manage stock from one place.",
  },
  {
    title: "Invoice customization",
    description: "Open Settings > Customization to change invoice templates, colors, and paper sizes.",
  },
  {
    title: "Account access",
    description: "If you are signed out, log in again to continue using your BizRoom workspace.",
  },
];

export default function HelpPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#f4f7ff]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0f6f80]" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f4f7ff] px-4 py-8 text-[#17313a]">
      <div className="mx-auto max-w-5xl">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/agent")}
          className="mb-4 rounded-full text-slate-600 hover:bg-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assistant
        </Button>

        <Card className="overflow-hidden border border-black/5 bg-white shadow-xl">
          <CardContent className="p-0">
            <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="bg-gradient-to-br from-[#0f6f80] via-[#0b4e61] to-[#0d1220] p-8 text-white">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium">
                  <Sparkles className="h-3.5 w-3.5" />
                  BizRoom Help Center
                </div>
                <h1 className="mt-6 text-4xl font-bold tracking-tight">Need a hand?</h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-slate-200">
                  This page gives you quick answers for the AI assistant, invoice customization, and account access.
                </p>

                <div className="mt-8 space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                    <MessageCircleQuestion className="h-5 w-5 text-cyan-300" />
                    <div>
                      <p className="text-sm font-semibold">How do I create a bill?</p>
                      <p className="text-xs text-slate-300">Open the assistant and say something like "create bill for ..."</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/8 px-4 py-3">
                    <ExternalLink className="h-5 w-5 text-cyan-300" />
                    <div>
                      <p className="text-sm font-semibold">Where is invoice styling?</p>
                      <p className="text-xs text-slate-300">Go to Settings and open the Customization tab.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8">
                <div className="space-y-4">
                  {helpItems.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-[#0f6f80]/15 bg-[#f7f9ff] p-5">
                  <p className="text-sm font-semibold text-slate-900">Contact support</p>
                  <div className="mt-3 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-[#0f6f80]" />
                      <a href="mailto:support@bizroom.in" className="hover:text-[#0f6f80]">
                        support@bizroom.in
                      </a>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-[#0f6f80]" />
                      <a href="tel:+919999999999" className="hover:text-[#0f6f80]">
                        +91 99999 99999
                      </a>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button type="button" onClick={() => router.push("/settings?tab=customization")} className="rounded-full bg-[#0f6f80] text-white hover:bg-[#0b5f6e]">
                    Open Customization
                  </Button>
                  <Button type="button" variant="outline" onClick={() => router.push("/dashboard")} className="rounded-full border-slate-200 bg-white">
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
