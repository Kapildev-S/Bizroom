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
      const numbersInQuery = query.match(/\d+/g) || [];

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

          numbersInQuery.forEach(num => {
             if (productName.includes(num)) score += 30;
          });

          const tokens = query.split(/\s+/);
          tokens.forEach(token => {
             if (token.length > 2 && productName.includes(token)) {
                score += 10;
             }
          });

          return { ...product, score };
        })
        .filter(p => p && p.score > 0)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5);

      return scored;
    }
  );

  const processInvoiceIntentTool = aiInstance.defineTool(
    {
      name: 'processInvoiceIntent',
      description: 'Extracts invoice intent (customer, products, quantities) from natural language and creates an invoice. Do NOT ask the user for exact format or prices. Just extract what they said.',
      inputSchema: z.object({
        userId: z.string(),
        customerQuery: z.string().optional(),
        items: z.array(z.object({
          productQuery: z.string(),
          quantity: z.number(),
        })),
        discountPercentage: z.number().optional(),
      }),
      outputSchema: z.any(),
    },
    async (input) => {
      if (!db) throw new Error('Database not initialized');

      // 1. Resolve Customer
      let customerId = 'walk-in';
      let customerName = 'Walk-in Customer';

      if (input.customerQuery && input.customerQuery.toLowerCase() !== 'walk-in') {
        const custSnap = await db.collection(`users/${input.userId}/customers`).get();
        const queryLower = input.customerQuery.toLowerCase();
        
        let bestCustMatch = null;
        for (const doc of custSnap.docs) {
          const data = doc.data();
          const name = (data.name || '').toLowerCase();
          const phone = (data.phone || '').toLowerCase();
          if (name.includes(queryLower) || phone.includes(queryLower)) {
            bestCustMatch = { id: doc.id, name: data.name, ...data };
            break;
          }
        }
        
        if (bestCustMatch) {
          customerId = bestCustMatch.id;
          customerName = bestCustMatch.name || 'Unknown';
        } else {
          return { error: `Could not find customer matching '${input.customerQuery}'. Please ask user to clarify or add the customer.` };
        }
      }

      // 2. Resolve Products
      const prodSnap = await db.collection(`users/${input.userId}/products`).get();
      const allProducts = prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      
      const resolvedItems = [];
      let subtotal = 0;

      for (const item of input.items) {
        const query = normalizeProductQuery(item.productQuery);
        const numbersInQuery = query.match(/\d+/g) || [];
        const tokens = query.split(/\s+/);
        
        let bestMatch = null;
        let highestScore = 0;
        let candidates: string[] = [];

        for (const p of allProducts) {
          const pName = normalizeProductQuery(p.name || '');
          let score = 0;
          if (!pName) continue;
          
          if (pName === query) score += 100;
          if (pName.includes(query)) score += 50;
          if (query.includes(pName)) score += 40;
          
          numbersInQuery.forEach(num => { if (pName.includes(num)) score += 30; });
          tokens.forEach(t => { if (t.length > 2 && pName.includes(t)) score += 10; });

          if (score > highestScore) {
            highestScore = score;
            bestMatch = p;
            candidates = [p.name];
          } else if (score === highestScore && score > 0) {
            candidates.push(p.name);
          }
        }

        if (!bestMatch || highestScore < 10) {
          return { error: `Could not find product matching '${item.productQuery}'. Please ask the user to clarify.` };
        }
        if (candidates.length > 1 && highestScore < 100) {
          return { error: `Found multiple products for '${item.productQuery}': ${candidates.join(', ')}. Please ask the user which one they meant.` };
        }

        const unitPrice = Number(bestMatch.price || bestMatch.mrp || 0);
        const calcTotal = unitPrice * item.quantity;
        subtotal += calcTotal;

        resolvedItems.push({
          productId: bestMatch.id,
          productName: bestMatch.name,
          quantity: item.quantity,
          unitPrice: unitPrice,
          totalPrice: calcTotal,
          mrp: unitPrice,
          taxAmount: 0,
          gstRate: 0,
        });
      }

      // 3. Apply Discount
      const discountPercent = input.discountPercentage || 0;
      const discountAmount = (subtotal * discountPercent) / 100;
      const totalAmount = subtotal - discountAmount;

      // 4. Create Invoice Transaction
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
          customerId,
          customerName,
          items: resolvedItems,
          subtotal,
          totalAmount,
          taxRate: 0,
          taxAmount: 0,
          discountAmount,
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
      return { 
        invoiceId, 
        invoiceNumber, 
        message: `Invoice ${invoiceNumber} created successfully for ${customerName} with ${resolvedItems.length} items. Total: ₹${totalAmount}`
      };
    }
  );
  const deleteInvoiceTool = aiInstance.defineTool(
    {
      name: 'deleteInvoice',
      description: 'Delete an invoice by its ID.',
      inputSchema: z.object({
        userId: z.string(),
        invoiceId: z.string(),
      }),
      outputSchema: z.any(),
    },
    async (input) => {
      if (!db) throw new Error('Database not initialized');
      await db.collection(`users/${input.userId}/invoices`).doc(input.invoiceId).delete();
      return { message: 'Invoice deleted successfully.' };
    }
  );

  const printInvoiceTool = aiInstance.defineTool(
    {
      name: 'printInvoice',
      description: 'Trigger the UI to print a specific invoice.',
      inputSchema: z.object({
        userId: z.string(),
        invoiceId: z.string(),
      }),
      outputSchema: z.any(),
    },
    async (input) => {
      // In a real setup, this might send a real-time message to the frontend.
      // For now, we return a special command string that the UI interprets.
      return { _trigger: 'PRINT_INVOICE', invoiceId: input.invoiceId, message: 'Print command sent.' };
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
    processInvoiceIntentTool,
    deleteInvoiceTool,
    printInvoiceTool,
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
You are "BizBot", the intelligent task orchestrator for "BizRoom".
Your primary goal is to reliably execute business workflows using intent extraction and tool calling.
You are NOT a general conversational chatbot. You are a business engine.

CRITICAL ORCHESTRATION RULES:
1. ALWAYS pass \`userId: "${userId}"\` when calling ANY tool.
2. EXTRACT INTENT, DON'T FIX FORMATS: Understand whatever the user says (even shorthand like "ck 65 2" or "recharge rendu"). Extract the customer name, product queries, and quantities, and pass them to \`processInvoiceIntent\`.
3. NO RIGID SCHEMAS: NEVER ask the user to provide exact prices, product IDs, or specific formats. The backend tools will handle fuzzy matching and database lookups.
4. CONTEXT MEMORY: Rely heavily on the chat history. If a user says "add 2 more" or "print it", use the active customer/invoice context from previous messages.
5. TOOL ECOSYSTEM:
   - For invoices: \`processInvoiceIntent\`, \`deleteInvoice\`, \`printInvoice\`
   - For lookup: \`getSalesByMonth\`, \`getRecentPaidBills\`, \`getTopCustomers\`, \`getInvoiceByNumber\`, \`getLastCreatedInvoice\`, \`searchProducts\`
6. Once a task is completed, return a concise Markdown summary of the action taken (e.g., "Invoice INV005 created successfully.").
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
