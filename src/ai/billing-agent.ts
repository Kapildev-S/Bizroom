import { z } from 'genkit';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import 'dotenv/config';
import * as admin from 'firebase-admin';
import { ai } from './genkit';

// ─── API Key Pool with Round-Robin Rotation ───────────────────────────────────
// Add multiple keys in your .env.local to spread load:
//   GOOGLE_GENAI_API_KEY_1=AIza...
//   GOOGLE_GENAI_API_KEY_2=AIza...
//   GOOGLE_GENAI_API_KEY_3=AIza...
// Falls back to GOOGLE_GENAI_API_KEY if no numbered keys found.
function getApiKeyPool(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const k = process.env[`GOOGLE_GENAI_API_KEY_${i}`];
    if (k) keys.push(k);
  }
  const fallback = process.env.GOOGLE_GENAI_API_KEY;
  if (fallback) keys.push(fallback);
  return [...new Set(keys)]; // deduplicate
}

let _keyIndex = 0;
function getNextApiKey(): string {
  const pool = getApiKeyPool();
  if (pool.length === 0) throw new Error('No Gemini API key configured. Set GOOGLE_GENAI_API_KEY in .env.local');
  const key = pool[_keyIndex % pool.length];
  _keyIndex = (_keyIndex + 1) % pool.length;
  return key;
}

// Create a fresh Genkit instance per-request with the chosen key
function makeAi(apiKey: string) {
  return genkit({
    plugins: [googleAI({ apiKey })],
    // gemini-1.5-flash: free tier = 15 RPM / 1M TPM (much higher than 2.5-flash)
    model: 'googleai/gemini-1.5-flash',
  });
}

