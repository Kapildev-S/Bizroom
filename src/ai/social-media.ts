
import { ai } from './genkit';
import { z } from 'genkit';

export const generateSocialMediaCaptionFlow = ai.defineFlow(
    {
        name: 'generateSocialMediaCaption',
        inputSchema: z.object({
            business_type: z.string(),
            business_category: z.string().optional(),
            tone: z.string(),
            language: z.string(),
            post_purpose: z.string(),
            description: z.string().optional(),
            length: z.string(),
            cta: z.string().optional(),
        }),
        outputSchema: z.object({
            caption: z.string(),
            hashtags: z.string(),
        }),
    },
    async ({ business_type, business_category, tone, language, post_purpose, description, length, cta }) => {
        if (!process.env.GOOGLE_GENAI_API_KEY) {
            return {
                caption: "API Key missing. Please configure GOOGLE_GENAI_API_KEY in .env file.",
                hashtags: ""
            };
        }

        const { text } = await ai.generate({
            prompt: `
You are Bizroom AI, a daily social media content assistant built specifically for small and local businesses in India.

Your job is to generate READY-TO-POST social media captions with relevant hashtags that sound like they were written by a real business owner — not a marketer or influencer.

BUSINESS CONTEXT (persistent memory):
- Business type: ${business_type}
- Business category (if any): ${business_category || 'Not specified'}
- Preferred tone: ${tone}
- Preferred language: ${language}
- Typical posting style: simple, practical, customer-facing

TODAY'S POST DETAILS:
- Post purpose: ${post_purpose}
  (Offer / New arrival / Festival / Daily post / Announcement / Engagement)
- Short description (if provided): ${description || 'Not provided'}
- Caption length preference: ${length}
  (Short = WhatsApp / Medium = Instagram / Story-style)
- CTA preference (if any): ${cta || 'None'}

IMPORTANT RULES (VERY STRICT):
1. Write like a LOCAL BUSINESS OWNER, not a corporate brand.
2. Avoid generic marketing words like:
   "boost", "leverage", "unmatched", "revolutionary", "best in class".
3. Caption must be practical, friendly, and customer-focused.
4. Maximum emojis allowed: 2 (or none if not suitable).
5. Do NOT add prices unless explicitly mentioned.
6. Do NOT add location-based hashtags unless asked.
7. Support natural language mixing if language is set to "Mixed"
   (example: Tamil + English in the same caption).
8. Caption should be easy to understand for everyday customers.
9. Hashtags must be:
   - Relevant to business type
   - Suitable for Indian audience
   - Business-friendly (no spammy or viral-bait tags)
10. Do NOT repeat the same hashtags across different purposes if possible.
11. No motivational quotes. No filler lines.

HASHTAG RULES:
- Generate 8–15 hashtags
- Mix of:
  - Business type hashtags
  - Small business / local business hashtags
  - Purpose-based hashtags (offer, festival, new arrival, etc.)
- Keep hashtags mostly in English (even if caption is mixed language)

DAILY ASSISTANT MODE (if post purpose = "Daily post"):
- Suggest a natural reason to post today (routine, freshness, reminder).
- Keep it light and non-salesy unless stated.

OUTPUT FORMAT (STRICT – DO NOT CHANGE):

Caption:
<final caption text>

Hashtags:
#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5 #hashtag6 #hashtag7 #hashtag8
      `,
        });

        // Parse the response to extract caption and hashtags
        const lines = text.split('\n');
        let caption = '';
        let hashtags = '';
        let inCaptionSection = false;
        let inHashtagSection = false;

        for (const line of lines) {
            if (line.trim().toLowerCase().startsWith('caption:')) {
                inCaptionSection = true;
                inHashtagSection = false;
                continue;
            }
            if (line.trim().toLowerCase().startsWith('hashtags:')) {
                inHashtagSection = true;
                inCaptionSection = false;
                const hashtagsOnSameLine = line.substring(line.indexOf(':') + 1).trim();
                if (hashtagsOnSameLine) {
                    hashtags += hashtagsOnSameLine;
                }
                continue;
            }

            if (inCaptionSection && line.trim()) {
                caption += line + '\n';
            }
            if (inHashtagSection && line.trim()) {
                hashtags += (hashtags ? ' ' : '') + line.trim();
            }
        }

        return {
            caption: caption.trim() || text,
            hashtags: hashtags.trim()
        };
    }
);
