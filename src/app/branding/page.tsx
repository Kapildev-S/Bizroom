"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, PenSquare, Gem, Palette, Contact, BookImage, Store } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const includedServices = [
  { icon: PenSquare, title: "Strategic Naming", description: "A memorable name that tells your story and connects with local customers." },
  { icon: Gem, title: "Logo & Identity", description: "A unique logo that acts as the signature for your business." },
  { icon: Palette, title: "Color & Font Palette", description: "A carefully selected palette that reflects your brand's personality and values." },
  { icon: Contact, title: "Digital Visiting Card", description: "A modern, clickable card to instantly share your details." },
  { icon: BookImage, title: "WhatsApp Product Catalog", description: "A beautiful, easy-to-share catalog designed for how you do business." },
  { icon: Store, title: "In-Shop Experience", description: "Suggestions to align your physical store's look and feel with your new brand identity." },
];

export default function BrandingPage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative text-center py-16 md:py-24 rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-background">
        <div className="container mx-auto px-6 relative z-10">
            <p className="text-sm font-semibold tracking-widest text-primary uppercase">When Strategy Meets Design</p>
            <h1 className="mt-2 text-4xl md:text-5xl font-bold tracking-tight font-headline text-foreground">
                Building Brands That Do More Than Look Good
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
                For local business owners, a strong brand is your most valuable asset. We help you build your identity from scratch—not just with pretty designs, but with a strategic foundation that makes sense for your market and your customers.
            </p>
        </div>
      </section>

      {/* "What's Included" Section */}
      <section>
        <h2 className="text-3xl font-bold text-center font-headline">Your Complete Branding Toolkit</h2>
        <p className="mt-2 text-center text-muted-foreground">Everything a local business needs to establish a powerful, professional identity.</p>
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {includedServices.map((service) => (
            <Card key={service.title} className="text-center group hover:border-primary transition-all duration-300 hover:shadow-lg">
              <CardHeader>
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit group-hover:bg-primary/20 transition-colors">
                    <service.icon className="h-8 w-8 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <h3 className="text-xl font-semibold text-foreground">{service.title}</h3>
                <p className="text-muted-foreground mt-2 text-sm">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Our Philosophy & CTA Section */}
      <section className="bg-muted/50 rounded-lg">
          <div className="container mx-auto px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                 <div className="order-2 md:order-1">
                     <h2 className="text-3xl font-bold font-headline text-primary">Designed for India's Entrepreneurs</h2>
                     <p className="mt-4 text-muted-foreground">
                        We understand the hustle. Whether you're a first-time shopkeeper, a creative boutique owner, or a trader managing a busy schedule, your brand needs to work as hard as you do. Our process is built to be clear, collaborative, and focused on what truly matters for your business growth.
                     </p>
                      <ul className="mt-6 space-y-4">
                        <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                            <span><strong className="font-semibold">We listen first.</strong> We learn about your business, your goals, and your customers.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                            <span><strong className="font-semibold">Strategy-led design.</strong> Every color, font, and design choice has a purpose.</span>
                        </li>
                         <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                            <span><strong className="font-semibold">Tools you can use.</strong> We deliver practical assets you can start using immediately.</span>
                        </li>
                    </ul>
                    <div className="mt-8">
                         <Button asChild size="lg" className="rounded-full shadow-lg transition-transform hover:scale-105">
                            <Link href="mailto:kapildevsubash@gmail.com?subject=Inquiry%20about%20Branding%20Services">
                            Begin Your Branding Journey
                            </Link>
                        </Button>
                    </div>
                </div>
                <div className="order-1 md:order-2">
                    <Image 
                        src="https://images.unsplash.com/photo-1557426272-fc759fdf7a8d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw1fHxidXNpbmVzcyUyMG1lZXRpbmd8ZW58MHx8fHwxNzUxMTAwNTU1fDA&ixlib=rb-4.1.0&q=80&w=1080" 
                        alt="Collaborative branding session" 
                        className="rounded-lg shadow-2xl aspect-square object-cover" 
                        width={500} 
                        height={500} 
                        data-ai-hint="business meeting" 
                    />
                </div>
            </div>
          </div>
      </section>
    </div>
  );
}
