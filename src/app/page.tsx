
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
  Loader2,
  Calculator,
  Smartphone,
} from "lucide-react";
import Image from "next/image";
import { useIsMobile } from "@/hooks/use-mobile";

// Feature data
const mainFeatures = [
  {
    icon: FileText,
    title: "GST Invoicing & Billing",
    description: "Create professional GST-compliant invoices in seconds. Share via PDF or WhatsApp.",
  },
  {
    icon: Package,
    title: "Inventory Management",
    description: "Track stock levels, manage products with custom units, and never run out of stock.",
  },
  {
    icon: Briefcase,
    title: "Staff Management",
    description: "Monitor daily attendance and log expenses for your team with detailed monthly reports.",
  },
  {
    icon: HandCoins,
    title: "Daily Ledger",
    description: "Easily record all your cash-in and cash-out transactions for a clear financial overview.",
  },
  {
    icon: Users,
    title: "Customer Management",
    description: "Keep all your client information organized in one place for easy access.",
  },
  {
    icon: Smartphone,
    title: "Mobile Recharge",
    description: "Recharge mobile numbers for all major operators instantly.",
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
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // If user is logged in, redirect them to the dashboard.
        // router.replace prevents the marketing page from being in browser history.
        router.replace('/dashboard');
      } else {
        // If no user, stop loading and show the marketing page.
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="container mx-auto py-6 px-4 md:px-6 flex justify-between items-center sticky top-0 z-50 bg-background/80 backdrop-blur-sm">
        <Link href="/" className="text-2xl font-headline font-bold text-foreground">Bizroom</Link>
        <nav className="hidden md:flex space-x-8 items-center font-medium text-sm">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <Link href="#" className="hover:text-primary transition-colors">About</Link>
          <Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link>
          <Link href="#contact" className="hover:text-primary transition-colors">Contact</Link>
        </nav>
        <div className="flex items-center space-x-2">
          <Button variant="outline" asChild className="flex gap-1.5 border-primary/20 hover:bg-primary/5 px-3 h-10">
            <Link href="/recharge">
              <Smartphone className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Recharge</span>
            </Link>
          </Button>
          <Button variant="ghost" asChild className="flex text-foreground hover:text-primary px-3 h-10">
            <Link href="/auth/login" className="text-xs sm:text-sm">Login</Link>
          </Button>
          <Button asChild className="hidden md:flex bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg rounded-md px-6">
            <Link href="/auth/signup">Sign Up</Link>
          </Button>
        </div>
      </header>

      <main className="flex-grow bg-background-light relative overflow-hidden">
        {/* Background gradient decorative elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        {/* Hero Section */}
        <section className="container mx-auto pt-32 pb-20 md:pt-40 md:pb-32 px-4 md:px-6 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" animate="visible" variants={fadeInFromLeft}>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-headline font-bold mb-6 text-foreground tracking-tight leading-tight">
                The Simplest Way to Manage Your Business
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
                Contact with the simplest way to manage your business to get in custom mouthis.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl transition-transform hover:scale-105 rounded-md px-8 py-6 text-lg font-medium">
                  <Link href="/auth/signup">Create FREE Invoice</Link>
                </Button>
              </div>
            </motion.div>
            <motion.div initial="hidden" animate="visible" variants={fadeInFromRight} className="relative">
              {/* Decorative floating elements */}
              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-10 -right-10 z-20"
              >
                <div className="w-16 h-16 bg-yellow-400 rounded-full shadow-lg flex items-center justify-center text-yellow-600 font-bold border-4 border-white opacity-80 rotate-12">₹</div>
              </motion.div>
              <motion.div
                animate={{ y: [0, 20, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-10 -left-10 z-20"
              >
                <div className="w-12 h-12 bg-yellow-400 rounded-full shadow-lg flex items-center justify-center text-yellow-600 font-bold border-4 border-white opacity-80 -rotate-12">₹</div>
              </motion.div>

              <Image
                src="https://images.unsplash.com/photo-1735825764485-93a381fd5779?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxNHx8JTIwQSUyMHBlcnNvbiUyMGJhbGFuY2luZyUyMHRyYWRpdGlvbmFsJTIwZG9jdW1lbnRzJTIwd2l0aCUyMGFuJTIwb25saW5lJTIwaW52b2ljZSUyMHN5c3RlbS4lMjBTdW1VcCUyMGNvbWJpbmVzJTIwY29udmVuaWVuY2UlMjBhbmQlMjBlZmZpY2llbmN5JTIwZm9yJTIwYnVzaW5lc3Nlcy58ZW58MHx8fHwxNzUwNzAyNDM4fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="BizRoom Dashboard"
                width={800}
                height={600}
                className="rounded-xl shadow-2xl border-8 border-white/50 backdrop-blur-sm transform rotate-y-12 floating-object"
                data-ai-hint="business dashboard"
                priority
              />
            </motion.div>
          </div>
        </section>

        {/* Pricing Section */}
        <div id="pricing">
          <PricingSection titleOverride="Choose Your Plan" />
        </div>



        {/* Features Grid Section */}
        <section className="py-20 md:py-28 relative">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-headline font-bold text-foreground mb-4">
                A Complete Toolkit for Your Business
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Build yoursecutions and consover your business
              </p>
            </div>
            <motion.div
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={containerVariants}
            >
              {mainFeatures.map((feature, idx) => (
                <motion.div key={feature.title} variants={itemVariants} className={idx === 1 || idx === 2 ? "" : ""}>
                  <div className="group relative overflow-hidden rounded-2xl bg-white/50 border border-white/60 p-6 transition-all hover:shadow-lg hover:-translate-y-1 glass-card">
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>




        {/* Testimonials */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-headline font-semibold text-primary">Loved by Business Owners Like You</h2>
              <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">See what our users are saying about how BizRoom has simplified their work.</p>
            </div>
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={containerVariants}
            >
              {[
                { name: "Rajesh Kumar", role: "Grocery Store Owner", text: "This app is a lifesaver! I can create invoices in seconds and track all my sales. My accounting is so much easier now." },
                { name: "Priya Sharma", role: "Boutique Owner", text: "Managing my inventory used to be a headache. With BizRoom, I know exactly what I have in stock. The reports are also very helpful for planning." },
                { name: "Amit Singh", role: "Contractor", text: "Finally, a simple app that does everything I need. Client management, invoicing, and even staff attendance. Highly recommended!" }
              ].map((testimonial) => (
                <motion.div key={testimonial.name} variants={itemVariants}>
                  <Card className="h-full flex flex-col bg-background">
                    <CardContent className="pt-6 flex-grow">
                      <div className="flex mb-2">
                        {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />)}
                      </div>
                      <p className="text-muted-foreground italic">"{testimonial.text}"</p>
                    </CardContent>
                    <CardHeader>
                      <CardTitle className="text-base font-semibold">{testimonial.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </CardHeader>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 md:py-28 bg-primary/5">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-headline mb-4">Ready to simplify your business?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Join thousands of small business owners who trust BizRoom to manage their operations. Get started for free, no credit card required.
            </p>
            <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-transform hover:scale-105 rounded-full px-8 py-6 text-lg">
              <Link href="/auth/signup">Start for Free Now</Link>
            </Button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer id="contact" className="py-12 border-t bg-muted/20">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <BillEaseLogo />
              <p className="mt-4 text-muted-foreground text-sm">
                Simplifying business management for retailers and service providers.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
                <Link href="/#pricing" className="hover:text-primary transition-colors">Pricing</Link>
                <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link>
                <Link href="/refund" className="hover:text-primary transition-colors">Refund Policy</Link>
              </nav>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Get in Touch</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Mobile: <a href="tel:+919655613399" className="hover:text-primary transition-colors font-medium">+91 9655613399</a></p>
                <p>Email: <a href="mailto:info@bizroom.in" className="hover:text-primary transition-colors">info@bizroom.in</a></p>
              </div>
            </div>
          </div>

          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} BizRoom. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
