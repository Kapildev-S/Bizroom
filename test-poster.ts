
import { generatePosterDesignFlow } from './src/ai/poster';
import 'dotenv/config';

async function testPosterAI() {
    console.log("Testing AI Poster Creator...");
    console.log("API Key present:", !!process.env.GOOGLE_GENAI_API_KEY);

    try {
        const result = await generatePosterDesignFlow({
            prompt: "50% off on all Nike Shoes for Diwali Sale",
            businessType: "Footwear Store",
            vibe: "Festive"
        });

        console.log("Success! Generated Poster Design JSON:");
        console.log(JSON.stringify(result, null, 2));

    } catch (error: any) {
        console.error("AI Generation Failed with message:");
        console.error(error.message);
        console.error("Full Error:", JSON.stringify(error, null, 2));
    }
}

testPosterAI();