// Wraps a generate call with automatic key rotation on 429 / 503
async function withKeyRotation<T>(
  fn: (ai: ReturnType<typeof genkit>) => Promise<T>
): Promise<T> {
  const pool = getApiKeyPool();
  let lastError: any;

  for (let attempt = 0; attempt < pool.length; attempt++) {
    const key = getNextApiKey();
    const ai = makeAi(key);
    try {
      return await fn(ai);
    } catch (err: any) {
      const msg: string = err?.message || '';
      const isRateLimit =
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('503') ||
        msg.includes('high demand') ||
        msg.includes('Too Many Requests');

      if (isRateLimit && attempt < pool.length - 1) {
        const waitMs = 600 * (attempt + 1);
        console.warn(`[BizBot] Key #${attempt + 1} rate-limited — rotating to next key (wait ${waitMs}ms)...`);
        await new Promise(r => setTimeout(r, waitMs));
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// ─── Firebase Admin Init ──────────────────────────────────────────────────────
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'bill-7362b',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
  }
}

const db = admin.apps.length ? admin.firestore() : null;

// ─── Tools ────────────────────────────────────────────────────────────────────
export const createCustomerTool = ai.defineTool(
  {
    name: 'createCustomer',
    description: 'Create a new customer in the database. Returns the customer ID and details.',
    inputSchema: z.object({
      userId: z.string(),
      name: z.string(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z.string().optional(),
    }),
    outputSchema: z.any(),
  },
  async (input) => {
    if (!db) throw new Error('Database not initialized');
    const docRef = await db.collection(`users/${input.userId}/customers`).add({
      name: input.name,
      phone: input.phone || '',
      email: input.email || '',
      address: input.address || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId: input.userId,
    });
    return { id: docRef.id, ...input, message: 'Customer created successfully' };
  }
);

export const getCustomersTool = ai.defineTool(
  {
    name: 'getCustomers',
    description: 'Fetch all registered customers for the user.',
    inputSchema: z.object({ userId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    if (!db) throw new Error('Database not initialized');
    const snapshot = await db.collection(`users/${input.userId}/customers`).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
);

export const getProductsTool = ai.defineTool(
  {
    name: 'getProducts',
    description: 'Fetch all registered products/services for the user.',
    inputSchema: z.object({ userId: z.string() }),
    outputSchema: z.any(),
  },
  async (input) => {
    if (!db) throw new Error('Database not initialized');
    const snapshot = await db.collection(`users/${input.userId}/products`).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
);

export const createInvoiceTool = ai.defineTool(
  {
    name: 'createInvoice',
    description: 'Create a new invoice. Returns the created invoice ID and invoice number.',
    inputSchema: z.object({
      userId: z.string(),
      customerId: z.string(),
      customerName: z.string(),
      items: z.array(z.object({
        productId: z.string(),
        productName: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        totalPrice: z.number(),
      })),
      subtotal: z.number(),
      totalAmount: z.number(),
    }),
    outputSchema: z.any(),
  },
  async (input) => {
    if (!db) throw new Error('Database not initialized');

    const counterRef = db.doc(`users/${input.userId}/counters/invoices`);
    let invoiceNumber = '';
    let invoiceId = '';

    await db.runTransaction(async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      const lastId = counterSnap.exists ? (counterSnap.data()?.lastId || 0) : 0;
      const newId = lastId + 1;
      invoiceNumber = `INV${newId.toString().padStart(3, '0')}`;
      transaction.set(counterRef, { lastId: newId }, { merge: true });

      const newInvoiceRef = db!.collection(`users/${input.userId}/invoices`).doc();
      invoiceId = newInvoiceRef.id;
      transaction.set(newInvoiceRef, {
        invoiceNumber,
        customerId: input.customerId,
        customerName: input.customerName,
        items: input.items.map(item => ({
          ...item,
          mrp: item.unitPrice,
          taxAmount: 0,
          gstRate: 0,
        })),
        subtotal: input.subtotal || 0,
        totalAmount: input.totalAmount || 0,
        taxRate: 0,
        taxAmount: 0,
        discountAmount: 0,
        issueDate: admin.firestore.FieldValue.serverTimestamp(),
        dueDate: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        currency: 'INR',
        invoiceType: 'Retail',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        userId: input.userId,
      });
    });

    return { invoiceId, invoiceNumber, message: 'Invoice created successfully' };
  }
);

// ─── Main Agent Flow ──────────────────────────────────────────────────────────
export const billingAgentFlow = ai.defineFlow(
  {
    name: 'billingAgent',
    inputSchema: z.object({
      messages: z.array(z.any()),
      userId: z.string(),
    }),
    outputSchema: z.any(),
  },
  async ({ messages, userId }) => {
    const pool = getApiKeyPool();
    if (pool.length === 0) {
      return {
        message: {
          role: 'model',
          content: [{ text: "I'm sorry, my brain is offline right now (API Key missing). Please add GOOGLE_GENAI_API_KEY to your environment." }],
        },
      };
    }

    const systemPrompt = `
You are "BizBot", the friendly and helpful billing assistant for "BizRoom".
You can help users create customers, look up products, and create invoices.

IMPORTANT RULES:
1. ALWAYS pass \`userId: "${userId}"\` when calling ANY tool.
2. If asked to create an invoice, first check if the customer exists using getCustomers. If not, create the customer first.
3. Check if products exist using getProducts. If a product/service doesn't exist, use a generic productId like "custom-item".
4. Calculate subtotal and totalAmount carefully before creating the invoice.
5. After successfully creating an invoice, tell the user it's done and mention the invoice number.
6. Return your final response in Markdown format. Be concise but friendly.
`;

    // Format message history for Genkit
    const formattedMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? [{ text: m.content }] : m.content,
      }));

    // Prepend system prompt to first user message
    if (formattedMessages.length > 0 && formattedMessages[0].role === 'user') {
      const firstContent = formattedMessages[0].content[0];
      if (firstContent?.text) {
        firstContent.text = systemPrompt + '\n\n' + firstContent.text;
      }
    } else if (formattedMessages.length > 0) {
      formattedMessages.unshift({ role: 'user', content: [{ text: systemPrompt }] });
    }

    // Generate with automatic key rotation on rate-limit errors
    const response = await withKeyRotation(async (aiInstance) => {
      return await aiInstance.generate({
        messages: formattedMessages,
        tools: [createCustomerTool, getCustomersTool, getProductsTool, createInvoiceTool],
        model: 'googleai/gemini-1.5-flash',
      });
    });

    return { message: response.message };
  }
);
