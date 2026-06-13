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
    model: 'googleai/gemini-2.5-flash',
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

// ─── Tools Factory ────────────────────────────────────────────────────────────
function getToolsForInstance(
  aiInstance: ReturnType<typeof genkit>,
  onInvoiceCreated?: (invoice: { invoiceId: string; invoiceNumber: string }) => void
) {
  const normalizeProductQuery = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizeText = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const toDate = (value: any): Date | null => {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const createCustomerTool = aiInstance.defineTool(
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

  const getCustomersTool = aiInstance.defineTool(
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

  const getProductsTool = aiInstance.defineTool(
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

  const getSalesByMonthTool = aiInstance.defineTool(
    {
      name: 'getSalesByMonth',
      description: 'Get total sales and bill count for a specific month and year.',
      inputSchema: z.object({
        userId: z.string(),
        month: z.number().int().min(1).max(12),
        year: z.number().int().min(2000).max(2100),
      }),
      outputSchema: z.any(),
    },
    async (input) => {
      if (!db) throw new Error('Database not initialized');

      const invoicesSnap = await db.collection(`users/${input.userId}/invoices`).get();
      const invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const matching = invoices.filter(inv => {
        const date = toDate(inv.issueDate || inv.createdAt);
        if (!date) return false;
        return date.getMonth() + 1 === input.month && date.getFullYear() === input.year;
      });

      return {
        month: input.month,
        year: input.year,
        totalBills: matching.length,
        totalSales: matching.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0),
        paidBills: matching.filter(inv => inv.status === 'paid').length,
        pendingBills: matching.filter(inv => inv.status !== 'paid').length,
        invoices: matching
          .sort((a, b) => {
            const aDate = toDate(a.issueDate || a.createdAt)?.getTime() || 0;
            const bDate = toDate(b.issueDate || b.createdAt)?.getTime() || 0;
            return bDate - aDate;
          })
          .slice(0, 10)
          .map(inv => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName,
            status: inv.status,
            totalAmount: inv.totalAmount,
            issueDate: toDate(inv.issueDate || inv.createdAt)?.toISOString() || null,
          })),
      };
    }
  );

  const getRecentPaidBillsTool = aiInstance.defineTool(
    {
      name: 'getRecentPaidBills',
      description: 'Get paid bills from the last N days.',
      inputSchema: z.object({
        userId: z.string(),
        days: z.number().int().min(1).max(365),
      }),
      outputSchema: z.any(),
    },
    async (input) => {
      if (!db) throw new Error('Database not initialized');

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - input.days);

      const invoicesSnap = await db.collection(`users/${input.userId}/invoices`).get();
      const invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const matching = invoices.filter(inv => {
        const date = toDate(inv.issueDate || inv.createdAt);
        return inv.status === 'paid' && !!date && date >= cutoff;
      });

      return {
        days: input.days,
        totalBills: matching.length,
        totalSales: matching.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0),
        invoices: matching
          .sort((a, b) => {
            const aDate = toDate(a.issueDate || a.createdAt)?.getTime() || 0;
            const bDate = toDate(b.issueDate || b.createdAt)?.getTime() || 0;
            return bDate - aDate;
          })
          .map(inv => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerName: inv.customerName,
            totalAmount: inv.totalAmount,
            issueDate: toDate(inv.issueDate || inv.createdAt)?.toISOString() || null,
          })),
      };
    }
  );

  const getTopCustomersTool = aiInstance.defineTool(
    {
      name: 'getTopCustomers',
      description: 'Get the top customers by bill value from all invoices or a recent period.',
      inputSchema: z.object({
        userId: z.string(),
        days: z.number().int().min(1).max(365).optional(),
        limit: z.number().int().min(1).max(20).optional().default(5),
      }),
      outputSchema: z.any(),
    },
    async (input) => {
      if (!db) throw new Error('Database not initialized');

      const cutoff = input.days ? (() => {
        const d = new Date();
        d.setDate(d.getDate() - input.days!);
        return d;
      })() : null;

      const invoicesSnap = await db.collection(`users/${input.userId}/invoices`).get();
      const invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const relevant = invoices.filter(inv => {
        const date = toDate(inv.issueDate || inv.createdAt);
        return !cutoff || (!!date && date >= cutoff);
      });

      const salesByCustomer: Record<string, number> = {};
      relevant.forEach(inv => {
        const name = inv.customerName || 'Unknown';
        salesByCustomer[name] = (salesByCustomer[name] || 0) + (Number(inv.totalAmount) || 0);
      });

      return {
        periodDays: input.days || null,
        topCustomers: Object.entries(salesByCustomer)
          .sort(([, a], [, b]) => b - a)
          .slice(0, input.limit)
          .map(([name, sales]) => ({ name, sales })),
      };
    }
  );

  const getInvoiceByNumberTool = aiInstance.defineTool(
    {
      name: 'getInvoiceByNumber',
      description: 'Find an invoice by its invoice number.',
      inputSchema: z.object({
        userId: z.string(),
        invoiceNumber: z.string(),
      }),
      outputSchema: z.any(),
    },
    async (input) => {
      if (!db) throw new Error('Database not initialized');

      const cleaned = normalizeText(input.invoiceNumber);
      const invoicesSnap = await db.collection(`users/${input.userId}/invoices`).get();
      const match = invoicesSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .find(inv => normalizeText(inv.invoiceNumber || '') === cleaned);

      if (!match) return null;

      return {
        id: match.id,
        invoiceNumber: match.invoiceNumber,
        customerName: match.customerName,
        totalAmount: match.totalAmount,
        status: match.status,
        issueDate: toDate(match.issueDate || match.createdAt)?.toISOString() || null,
      };
    }
  );

  const getLastCreatedInvoiceTool = aiInstance.defineTool(
    {
      name: 'getLastCreatedInvoice',
      description: 'Get the most recently created invoice.',
      inputSchema: z.object({ userId: z.string() }),
      outputSchema: z.any(),
    },
    async (input) => {
      if (!db) throw new Error('Database not initialized');

      const invoicesSnap = await db.collection(`users/${input.userId}/invoices`).get();
      const invoices = invoicesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const sorted = invoices.sort((a, b) => {
        const aDate = toDate(a.createdAt || a.issueDate)?.getTime() || 0;
        const bDate = toDate(b.createdAt || b.issueDate)?.getTime() || 0;
        return bDate - aDate;
      });

      const latest = sorted[0];
      if (!latest) return null;

      return {
        id: latest.id,
        invoiceNumber: latest.invoiceNumber,
        customerName: latest.customerName,
        totalAmount: latest.totalAmount,
        status: latest.status,
        issueDate: toDate(latest.issueDate || latest.createdAt)?.toISOString() || null,
      };
    }
  );

  const searchProductsTool = aiInstance.defineTool(
    {
      name: 'searchProducts',
      description: 'Search the user product catalog and return the closest matching product names for a given query.',
      inputSchema: z.object({
        userId: z.string(),
        query: z.string(),
      }),
      outputSchema: z.any(),
    },
    async (input) => {
      if (!db) throw new Error('Database not initialized');

      const snapshot = await db.collection(`users/${input.userId}/products`).get();
      const query = normalizeProductQuery(input.query);

      const synonymHints: Record<string, string[]> = {
        recharge: ['recharge', 'prepaid recharge', 'mobile recharge', 'top up'],
        domain: ['domain', 'website domain', 'domain registration', 'domain name'],
        website: ['website', 'site', 'web design', 'web development'],
      };

      const hintWords = synonymHints[query] || [query];

      const scored = snapshot.docs
        .map(doc => {
          const product = { id: doc.id, ...doc.data() } as any;
          const productName = normalizeProductQuery(product.name || '');
          let score = 0;

          if (!productName) return null;
          if (productName === query) score += 100;
          if (productName.includes(query)) score += 50;
          if (query.includes(productName)) score += 40;
          if (hintWords.some(hint => productName.includes(hint))) score += 25;
          if (hintWords.some(hint => query.includes(hint))) score += 15;

          return { ...product, score };
        })
        .filter(Boolean)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5);

      return scored;
    }
  );

  const createInvoiceTool = aiInstance.defineTool(
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

      onInvoiceCreated?.({ invoiceId, invoiceNumber });
      return { invoiceId, invoiceNumber, message: 'Invoice created successfully' };
    }
  );

  return [
    createCustomerTool,
    getCustomersTool,
    getProductsTool,
    searchProductsTool,
    getSalesByMonthTool,
    getRecentPaidBillsTool,
    getTopCustomersTool,
    getInvoiceByNumberTool,
    getLastCreatedInvoiceTool,
    createInvoiceTool,
  ];
}

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
You should understand short, informal, typo-prone billing requests and infer the most likely intent.
If the user request is ambiguous, ask one short clarifying question instead of guessing.

