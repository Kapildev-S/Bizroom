'use server';

import { generateSocialMediaCaptionFlow } from "@/ai/social-media";

export type SocialMediaInput = {
    business_type: string;
    business_category?: string;
    tone: string;
    language: string;
    post_purpose: string;
    description?: string;
    length: string;
    cta?: string;
};

export type SocialMediaOutput = {
    caption: string;
    hashtags: string;
};

export async function generateSocialMediaCaption(input: SocialMediaInput) {
    try {
        const response = await generateSocialMediaCaptionFlow(input);
        return { success: true, data: response };
    } catch (error: any) {
        console.error("Social Media AI Error:", error);
        return {
            success: false,
            error: error.message || "Failed to generate caption. Please try again."
        };
    }
}
