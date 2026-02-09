
import { ai } from './genkit';
import { z } from 'genkit';

// Schema for the Poster Design Output
export const PosterDesignSchema = z.object({
    content: z.object({
        headline: z.string().describe("Main catchy title for the poster. Keep it short and impactful."),
        subtext: z.string().describe("Supporting details, date, time, or description. Max 20 words."),
        cta: z.string().describe("Call to Action text (e.g., 'Shop Now', 'Register Free')."),
        footer: z.string().optional().describe("Contact info or website for the bottom."),
    }),
    style: z.object({
        theme: z.enum(['modern', 'bold', 'minimal', 'festive', 'luxury']).describe("Visual theme of the poster."),
        colorPalette: z.object({
            primary: z.string().describe("Hex code for the primary accent color."),
            secondary: z.string().describe("Hex code for a secondary accent color."),
            background: z.string().describe("Hex code for the background color."),
            text: z.string().describe("Hex code for the main text color."),
        }),
        fontPairing: z.enum(['sans', 'serif', 'display', 'handwritten']).describe("Suggested font style."),
    }),
    visuals: z.object({
        iconKeyword: z.string().describe("A single keyword for an icon (e.g., 'tag', 'music', 'briefcase', 'heart', 'star') from Lucide-react library."),
        emojis: z.array(z.string()).describe("1-3 relevant emojis to decorate the poster."),
    })
});

export const generatePosterDesignFlow = ai.defineFlow(
    {
        name: 'generatePosterDesign',
        inputSchema: z.object({
            prompt: z.string(),
            businessType: z.string().optional(),
            vibe: z.string().optional(),
        }),
        outputSchema: PosterDesignSchema,
    },
    async ({ prompt, businessType = "General Business", vibe = "Professional" }) => {
        if (!process.env.GOOGLE_GENAI_API_KEY) {
            throw new Error("Missing GOOGLE_GENAI_API_KEY environment variable.");
        }

        const { output } = await ai.generate({
            prompt: `
            You are an expert AI Creative Director. Your goal is to design a stunning, effective poster for a business.
            
            **User Request:** "${prompt}"
            **Business Type:** ${businessType}
            **Desired Vibe:** ${vibe}

            **Task:**
            1. Create catchy, marketing-focused copy (Headline, Subtext, CTA).
            2. Choose a harmonious color palette (Hex codes) that matches the '${vibe}' vibe.
               - For 'Professional': Use blues, greys, whites.
               - For 'Festive': Use reds, golds, oranges.
               - For 'Luxury': Use blacks, golds, deep unmuted colors.
               - For 'Modern': Use vibrant gradients or high-contrast colors.
            3. Select a layout theme and font style.
            4. Suggest a relevant icon keyword that represents the core topic.

            **Return ONLY VALID JSON matching the schema.**
            `,
            output: { schema: PosterDesignSchema }
        });

        if (!output) {
            throw new Error("Failed to generate poster design.");
        }

        return output;
    }
);
