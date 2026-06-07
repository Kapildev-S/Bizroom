import { NextRequest, NextResponse } from 'next/server';
import { handleBillingAgentRequest } from '@/lib/billing-router';

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

    const response = await handleBillingAgentRequest(messages, userId);
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Agent Route Error]', error?.message || error);

    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
