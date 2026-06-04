import { NextRequest, NextResponse } from 'next/server';
import { billingAgentFlow } from '@/ai/billing-agent';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages, userId } = body;

        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized: userId is required' }, { status: 401 });
        }
        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json({ error: 'Bad Request: messages array is required' }, { status: 400 });
        }

        const response = await billingAgentFlow({ messages, userId });
        return NextResponse.json(response);

    } catch (error: any) {
        console.error('[Agent Route Error]', error?.message || error);

        const msg: string = error?.message || '';
        const isRateLimit = msg.includes('429') || msg.includes('quota') || msg.includes('Too Many Requests');
        const isUnavailable = msg.includes('503') || msg.includes('high demand');

        if (isRateLimit || isUnavailable) {
            // Return a friendly model-style message so the chat UI shows it gracefully
            return NextResponse.json({
                message: {
                    role: 'model',
                    content: [{
                        text: isRateLimit
                            ? "⚠️ I'm getting too many requests right now. Please wait **30–60 seconds** and try again. You can also add more API keys to your `.env.local` to increase capacity."
                            : "⚠️ The AI service is temporarily busy. Please try again in a moment."
                    }]
                }
            });
        }

        return NextResponse.json(
            { error: error.message || 'An unexpected error occurred' },
            { status: 500 }
        );
    }
}

