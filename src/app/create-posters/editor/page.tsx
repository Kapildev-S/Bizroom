
"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import EditablePoster, { PosterTemplate } from '@/components/posters/EditablePoster';
import templates from '@/lib/placeholder-images.json';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Share2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { Loader2 } from 'lucide-react';

const { businessTemplates, festivalTemplates } = templates;
const allTemplates: PosterTemplate[] = [...businessTemplates, ...festivalTemplates] as PosterTemplate[];

function Editor() {
    const searchParams = useSearchParams();
    const templateId = searchParams.get('template');
    
    const template = allTemplates.find(t => t.id === templateId);

    if (!template) {
        return (
             <div className="text-center py-10">
                <h2 className="text-2xl font-bold">Template not found</h2>
                <p className="text-muted-foreground">The requested template could not be loaded.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/create-posters">Back to templates</Link>
                </Button>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col h-full">
             <PageHeader 
                title={template.name}
                description="Click on any text to edit it."
             >
                 <div className="flex gap-2">
                    <Button variant="outline" asChild>
                        <Link href="/create-posters"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link>
                    </Button>
                    <Button><Download className="mr-2 h-4 w-4" /> Download</Button>
                </div>
             </PageHeader>
             <div className="flex-grow flex items-center justify-center bg-muted/50 rounded-lg p-4">
                <Card className="overflow-hidden shadow-2xl aspect-[16/9] w-full max-w-5xl">
                    <CardContent className="p-0 h-full w-full">
                        <EditablePoster template={template} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function EditorPage() {
    return (
        <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <Editor />
        </Suspense>
    )
}
