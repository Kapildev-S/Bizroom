
"use client";

import React from 'react';
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Image from "next/image";
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Star } from 'lucide-react';
import templates from '@/lib/placeholder-images.json';
import EditablePoster from '@/components/posters/EditablePoster';
import Link from 'next/link';

const { businessTemplates } = templates;

interface TemplateCardProps {
  template: { id: string; name: string; previewImageUrl: string; aiHint: string; };
  aspectRatio?: 'portrait' | 'landscape';
  className?: string;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, aspectRatio = 'landscape', className }) => {

    return (
        <Card 
            asChild
            className={`w-[200px] flex-shrink-0 overflow-hidden rounded-lg shadow-sm hover:shadow-xl hover:ring-2 hover:ring-primary transition-all duration-300 cursor-pointer group ${className}`}
        >
            <Link href={`/create-posters/editor?template=${template.id}`}>
              <CardContent className="p-0">
                  <div className="overflow-hidden aspect-[16/10]">
                      <Image
                          src={template.previewImageUrl}
                          alt={template.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          width={600}
                          height={400}
                          data-ai-hint={template.aiHint}
                      />
                  </div>
              </CardContent>
            </Link>
        </Card>
    );
};

export default function CreatePostersPage() {
    const featuredTemplate = businessTemplates.find(t => t.id === 'b2');

  if (!featuredTemplate) {
      return <div>Template not found.</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Create a design"
        description="Choose a template to start designing your next promotional poster."
      />

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Preview */}
        <div className="lg:col-span-2">
            <Card className="overflow-hidden shadow-lg aspect-[16/9] bg-muted">
                <CardContent className="p-0 h-full w-full">
                    <EditablePoster template={featuredTemplate} />
                </CardContent>
            </Card>
        </div>

        {/* Details Sidebar */}
        <div className="lg:col-span-1 space-y-6">
            <h1 className="text-2xl font-bold font-headline">{featuredTemplate.name}</h1>
            <p className="text-muted-foreground">Presentation (16:9) • 1920 x 1080 px</p>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>By</span>
                <span className="font-semibold text-primary">Vynex Studios</span>
                <Button variant="outline" size="sm" className="ml-2">Follow</Button>
            </div>
            
            <Button asChild size="lg" className="w-full">
               <Link href={`/create-posters/editor?template=${featuredTemplate.id}`}>
                Customize this template
               </Link>
            </Button>
            
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon"><Star className="h-5 w-5" /></Button>
                <Button variant="outline" size="icon">...</Button>
            </div>
        </div>
      </div>
      
      {/* "More Like This" Carousel */}
      <div className="space-y-4 pt-8">
        <h2 className="text-2xl font-semibold tracking-tight">More like this</h2>
        <div className="relative">
          <ScrollArea>
            <div className="flex space-x-4 pb-4">
              {businessTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  aspectRatio="landscape"
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