IMPORTANT RULES:
1. ALWAYS pass \`userId: "${userId}"\` when calling ANY tool.
2. If asked to create an invoice, first check if the customer exists using getCustomers. If not, create the customer first.
3. Before creating each invoice line item, resolve the user's wording to the exact stored product name.
   - Use searchProducts for each item phrase when needed.
   - Prefer exact catalog names like "Prepaid Recharge" over the user's shorthand like "recharge".
   - Example mappings: "recharge" -> "Prepaid Recharge", "domain" -> your stored domain product name, if available.
   - If a product/service doesn't exist, use a generic productId like "custom-item".
4. Calculate subtotal and totalAmount carefully before creating the invoice.
5. After successfully creating an invoice, tell the user it's done and mention the invoice number.
6. For billing questions, use these tools:
   - sales of a month -> getSalesByMonth
   - last N days paid bills -> getRecentPaidBills
   - top customer(s) -> getTopCustomers
   - invoice number lookup -> getInvoiceByNumber
   - last invoice created -> getLastCreatedInvoice
7. If a month is mentioned without a year, assume the current year.
8. If the user asks for a vague invoice number without details, use getLastCreatedInvoice and answer with the latest invoice number.
9. Return your final response in Markdown format. Be concise but friendly.
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
      let invoiceCard: { invoiceId: string; invoiceNumber: string } | null = null;
      const tools = getToolsForInstance(aiInstance, (invoice) => {
        invoiceCard = invoice;
      });
      const generated = await aiInstance.generate({
        messages: formattedMessages,
        tools,
        model: 'googleai/gemini-2.5-flash',
      });
      return { generated, invoiceCard };
    });

    return {
      message: response.generated.message,
      invoiceCard: response.invoiceCard,
    };
  }
);
