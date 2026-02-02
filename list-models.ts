
import 'dotenv/config';

async function listModels() {
    const key = process.env.GOOGLE_GENAI_API_KEY;
    if (!key) {
        console.error("No API Key found!");
        return;
    }

    console.log("Fetching models with key:", key.substring(0, 10) + "...");

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);

        if (!response.ok) {
            console.error(`HTTP Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error("Response Body:", text);
            return;
        }

        const data = await response.json();
        console.log("Available Models:");
        // @ts-ignore
        const modelNames = data.models?.map((m: any) => m.name) || [];
        console.log(modelNames.join('\n'));

    } catch (e: any) {
        console.log("Fetch Error:", e.message);
    }
}

listModels();
