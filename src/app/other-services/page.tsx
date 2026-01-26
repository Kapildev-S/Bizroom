"use client";

import { Button } from '@/components/ui/button';
import Link from 'next/link';

const services = [
  {
    title: "Business Domain Name",
    description: "Get a custom domain like www.rahulsuperstore.in. A professional domain looks trusted, is easy to share on WhatsApp or flyers, and helps you rank on Google.",
  },
  {
    title: "Professional Email ID",
    description: "Get a professional email like info@yourshop.in. Impress customers and suppliers, build trust with every message, and manage it easily through Gmail or Outlook on your phone.",
  },
  {
    title: "Mobile-Ready Website",
    description: "We’ll build a responsive 1-page site or product catalog with your business intro, services, photos, and a WhatsApp button. A simple, fast-loading design that supports regional languages and is easy to share.",
  },
  {
    title: "Hosting & SSL Security",
    description: "Includes free hosting for 1 year on a fast server with an SSL (Secure) certificate. Your site will always be online and customers will feel safe, with no renewal headaches for you.",
  },
  {
    title: "Google Business Setup",
    description: "Appear in “near me” searches on Google. We’ll set up and optimize your profile with your business name, hours, photos, location, and contact details to boost foot traffic and credibility.",
  },
  {
    title: "Customization on Your Needs",
    description: "Need something different? We can tailor our services to fit your unique business requirements, whether it's a special feature, a different design, or something completely new.",
  }
];


export default function OtherServicesPage() {
  return (
    <div className="space-y-12">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase">Grow your business</p>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight font-headline text-foreground mt-1">
            Website Builder
          </h1>
        </div>
        <Button asChild size="lg" className="shadow-md flex-shrink-0 rounded-md">
            <Link href="mailto:kapildevsubash@gmail.com?subject=Inquiry%20about%20Website%20Services">
              Contact Us
            </Link>
        </Button>
      </header>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => (
          <div key={service.title} className="border border-border bg-card p-6 rounded-lg flex flex-col hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-foreground mb-2">{service.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed flex-grow">{service.description}</p>
          </div>
        ))}
      </div>

      <section className="bg-muted/40 rounded-lg p-8 md:p-12">
          <div className="text-center">
             <h2 className="text-3xl font-bold font-headline text-primary">Ready to Elevate Your Brand?</h2>
             <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
                Take the next step in growing your business online. Our team is here to build a website that you can be proud of. Get in touch today to discuss your project.
             </p>
             <Button asChild size="lg" className="mt-8 shadow-lg transition-transform hover:scale-105">
                <Link href="mailto:kapildevsubash@gmail.com?subject=Inquiry%20about%20Website%20Services">
                Start Your Website Project
                </Link>
            </Button>
          </div>
      </section>
    </div>
  );
}
