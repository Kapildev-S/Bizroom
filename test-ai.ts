
import { ai } from './src/ai/genkit';
import 'dotenv/config';

async function testAI() {
    console.log("Testing AI connection...");
    console.log("API Key present:", !!process.env.GOOGLE_GENAI_API_KEY);

    try {
        const { text } = await ai.generate({
            prompt: "Hello, are you working?",
        });
        console.log("Success! Response:", text);
    } catch (error: any) {
        console.error("AI Generation Failed with message:");
        console.error(error.message);
        console.error("Full Error:", JSON.stringify(error, null, 2));
    }
}

testAI();
