
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { BillEaseLogo } from "@/components/icons/BillEaseLogo";
import { PricingSection } from "@/components/shared/PricingSection";
import { FreedomSection } from "@/components/FreedomSection";
import { KresnaFooter } from "@/components/KresnaFooter";
import CtaFooter from "@/components/CtaFooter";
import { TubesBackground } from "@/components/ui/TubesBackground";
import { motion } from "framer-motion";
import {
  FileText,
  Users,
  Package,
  BarChart3,
  Briefcase,
  HandCoins,
  ArrowRight,
  CheckCircle,
  Star,
  Calculator,
  Fingerprint,
  Sparkles,
  Paperclip,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Ticket,
  QrCode,
  ShieldCheck,
  CalendarCheck,
} from "lucide-react";
import Image from "next/image";
import { useIsMobile } from "@/hooks/use-mobile";

// Feature data
const mainFeatures = [
  {
    icon: FileText,
    title: "GST Invoicing & Billing",
    description: "Create professional GST-compliant invoices in seconds. Share via PDF or WhatsApp.",
    image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80",
  },
  {
    icon: Package,
    title: "Inventory Management",
    description: "Track stock levels, manage products with custom units, and never run out of stock.",
    image: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80",
  },
  {
    icon: Briefcase,
    title: "Staff Management",
    description: "Monitor daily attendance and log expenses for your team with detailed monthly reports.",
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80",
  },
  {
    icon: HandCoins,
    title: "Daily Ledger",
    description: "Easily record all your cash-in and cash-out transactions for a clear financial overview.",
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80",
  },
  {
    icon: Users,
    title: "Customer Management",
    description: "Keep all your client information organized in one place for easy access.",
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80",
  },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
    }
  }
};

const fadeInFromLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
};

const fadeInFromRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6 } }
};


