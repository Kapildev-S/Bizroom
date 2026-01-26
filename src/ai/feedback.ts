
import { ai } from './genkit';
import { z } from 'genkit';

export const analyzeFeedbackFlow = ai.defineFlow(
    {
        name: 'analyzeFeedback',
        inputSchema: z.array(z.object({
            rating: z.number(),
            comment: z.string(),
        })),
        outputSchema: z.string(),
    },
    async (feedbackItems) => {
        if (!process.env.GOOGLE_GENAI_API_KEY) {
            throw new Error("Missing GOOGLE_GENAI_API_KEY environment variable. AI features will not work without it.");
        }

        const feedbackPrompt = feedbackItems.map(f => `Rating: ${f.rating}/5, Comment: ${f.comment}`).join('\n');

        const { text } = await ai.generate({
            prompt: `
            You are a business consultant AI. Analyze the following customer feedback for a local shop.
            
            Customers provided the following ratings and comments:
            ${feedbackPrompt}
            
            Please provide:
            1. A concise summary of the overall customer sentiment (mention specific strengths and weaknesses).
            2. Exactly 3 clear, actionable, and practical suggestions for the shop owner to improve their business.
            
            Format your response in Markdown:
            ### Summary of Feedback
            [Your summary here]

            ### Actionable Suggestions
            1. **[Suggestion Title]**: [Explanation]
            2. **[Suggestion Title]**: [Explanation]
            3. **[Suggestion Title]**: [Explanation]
            
            Keep the tone professional yet encouraging.
            `,
        });

        return text;
    }
);
