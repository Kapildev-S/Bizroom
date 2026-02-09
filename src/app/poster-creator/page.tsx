
'use client';

import React, { useState, useTransition } from 'react';
import { generatePosterDesign, PosterOutput } from '@/app/actions/posterActions';
import { SmartPoster } from '@/components/poster/SmartPoster';
import { Loader2, Download, RefreshCw, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import html2canvas from 'html2canvas';
import AuthenticatedLayout from '@/components/layout/AuthenticatedLayout';

export default function PosterCreatorPage() {
    const [isPending, startTransition] = useTransition();
    const [posterData, setPosterData] = useState<PosterOutput | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Quick Prompt States
    const [prompt, setPrompt] = useState('');
    const [businessType, setBusinessType] = useState('');
    const [vibe, setVibe] = useState('Professional');

    const handleGenerate = async () => {
        if (!prompt) return;

        setError(null);
        startTransition(async () => {
            const result = await generatePosterDesign({
                prompt,
                businessType,
                vibe
            });

            if (result.success && result.data) {
                setPosterData(result.data);
            } else {
                setError(result.error || "Something went wrong.");
            }
        });
    };

    const handleDownload = async () => {
        const element = document.getElementById('poster-canvas');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true }); // High res
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = 'bizroom-poster.png';
            link.click();
        } catch (err) {
            console.error("Download failed", err);
        }
    };

    return (
        <AuthenticatedLayout pageTitle="AI Poster Creator">
            <div className="flex flex-col xl:flex-row gap-6 h-[calc(100vh-140px)]">
                {/* Left Panel - Controls */}
                <div className="w-full xl:w-1/3 space-y-6 overflow-y-auto pr-2">
                    <div className="space-y-2">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <Wand2 className="w-5 h-5 text-indigo-600" />
                            Design Controls
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Describe your event or offer, and let AI handle the design.
                        </p>
                    </div>

                    <div className="space-y-4 bg-card p-4 rounded-lg border shadow-sm">
                        <div className="space-y-2">
                            <Label>What is this poster for?</Label>
                            <Textarea
                                placeholder="e.g., Diwali Sale, 50% off on all Nike shoes available this weekend only!"
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="h-32 resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Business Type</Label>
                                <Input
                                    placeholder="e.g., Gym, Cafe"
                                    value={businessType}
                                    onChange={(e) => setBusinessType(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Vibe / Style</Label>
                                <Select value={vibe} onValueChange={setVibe}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Vibe" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Professional">Professional</SelectItem>
                                        <SelectItem value="Festive">Festive</SelectItem>
                                        <SelectItem value="Modern">Modern</SelectItem>
                                        <SelectItem value="Luxury">Luxury</SelectItem>
                                        <SelectItem value="Minimal">Minimal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button
                            onClick={handleGenerate}
                            disabled={isPending || !prompt}
                            className="w-full py-6 text-lg"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Designing...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="mr-2 h-5 w-5" />
                                    Generate Poster
                                </>
                            )}
                        </Button>

                        {error && (
                            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel - Preview */}
                <div className="flex-1 bg-muted/30 rounded-xl border flex flex-col items-center justify-center p-8 relative overflow-hidden">
                    {posterData ? (
                        <div className="flex flex-col items-center justify-center relative w-full h-full animate-in fade-in zoom-in duration-500">
                            {/* Container for the scaled poster */}
                            <div className="relative flex items-center justify-center" style={{ width: '100%', height: '100%', maxHeight: '600px' }}>
                                {/* Using CSS scale for visual preview, but html2canvas will capture the inner element at full resolution */}
                                <div className="transform scale-[0.4] md:scale-[0.5] lg:scale-[0.6] origin-center">
                                    <SmartPoster data={posterData} zoom={1} />
                                </div>
                            </div>

                            <div className="absolute bottom-4 flex gap-4">
                                <Button variant="outline" onClick={handleGenerate} disabled={isPending}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Regenerate
                                </Button>
                                <Button onClick={handleDownload} className="bg-green-600 hover:bg-green-700 text-white">
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Image
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground space-y-4">
                            <div className="w-24 h-24 bg-muted rounded-full mx-auto flex items-center justify-center">
                                <Wand2 className="w-10 h-10 opacity-50" />
                            </div>
                            <div>
                                <h3 className="text-xl font-medium text-foreground">Ready to Create</h3>
                                <p className="text-sm">Your AI-generated poster will appear here.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
