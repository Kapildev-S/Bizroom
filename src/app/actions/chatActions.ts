'use server';

import { chatSupportFlow } from "@/ai/chat";

export type ChatMessage = {
    role: 'user' | 'model';
    content: string;
};

export async function chatWithSupport(history: ChatMessage[]) {
    try {
        const response = await chatSupportFlow({ messages: history });
        return { success: true, message: response };
    } catch (error: any) {
        console.error("Chat Action Error:", error);
        return { success: false, message: `Error: ${error.message || "Unknown error occurred"}` };
    }
}
