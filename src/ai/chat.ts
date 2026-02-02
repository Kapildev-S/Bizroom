
import { ai } from './genkit';
import { z } from 'genkit';

export const chatSupportFlow = ai.defineFlow(
    {
        name: 'chatSupport',
        inputSchema: z.object({
            messages: z.array(z.object({
                role: z.enum(['user', 'model']),
                content: z.string(),
            })),
        }),
        outputSchema: z.string(),
    },
    async ({ messages }) => {
        if (!process.env.GOOGLE_GENAI_API_KEY) {
            return "I'm sorry, my brain is offline right now (API Key missing). Please tell the developer to check the .env file!";
        }

        // Convert history to prompt format
        const history = messages.slice(0, -1).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
        const lastMessage = messages[messages.length - 1].content;

        const { text } = await ai.generate({
            prompt: `
        You are "BizBot", the friendly and helpful support assistant for "BizRoom".
        
        **About BizRoom:**
        BizRoom is a simplified billing and business management application for small businesses in India.
        
        **Knowledge Base (Use this to answer questions):**
        
        **1. Pricing Plans:**
        - **Monthly Plan:** ₹299/month. Includes: All Premium Features, Unlimited Invoices, Priority Support.
        - **Quarterly Plan:** ₹799/3 months (Save ~10%). Includes: All Monthly features + Quarterly Reports.
        - **Yearly Plan:** ₹2499/year (Best Value, Save ~30%). Includes: All Monthly features + Dedicated Account Manager.
        
        **2. Key Features:**
        - Create and manage professional invoices.
        - Track customers and sales.
        - Multi-ticket event booking management.
        - Business profile customization (Logo, Color, etc.).
        
        **3. How-To's:**
        - **Create Invoice:** Go to "Invoices" tab -> Click "+ Create New" -> Select Customer -> Add Items -> Save.
        - **Update Profile:** Go to "Settings" -> "Business Profile" -> Upload Logo/Change Details -> Save.
        
        **Guidelines:**
        - **Tone:** Professional, encouraging, and helpful. Use emojis like 😊, 🚀, ✅.
        - **Formatting:** ALWAYS use Markdown. Use **bold** for key terms and lists for steps.
        - **Pricing Queries:** If asked about price, quote the plans above directly. DO NOT say "check the website". You ARE the expert.
        - **Unknowns:** If asked about something not here (like "How do I fly to the moon"), politely say you are focused on BizRoom business support.

        **Conversation History:**
        ${history}

        **User's Latest Query:**
        ${lastMessage}
      `,
        });

        return text;
    }
);