export default function HomePage() {
  const router = useRouter();
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const isMobile = useIsMobile();

  const testimonials = [
    { name: "Rajesh Kumar", role: "Grocery Store Owner", text: "This app is a lifesaver! I can create invoices in seconds and track all my sales. My accounting is so much easier now.", avatar: "RK" },
    { name: "Priya Sharma", role: "Boutique Owner", text: "Managing my inventory used to be a headache. With BizRoom, I know exactly what I have in stock. The reports are also very helpful for planning.", avatar: "PS" },
    { name: "Amit Singh", role: "Contractor", text: "Finally, a simple app that does everything I need. Client management, invoicing, and even staff attendance. Highly recommended!", avatar: "AS" }
  ];

  const handleNextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrevTestimonial = () => {
    setActiveTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  useEffect(() => {
    // This is a public marketing page - render it immediately for anonymous
    // visitors (the vast majority) instead of blocking on a full-screen
    // spinner while Firebase Auth resolves. Only the rare already-logged-in
    // visitor gets redirected, as a non-blocking side effect once auth
    // state is known. router.replace prevents the marketing page from
    // being in browser history for them.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/dashboard');
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="absolute top-0 w-full py-6 px-4 md:px-8 flex justify-between items-center z-50 pointer-events-auto">
        <Link href="/" className="flex items-center gap-2 text-white hover:text-white/80 transition-colors">
          {/* Plain img (not next/image) - next/image's built-in optimizer rejects
              local SVGs unless dangerouslyAllowSVG is set in next.config.ts. */}
          <img src="/bizroom-icon-transparent.svg" alt="BizRoom Logo" className="w-6 h-6 object-contain" />
          <span className="text-lg font-bold tracking-tight">BizRoom<sup className="text-[10px] font-normal ml-0.5 text-white/50">BETA</sup></span>
        </Link>
        <nav className="hidden md:flex bg-[#1a1a1a]/60 backdrop-blur-md rounded-full p-1 border border-white/10 items-center">
          <Link href="#pricing" className="text-xs font-medium text-white/70 hover:text-white px-4 py-2 rounded-full hover:bg-white/5 transition-colors">Pricing</Link>
          <Link href="#features" className="text-xs font-medium text-white/70 hover:text-white px-4 py-2 rounded-full hover:bg-white/5 transition-colors">Features</Link>
          <Link href="/tickets" className="text-xs font-medium text-white/70 hover:text-white px-4 py-2 rounded-full hover:bg-white/5 transition-colors">Events</Link>
          <Link href="#contact" className="text-xs font-medium text-white/70 hover:text-white px-4 py-2 rounded-full hover:bg-white/5 transition-colors flex items-center gap-1">
            Contact
          </Link>
        </nav>
        <div className="flex items-center">
          <Button asChild className="bg-white hover:bg-white/90 text-black rounded-full px-5 h-9 text-xs font-medium">
            <Link href="/auth/login">Sign in / Sign up</Link>
          </Button>
        </div>
      </header>

      <main className="flex-grow bg-background-light relative overflow-x-clip">
        {/* Background gradient decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        {/* Hero Section */}
        <section className="relative w-full z-10 overflow-hidden">
          {/* bg-[#0f1115] gives the hero its dark backdrop immediately - the
              tubes canvas animation only paints once its WebGL library
              finishes loading async, and without this the whole section is
              blank white until then. */}
          <TubesBackground className="min-h-[80vh] md:min-h-[90vh] bg-[#0f1115]">
            <div className="container mx-auto px-4 md:px-6 h-full flex flex-col items-center justify-center pt-32 pb-20 md:pt-40 md:pb-32 pointer-events-none text-center relative z-10">
              <motion.div initial="hidden" animate="visible" variants={fadeInFromLeft} className="pointer-events-auto flex flex-col items-center w-full max-w-5xl mx-auto relative">
                
                {/* Top Badge */}
                <Link href="/auth/signup" className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full pl-1 pr-4 py-1 mb-8 backdrop-blur-md cursor-pointer hover:bg-white/10 transition-colors">
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">NEW</span>
                  <span className="text-white/80 text-xs font-medium">BizRoom AI Invoice is here &rarr;</span>
                </Link>

                <h1 className="text-5xl md:text-7xl lg:text-8xl font-medium mb-6 tracking-tight text-white select-none relative z-10">
                  Create Invoice Using AI
                </h1>
                <p className="text-sm md:text-lg text-white/60 max-w-2xl mb-12 leading-relaxed font-light mx-auto relative z-10">
                  Generate professional, GST-ready digital invoices from your business details instantly.
                </p>

                {/* Prompt Box */}
                <div className="w-full max-w-3xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 md:p-6 shadow-2xl flex flex-col gap-4 relative z-10">
                  <textarea 
                    className="w-full bg-transparent text-white placeholder-white/40 resize-none outline-none text-base md:text-lg min-h-[80px]"
                    placeholder="Describe the invoice you want... e.g., an invoice for website design services at $1000 with 18% GST"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <button className="flex items-center gap-2 text-white/50 hover:text-white/80 transition-colors text-sm font-medium">
                      <Paperclip className="w-4 h-4" />
                      Import
                    </button>
                    <Link href="/auth/signup" className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors border border-white/10">
                      <ArrowUp className="w-5 h-5" />
                    </Link>
                  </div>
                </div>

              </motion.div>
            </div>
          </TubesBackground>
        </section>

        {/* Freedom Section */}
        <FreedomSection />

        {/* Pricing Section */}
        <div id="pricing">
          <PricingSection titleOverride="Choose Your Plan" />
        </div>

        {/* Features Stacking Cards Section */}
        <section className="py-16 md:py-20 relative bg-background" id="features">
          <div className="container mx-auto px-4 md:px-6 mb-16 text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              A Complete Toolkit for Your Business
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to execute and control your business operations.
            </p>
          </div>

          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col relative space-y-24 md:space-y-32">
              {mainFeatures.map((feature, idx) => (
                <div 
                  key={feature.title} 
                  className="sticky w-full"
                  style={{ 
                    top: `calc(6rem + ${idx * 1.5}rem)`,
                    zIndex: idx 
                  }}
                >
                  <div className="bg-[#0f1115] border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col md:flex-row min-h-[450px] w-full max-w-5xl mx-auto transform transition-all duration-500 group hover:-translate-y-2">
                    <div className="flex-1 w-full h-[250px] md:h-[unset] md:min-h-[450px] relative order-1 md:order-1 border-r border-white/5">
                      <Image 
                        src={feature.image} 
                        alt={feature.title}
                        fill
                        unoptimized={true}
                        className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                      />
                    </div>
                    <div className="flex-1 text-left order-2 md:order-2 p-10 md:p-16 flex flex-col justify-center relative overflow-hidden">
                      {/* Neon glow effect in the background */}
                      <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-primary/40 transition-colors duration-700" />
                      
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center gap-4 mb-8">
                          <span className="text-primary text-xs font-bold tracking-widest uppercase">{feature.title.split(' ')[0]}</span>
                          <span className="text-white/20 text-xs font-mono">0{idx + 1} / 0{mainFeatures.length}</span>
                        </div>
                        
                        <h3 className="mb-4 text-3xl md:text-4xl font-bold text-white tracking-tight">{feature.title}</h3>
                        <p className="text-base md:text-lg text-white/50 leading-relaxed mb-12">{feature.description}</p>
                        
                        <div className="mt-auto pt-4 flex justify-between items-center border-t border-white/10">
                          <div className="flex gap-2">
                            <span className="text-[10px] text-white/40 border border-white/10 px-2 py-1 rounded bg-white/5">AI Powered</span>
                            <span className="text-[10px] text-white/40 border border-white/10 px-2 py-1 rounded bg-white/5">Automated</span>
                          </div>
                          <Link href="/auth/signup" className="text-white hover:text-primary transition-colors text-sm font-medium flex items-center gap-2 mt-2 md:mt-0">
                            Try Now &rarr;
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Event Ticketing Platform Promo */}
        <section className="py-16 md:py-20 relative bg-background" id="events">
          <div className="container mx-auto px-4 md:px-6 mb-16 text-center">
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4">
              More Than Just Billing
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Sell tickets and manage live events alongside your invoicing, all from the same BizRoom account.
            </p>
          </div>

          <div className="container mx-auto px-4 md:px-6">
            <div className="bg-[#0f1115] border border-white/10 rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex flex-col md:flex-row max-w-5xl mx-auto relative">
              {/* Neon glow accent */}
              <div className="absolute -top-24 -left-24 w-80 h-80 bg-primary/20 rounded-full blur-[100px] pointer-events-none" />

              <div className="flex-1 p-10 md:p-16 relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">NEW</span>
                  <span className="text-primary text-xs font-bold tracking-widest uppercase">Event Ticketing Platform</span>
                </div>

                <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4">
                  Sell Event Tickets Like a Pro
                </h2>
                <p className="text-base md:text-lg text-white/50 leading-relaxed mb-10 max-w-lg">
                  Launch conferences, workshops, concerts and more with instant QR e-tickets, secure payments and a real-time organizer dashboard - built right into your BizRoom account.
                </p>

                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-white/80 text-sm md:text-base">
                    <QrCode className="w-5 h-5 text-primary shrink-0" />
                    Instant QR e-tickets emailed to every guest
                  </li>
                  <li className="flex items-center gap-3 text-white/80 text-sm md:text-base">
                    <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                    Secure payments with verified organizers
                  </li>
                  <li className="flex items-center gap-3 text-white/80 text-sm md:text-base">
                    <BarChart3 className="w-5 h-5 text-primary shrink-0" />
                    Live analytics - revenue, turnout &amp; check-in rate
                  </li>
                  <li className="flex items-center gap-3 text-white/80 text-sm md:text-base">
                    <CalendarCheck className="w-5 h-5 text-primary shrink-0" />
                    Guest ticket lookup by email OTP - no account needed
                  </li>
                </ul>

                <div className="flex flex-wrap gap-3">
                  <Button asChild className="bg-white hover:bg-white/90 text-black rounded-full px-6 h-11 text-sm font-medium">
                    <Link href="/tickets">
                      <Ticket className="mr-2 h-4 w-4" /> Explore Events
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="border-white/20 text-white bg-transparent hover:bg-white/10 hover:text-white rounded-full px-6 h-11 text-sm font-medium">
                    <Link href="/auth/signup">
                      Become an Organizer <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Decorative ticket visual */}
              <div className="flex-1 relative min-h-[280px] md:min-h-[unset] flex items-center justify-center border-t md:border-t-0 md:border-l border-white/5 p-10">
                <div className="relative w-full max-w-xs">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">E-Ticket</span>
                      <Ticket className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-white font-bold text-lg mb-1">BizRoom Live Summit</p>
                    <p className="text-white/40 text-xs mb-6">Sat, 12 Sep &middot; 6:00 PM</p>
                    <div className="border-t border-dashed border-white/15 pt-6 flex items-center justify-center">
                      <div className="bg-white p-3 rounded-lg">
                        <QrCode className="w-20 h-20 text-black" strokeWidth={1} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Arceage Style Testimonial Slider */}
        <section className="bg-[#f5f5f5] py-16 md:py-20 px-6 md:px-12 lg:px-24 flex items-center justify-center min-h-[420px] border-t border-gray-200">
          <div className="w-full max-w-5xl mx-auto flex flex-col h-full">
            <h4 className="text-gray-500 font-medium text-sm mb-12 tracking-wide uppercase">Customer Feedback</h4>
            
            <div className="flex-grow flex items-center justify-center min-h-[250px] mb-12">
              <motion.div
                key={activeTestimonial}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="text-center"
              >
                <p className="text-2xl md:text-3xl lg:text-4xl text-gray-700 font-light leading-relaxed max-w-4xl mx-auto">
                  «{testimonials[activeTestimonial].text}»
                </p>
              </motion.div>
            </div>

            <div className="w-full border-t border-gray-300 pt-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold text-lg border border-gray-300 shadow-sm">
                  {testimonials[activeTestimonial].avatar}
                </div>
                <div>
                  <h5 className="font-semibold text-gray-900 text-base">{testimonials[activeTestimonial].name}</h5>
                  <p className="text-sm text-gray-500 font-medium">{testimonials[activeTestimonial].role}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={handlePrevTestimonial}
                  className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors border border-gray-300/50 focus:outline-none"
                >
                  <ChevronLeft size={20} strokeWidth={2} />
                </button>
                <button 
                  onClick={handleNextTestimonial}
                  className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors border border-gray-300/50 focus:outline-none"
                >
                  <ChevronRight size={20} strokeWidth={2} />
                </button>
              </div>
            </div>
          </div>
        </section>


      </main>

      {/* CTA Section */}
      <CtaFooter />

      {/* Footer */}
      <div id="contact">
        <KresnaFooter />
      </div>
    </div>
  );
}
