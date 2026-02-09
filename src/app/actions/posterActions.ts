
'use server';

import { generatePosterDesignFlow } from "@/ai/poster";

export type PosterInput = {
    prompt: string;
    businessType?: string;
    vibe?: string;
};

export type PosterOutput = {
    content: {
        headline: string;
        subtext: string;
        cta: string;
        footer?: string;
    };
    style: {
        theme: 'modern' | 'bold' | 'minimal' | 'festive' | 'luxury';
        colorPalette: {
            primary: string;
            secondary: string;
            background: string;
            text: string;
        };
        fontPairing: 'sans' | 'serif' | 'display' | 'handwritten';
    };
    visuals: {
        iconKeyword: string;
        emojis: string[];
    };
};

export async function generatePosterDesign(input: PosterInput) {
    try {
        const response = await generatePosterDesignFlow(input);
        return { success: true, data: response };
    } catch (error: any) {
        console.error("Poster Generation AI Error:", error);
        return {
            success: false,
            error: error.message || "Failed to generate design. Please describe your request clearly."
        };
    }
}
