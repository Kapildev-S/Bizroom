
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, FilePenLine, Sparkles, MessageCircleReply } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

const includedServices = [
  { icon: FilePenLine, title: "Consistent Weekly Posts", description: "We create and share relevant posts every week to keep your audience engaged and informed." },
  { icon: Sparkles, title: "Timely Festival Greetings", description: "Never miss a chance to connect. We design and post beautiful greetings for all major festivals." },
  { icon: MessageCircleReply, title: "Active Engagement", description: "We handle comments and direct messages promptly, building a loyal community around your brand." },
];

export default function SocialMediaPage() {
  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative text-center py-16 md:py-24 rounded-lg overflow-hidden bg-gradient-to-br from-primary/10 to-background">
        <div className="container mx-auto px-6 relative z-10">
            <p className="text-sm font-semibold tracking-widest text-primary uppercase">Your Social Media, Handled</p>
            <h1 className="mt-2 text-4xl md:text-5xl font-bold tracking-tight font-headline text-foreground">
                Stay Connected, Even When You're Busy
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
                Running your business is a full-time job. Let us manage your social media, so you can focus on what you do best while your online presence continues to grow.
            </p>
        </div>
      </section>

      {/* "What's Included" Section */}
      <section>
        <h2 className="text-3xl font-bold text-center font-headline">Your Complete Social Media Solution</h2>
        <p className="mt-2 text-center text-muted-foreground">We keep your accounts active, professional, and engaging.</p>
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
                     <h2 className="text-3xl font-bold font-headline text-primary">Save Time, Stay Visible</h2>
                     <p className="mt-4 text-muted-foreground">
                        You don't need to be a social media expert. Our service is designed to be simple and effective, giving you peace of mind and more time in your day. We ensure your business is always active and professional online.
                     </p>
                      <ul className="mt-6 space-y-4">
                        <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                            <span><strong className="font-semibold">Consistency is Key.</strong> Regular posts build trust and keep you top-of-mind.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                            <span><strong className="font-semibold">Always Professional.</strong> Your brand's voice and style are always maintained.</span>
                        </li>
                         <li className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                            <span><strong className="font-semibold">Focus on Your Business.</strong> We handle the digital side, so you don't have to.</span>
                        </li>
                    </ul>
                    <div className="mt-8">
                         <Button asChild size="lg" className="rounded-full shadow-lg transition-transform hover:scale-105">
                            <Link href="mailto:kapildevsubash@gmail.com?subject=Inquiry%20about%20Social%20Media%20Handling">
                                Manage My Social Media
                            </Link>
                        </Button>
                    </div>
                </div>
                <div className="order-1 md:order-2">
                    <Image
                        src="https://images.unsplash.com/photo-1689004624325-6edf074228dd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwxfHxzb2NpYWwlMjBuZXR3b3JrfGVufDB8fHx8MTc1MDUxNTY2OHww&ixlib=rb-4.1.0&q=80&w=1080"
                        alt="Social media icons on a phone screen"
                        className="rounded-lg shadow-2xl aspect-square object-cover"
                        width={500}
                        height={500}
                        data-ai-hint="social media marketing"
                    />
                </div>
            </div>
          </div>
      </section>
    </div>
  );
}
