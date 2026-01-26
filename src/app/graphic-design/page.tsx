
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, DraftingCompass, Megaphone, Contact, Box, MessageSquare, Package, FileType, Zap, IndianRupee } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const services = [
  { icon: DraftingCompass, title: "Custom Logos", description: "A unique identity for your brand." },
  { icon: Megaphone, title: "Festival Flyers", description: "Attract customers during festive seasons." },
  { icon: FileType, title: "Product Posters", description: "Showcase your products professionally." },
  { icon: Contact, title: "Business Cards", description: "Make a lasting first impression." },
  { icon: Package, title: "Packaging Labels", description: "Branded labels that stand out." },
  { icon: MessageSquare, title: "WhatsApp Creatives", description: "Engaging posts for social sharing." },
];

const features = [
    {
        icon: Zap,
        title: "Fast 48-Hour Delivery",
        description: "Get your final designs ready for use in just two days, so you never miss an opportunity."
    },
    {
        icon: Box,
        title: "All Formats Included",
        description: "We provide your designs in JPG, PNG, and print-ready PDF formats at no extra cost."
    },
    {
        icon: IndianRupee,
        title: "Made for India's Businesses",
        description: "Our designs are tailored for kirana shops, mess owners, traders, boutiques, and more."
    }
];

export default function GraphicDesignPage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative text-center py-16 md:py-24 rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-background">
         <div className="container mx-auto relative">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-headline text-primary">
              Stunning Graphic Design, Made Simple.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
              From professional logos to eye-catching flyers, we create visuals that build trust and drive sales. Easy, fast, and affordable for local businesses.
            </p>
         </div>
      </section>

      {/* Services Section */}
      <section>
        <h2 className="text-3xl font-bold text-center font-headline">What We Design</h2>
        <p className="mt-2 text-center text-muted-foreground">Everything you need to build a powerful brand presence.</p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service) => (
            <Card key={service.title} className="text-center group hover:border-primary transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
                    <service.icon className="h-8 w-8 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-xl font-semibold text-foreground">{service.title}</h3>
                <p className="text-muted-foreground mt-2">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-center">
            {features.map((feature) => (
                 <div key={feature.title} className="flex flex-col items-center p-6 bg-muted/50 rounded-lg">
                    <feature.icon className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-lg font-semibold">{feature.title}</h3>
                    <p className="text-muted-foreground mt-2 text-sm">{feature.description}</p>
                </div>
            ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary/5 rounded-lg">
          <div className="container mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                <div className="order-2 md:order-1">
                     <h2 className="text-3xl font-bold font-headline text-primary">Ready to Elevate Your Brand?</h2>
                     <p className="mt-4 text-muted-foreground">Let's create designs that your customers will love. Our process is simple and tailored to the needs of busy local business owners like you.</p>
                      <ul className="mt-6 space-y-4">
                        <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                            <span><strong className="font-semibold">No hidden fees, just great design.</strong> One price for all formats you need.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                            <span><strong className="font-semibold">Perfect for every platform.</strong> Optimized for print, WhatsApp, and online use.</span>
                        </li>
                         <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                            <span><strong className="font-semibold">We understand local markets.</strong> Designs that connect with your community.</span>
                        </li>
                    </ul>
                     <Button asChild size="lg" className="mt-8 rounded-full shadow-lg transition-transform hover:scale-105">
                        <Link href="mailto:kapildevsubash@gmail.com?subject=Inquiry%20about%20Graphic%20Design%20Services">
                        Start Your Design Project
                        </Link>
                    </Button>
                </div>
                <div className="order-1 md:order-2">
                    <Image 
                        src="https://images.unsplash.com/photo-1656618724305-a4257e46e847?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyMHx8Z3JhcGhpYyUyMGRlc2lnbnxlbnwwfHx8fDE3NTA1MTE5NjV8MA&ixlib=rb-4.1.0&q=80&w=1080" 
                        alt="Graphic Design Samples" 
                        className="rounded-lg shadow-2xl aspect-square object-cover" 
                        width={500} 
                        height={500} 
                        data-ai-hint="graphic design" 
                    />
                </div>
            </div>
          </div>
      </section>
    </div>
  );
}
