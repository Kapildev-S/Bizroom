import * as admin from 'firebase-admin';

type ChatMessage = {
  role: 'user' | 'model' | 'tool' | 'system';
  content: Array<{ text?: string }>;
};

type AgentMessage = {
  role: 'model';
  content: Array<{ text: string }>;
};

type BillingRouterResult = {
  message: AgentMessage;
  invoiceCard?: { invoiceId: string; invoiceNumber: string } | null;
};

type InvoiceDraftItem = {
  productQuery: string;
  quantity: number;
  unitPrice: number;
};

type InvoiceDraft = {
  customerName: string;
  items: InvoiceDraftItem[];
};

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

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const formatCurrency = (amount: number, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);

const toDate = (value: any): Date | null => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const getLastUserText = (messages: ChatMessage[]) => {
  const userMessage = [...messages].reverse().find((m) => m.role === 'user');
  return userMessage?.content?.map((part) => part.text || '').join(' ').trim() || '';
};

const monthMap: Record<string, number> = {
  january: 1,
  february: 2,
  march: 3,
  april: 4,
  may: 5,
  june: 6,
  july: 7,
  august: 8,
  september: 9,
  october: 10,
  november: 11,
  december: 12,
};

const getFirestore = () => {
  if (!db) throw new Error('Database not initialized');
  return db;
};

async function getInvoices(userId: string) {
  const snapshot = await getFirestore().collection(`users/${userId}/invoices`).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
}

async function getCustomers(userId: string) {
  const snapshot = await getFirestore().collection(`users/${userId}/customers`).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
}

async function getProducts(userId: string) {
  const snapshot = await getFirestore().collection(`users/${userId}/products`).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as any));
}

function matchProduct(query: string, products: any[]) {
  const normalizedQuery = normalizeText(query);
  const synonymHints: Record<string, string[]> = {
    recharge: ['recharge', 'prepaid recharge', 'mobile recharge', 'top up'],
    domain: ['domain', 'website domain', 'domain registration', 'domain name'],
    website: ['website', 'site', 'web design', 'web development'],
  };
  const hintWords = synonymHints[normalizedQuery] || [normalizedQuery];

  let best: any = null;
  let bestScore = -1;

  for (const product of products) {
    const name = normalizeText(product.name || '');
    if (!name) continue;

    let score = 0;
    if (name === normalizedQuery) score += 100;
    if (name.includes(normalizedQuery)) score += 50;
    if (normalizedQuery.includes(name)) score += 40;
    if (hintWords.some((hint) => name.includes(hint))) score += 25;
    if (hintWords.some((hint) => normalizedQuery.includes(hint))) score += 15;

    if (score > bestScore) {
      bestScore = score;
      best = product;
    }
  }

  return bestScore > 0 ? best : null;
}

const parseMonthYear = (text: string) => {
  const normalized = normalizeText(text);

  // Handle "last month"
  if (/\blast\s+month\b/i.test(normalized)) {
    const now = new Date();
    // now.getMonth() is 0-indexed (0=Jan, 5=Jun)
    const lastMonthIndex = now.getMonth() - 1; // -1 for Jan, 4 for Jun
    const year = lastMonthIndex < 0 ? now.getFullYear() - 1 : now.getFullYear();
    const month = lastMonthIndex < 0 ? 12 : lastMonthIndex + 1;
    return { month, year };
  }

  // Handle "this month" / "current month"
  if (/\b(?:this|current)\s+month\b/i.test(normalized)) {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }

  const monthEntry = Object.entries(monthMap).find(([name]) => normalized.includes(name));
  if (!monthEntry) return null;
  const month = monthEntry[1];
  const yearMatch = normalized.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : new Date().getFullYear();
  return { month, year };
};

/**
 * Parse a date range like "12.3.26-22.3.26" or "12/03/2026 - 22/03/2026"
 * Returns { startDate: Date, endDate: Date } or null
 */
const parseDateRange = (text: string): { startDate: Date; endDate: Date } | null => {
  // Match patterns: DD.MM.YY-DD.MM.YY or DD/MM/YYYY - DD/MM/YYYY or DD-MM-YY to DD-MM-YY
  const rangeMatch = text.match(
    /(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})\s*(?:-|to|until)\s*(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/i
  );
  if (!rangeMatch) return null;

  const parseDMY = (d: string, m: string, y: string): Date => {
    let year = Number(y);
    if (year < 100) year += 2000;
    return new Date(year, Number(m) - 1, Number(d));
  };

  const startDate = parseDMY(rangeMatch[1], rangeMatch[2], rangeMatch[3]);
  const endDate = parseDMY(rangeMatch[4], rangeMatch[5], rangeMatch[6]);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

  // Set endDate to end of day
  endDate.setHours(23, 59, 59, 999);
  return { startDate, endDate };
};

const parseInvoiceLookup = (text: string) => {
  const match =
    text.match(/\b(?:invoice|bill)\s*(?:no|number|#)?\s*[:\-]?\s*["']?\s*([A-Za-z0-9-]+)\s*["']?\b/i) ||
    text.match(/\b(?:latest|last)\s+(?:invoice|bill)\b/i);
  return match?.[1] || null;
};

const parseSimpleInvoiceDraft = (text: string): InvoiceDraft | null => {
  // Strip out "add discount X%" and "mobile no:" / "phone:" parts
  let cleanText = text
    .replace(/\b(?:add|apply|give)\s+discount\s+\d+\s*%/gi, '')
    .replace(/\b(?:mobile|phone|tel)\s*(?:no|number)?\s*:?\s*[+\d]+/gi, '')
    .trim();

  // Extract customer name: "create bill for kapil" or "bill for John"
  const customerMatch = cleanText.match(/(?:bill|invoice|make bill|make invoice|create bill|create invoice)\s+for\s+(.+?)(?:\s+with\s+|\s+and\s+|$)/i);
  const customerName = customerMatch?.[1]?.trim();
  if (!customerName) return null;

  // Get everything after "with" (or after the customer name clause if no "with")
  const withIndex = cleanText.search(/\bwith\b/i);
  const itemsSection = withIndex >= 0
    ? cleanText.substring(withIndex + 4).trim()
    : cleanText.replace(customerMatch?.[0] || '', '').trim();
  if (!itemsSection) return null;

  // Split by "and" to get individual item phrases
  const segments = itemsSection
    .split(/\s+and\s+/i)
    .map((s) => s.trim().replace(/^with\s+/i, '').replace(/\bof\b/gi, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const items: InvoiceDraftItem[] = [];
  for (const segment of segments) {
    // Try multiple parsers for different input formats

    // Try multiple parsers for different input formats
    let res: RegExpMatchArray | null;

    // Format 1: "recharge 2qty with ₹199" or "domain 2qty ₹399" or "recharge 2 qty ₹199"
    res = segment.match(/^(.+?)\s+(\d+)\s*qty\s*(?:\s+with\s+)?(?:[₹$])?\s*([\d.,]+)\s*$/i);
    if (!res) {
      // Format 2: "recharge of 2 qty ₹199" or "2 recharge at ₹199 each" (qty first)
      res = segment.match(/^(\d+)\s+(.+?)\s+(?:at|@|for|of)\s+(?:[₹$])?\s*([\d.,]+)\s*(?:each|per|pc)?\s*$/i);
    }
    if (!res) {
      // Format 3: "recharge ₹199 qty 2"
      res = segment.match(/^(.+?)\s+(?:[₹$])?\s*([\d.,]+)\s+(?:qty|quantity)\s+(\d+)\s*$/i);
    }
    if (!res) {
      // Format 4: Simple "recharge ₹199" (qty defaults to 1)
      res = segment.match(/^(.+?)\s+(?:[₹$])?\s*([\d.,]+)\s*$/i);
      if (res) {
        const productQuery = res[1].trim();
        const unitPrice = Number(res[2].replace(/,/g, ''));
        if (productQuery && unitPrice > 0 && !Number.isNaN(unitPrice)) {
          items.push({ productQuery, quantity: 1, unitPrice });
        }
        continue;
      }
    }

    if (!res) continue;

    // res[1] = product name or qty, res[2] = qty or price, res[3] = price or undefined
    let productQuery: string;
    let quantity: number;
    let unitPrice: number;

    if (res[3] !== undefined) {
      // Format 1 or 2: product name + qty + price
      productQuery = res[1].trim();
      quantity = Number(res[2]);
      unitPrice = Number(res[3].replace(/,/g, ''));
    } else {
      // Format 3: product name + price (qty defaults to 1) — already handled above
      continue;
    }

    if (!productQuery || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) continue;

    // Strip trailing keywords from product name (only if something remains)
    const stripped = productQuery.replace(/\b(recharge|domain|website|bill|invoice|qty|quantity|each|per|pc)\b$/i, '').trim();
    if (stripped) productQuery = stripped;

    items.push({ productQuery, quantity, unitPrice });
  }

  if (!items.length) return null;
  return { customerName, items };
};

const isRateLimitError = (error: any) => {
  const msg = String(error?.message || '');
  return (
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('503') ||
    msg.includes('high demand') ||
    msg.includes('Too Many Requests')
  );
};

const getOpenRouterConfig = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
  const siteUrl = process.env.OPENROUTER_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
  const appName = process.env.OPENROUTER_APP_NAME || 'BizRoom';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  return { apiKey, model, siteUrl, appName };
};

const callOpenRouterText = async (messages: ChatMessage[]) => {
  const { apiKey, model, siteUrl, appName } = getOpenRouterConfig();
  const system = `
You are BizBot, the billing assistant for BizRoom.
Answer clearly and briefly.
If the user asks about a billing summary, invoice lookup, or customer/product related question, answer naturally from the data already available in the conversation.
Keep the reply short and useful.
`;

  const payload = {
    model,
    max_tokens: 300,
    temperature: 0.2,
    messages: [
      { role: 'system', content: system.trim() },
      ...messages
        .filter((m) => m.role === 'user' || m.role === 'model')
        .map((m) => ({
          role: m.role === 'model' ? 'assistant' : 'user',
          content: m.content.map((part) => part.text || '').join(' ').trim(),
        }))
        .filter((message) => message.content.length > 0),
    ],
  };

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': siteUrl,
      'X-Title': appName,
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status} ${rawText}`);
  }

  const data = JSON.parse(rawText);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenRouter returned an empty response');
  }
  return String(content).trim();
};

const createCustomerIfMissing = async (userId: string, customerName: string) => {
  const firestore = getFirestore();
  const customers = await getCustomers(userId);
  const normalizedTarget = normalizeText(customerName);
  const existing = customers.find((customer) => normalizeText(customer.name || '') === normalizedTarget);
  if (existing) return existing;

  const ref = await firestore.collection(`users/${userId}/customers`).add({
    name: customerName,
    phone: '',
    email: '',
    address: '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    userId,
  });

  return { id: ref.id, name: customerName };
};

const createInvoiceDirect = async (userId: string, draft: InvoiceDraft) => {
  const firestore = getFirestore();
  const products = await getProducts(userId);
  const customer = await createCustomerIfMissing(userId, draft.customerName);

  const resolvedItems = draft.items.map((item) => {
    const product = matchProduct(item.productQuery, products);
    return {
      productId: product?.id || 'custom-item',
      productName: product?.name || item.productQuery,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
      matchedProduct: product || null,
    };
  });

  const counterRef = firestore.doc(`users/${userId}/counters/invoices`);
  let invoiceNumber = '';
  let invoiceId = '';

  await firestore.runTransaction(async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const lastId = counterSnap.exists ? (counterSnap.data()?.lastId || 0) : 0;
    const newId = lastId + 1;
    invoiceNumber = `INV${newId.toString().padStart(3, '0')}`;
    transaction.set(counterRef, { lastId: newId }, { merge: true });

    for (const item of resolvedItems) {
      const matchedProduct = item.matchedProduct;
      if (!matchedProduct || matchedProduct.stock === null || matchedProduct.stock === Infinity) continue;

      const productRef = firestore.collection(`users/${userId}/products`).doc(matchedProduct.id);
      const productSnap = await transaction.get(productRef);
      if (!productSnap.exists) continue;
      const stock = Number(productSnap.data()?.stock ?? 0);
      const nextStock = stock - item.quantity;
      if (nextStock < 0) {
        throw new Error(`Not enough stock for ${matchedProduct.name}. Only ${stock} left, but ${item.quantity} are required.`);
      }
      transaction.update(productRef, { stock: nextStock });
    }

    const newInvoiceRef = firestore.collection(`users/${userId}/invoices`).doc();
    invoiceId = newInvoiceRef.id;
    transaction.set(newInvoiceRef, {
      invoiceNumber,
      customerId: customer.id,
      customerName: draft.customerName,
      items: resolvedItems.map(({ matchedProduct, ...item }) => item),
      subtotal: resolvedItems.reduce((sum, item) => sum + item.totalPrice, 0),
      totalAmount: resolvedItems.reduce((sum, item) => sum + item.totalPrice, 0),
      taxRate: 0,
      taxAmount: 0,
      discountAmount: 0,
      issueDate: admin.firestore.FieldValue.serverTimestamp(),
      dueDate: admin.firestore.FieldValue.serverTimestamp(),
      status: 'sent',
      currency: 'INR',
      invoiceType: 'Retail',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      userId,
    } as admin.firestore.DocumentData);
  });

  return { invoiceId, invoiceNumber };
};

const answerSalesOfMonth = async (userId: string, text: string) => {
  const monthYear = parseMonthYear(text);
  if (!monthYear) return null;
  const invoices = await getInvoices(userId);
  const matching = invoices.filter((invoice) => {
    const date = toDate(invoice.issueDate || invoice.createdAt);
    return !!date && date.getMonth() + 1 === monthYear.month && date.getFullYear() === monthYear.year;
  });
  const totalSales = matching.reduce((sum, invoice) => sum + (Number(invoice.totalAmount) || 0), 0);
  const monthName = new Date(monthYear.year, monthYear.month - 1, 1).toLocaleString('en-US', { month: 'long' });
  const topInvoices = matching
    .sort((a, b) => (toDate(b.createdAt || b.issueDate)?.getTime() || 0) - (toDate(a.createdAt || a.issueDate)?.getTime() || 0))
    .slice(0, 5)
    .map((invoice) => `- ${invoice.invoiceNumber} | ${invoice.customerName} | ${formatCurrency(Number(invoice.totalAmount) || 0)}`);

  return {
    message: {
      role: 'model' as const,
      content: [{
        text: `**${monthName} ${monthYear.year} Sales**\n\n- Total bills: **${matching.length}**\n- Total value: **${formatCurrency(totalSales)}**\n\n${topInvoices.length ? `Recent bills:\n${topInvoices.join('\n')}` : 'No bills found for that month.'}`,
      }],
    },
  };
};

/**
 * Answer sales for a date range like "total sales from 12.3.26-22.3.26"
 */
const answerSalesDateRange = async (userId: string, text: string) => {
  const range = parseDateRange(text);
  if (!range) return null;
  const invoices = await getInvoices(userId);
  const matching = invoices.filter((invoice) => {
    const date = toDate(invoice.issueDate || invoice.createdAt);
    return !!date && date >= range.startDate && date <= range.endDate;
  });
  const totalSales = matching.reduce((sum, invoice) => sum + (Number(invoice.totalAmount) || 0), 0);
  const topInvoices = matching
    .sort((a, b) => (toDate(b.createdAt || b.issueDate)?.getTime() || 0) - (toDate(a.createdAt || a.issueDate)?.getTime() || 0))
    .slice(0, 5)
    .map((invoice) => `- ${invoice.invoiceNumber} | ${invoice.customerName} | ${formatCurrency(Number(invoice.totalAmount) || 0)}`);

  return {
    message: {
      role: 'model' as const,
      content: [{
        text: `**Sales from ${range.startDate.toLocaleDateString('en-IN')} to ${range.endDate.toLocaleDateString('en-IN')}**\n\n- Total bills: **${matching.length}**\n- Total value: **${formatCurrency(totalSales)}**\n\n${topInvoices.length ? `Recent bills:\n${topInvoices.join('\n')}` : 'No bills found in this period.'}`,
      }],
    },
  };
};

const answerRecentPaidBills = async (userId: string, text: string) => {
  const match = text.match(/last\s+(\d+)\s+days?/i);
  if (!match) return null;
  const days = Number(match[1]);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const invoices = await getInvoices(userId);
  const matching = invoices.filter((invoice) => {
    const date = toDate(invoice.issueDate || invoice.createdAt);
    return invoice.status === 'paid' && !!date && date >= cutoff;
  });
  const totalSales = matching.reduce((sum, invoice) => sum + (Number(invoice.totalAmount) || 0), 0);

  return {
    message: {
      role: 'model' as const,
      content: [{
        text: `**Paid bills in the last ${days} days**\n\n- Paid bills: **${matching.length}**\n- Total paid value: **${formatCurrency(totalSales)}**`,
      }],
    },
  };
};

const answerTopCustomer = async (userId: string) => {
  const invoices = await getInvoices(userId);
  if (!invoices.length) return null;

  const totals: Record<string, number> = {};
  invoices.forEach((invoice) => {
    const name = invoice.customerName || 'Unknown';
    totals[name] = (totals[name] || 0) + (Number(invoice.totalAmount) || 0);
  });

  const [topName, topValue] = Object.entries(totals).sort(([, a], [, b]) => b - a)[0] || [];
  if (!topName) return null;

  return {
    message: {
      role: 'model' as const,
      content: [{
        text: `**Top Customer**\n\n- Customer: **${topName}**\n- Total bill value: **${formatCurrency(topValue)}**`,
      }],
    },
  };
};

/**
 * Answer what stock is left for a product
 * e.g. "stock left for balloon", "how many balloons in stock"
 */
const answerStockQuery = async (userId: string, text: string) => {
  const normalized = normalizeText(text);
  // Extract the product name after "stock left for", "stock of", "how many", "in stock"
  const productMatch = normalized.match(/(?:stock\s+(?:left\s+)?(?:for|of)\s+|how\s+many\s+|quantity\s+of\s+|balance\s+(?:of\s+)?|remaining\s+(?:of\s+)?)(.+)/i);
  if (!productMatch) return null;
  const productQuery = productMatch[1].trim();
  if (!productQuery) return null;

  const products = await getProducts(userId);
  const product = matchProduct(productQuery, products);
  if (!product) {
    return {
      message: {
        role: 'model' as const,
        content: [{ text: `Product "${productQuery}" not found.` }],
      },
    };
  }

  const stock = product.stock !== null && product.stock !== undefined ? Number(product.stock) : null;
  const stockText = stock !== null
    ? (stock === Infinity ? 'Unlimited' : String(stock))
    : 'N/A';

  return {
    message: {
      role: 'model' as const,
      content: [{
        text: `**Stock for ${product.name}**\n\n- Stock left: **${stockText}**`,
      }],
    },
  };
};

/**
 * Answer which product sold the most (highest quantity across all invoices)
 */
const answerTopProduct = async (userId: string) => {
  const invoices = await getInvoices(userId);
  if (!invoices.length) {
    return {
      message: {
        role: 'model' as const,
        content: [{ text: 'No invoices found to calculate top product.' }],
      },
    };
  }

  const productTotals: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const invoice of invoices) {
    const items = invoice.items || [];
    for (const item of items) {
      const key = item.productId || item.productName || 'unknown';
      if (!productTotals[key]) {
        productTotals[key] = { name: item.productName || key, qty: 0, revenue: 0 };
      }
      productTotals[key].qty += Number(item.quantity) || 0;
      productTotals[key].revenue += Number(item.totalPrice) || 0;
    }
  }

  const sorted = Object.values(productTotals).sort((a, b) => b.qty - a.qty);
  if (!sorted.length) {
    return {
      message: {
        role: 'model' as const,
        content: [{ text: 'No product sales data found.' }],
      },
    };
  }

  const top = sorted.slice(0, 5);
  const lines = top.map((p, i) =>
    `${i + 1}. **${p.name}** — ${p.qty} units sold — ${formatCurrency(p.revenue)}`
  );

  return {
    message: {
      role: 'model' as const,
      content: [{
        text: `**Top Selling Products**\n\n${lines.join('\n')}`,
      }],
    },
  };
};

const answerInvoiceLookup = async (userId: string, text: string) => {
  const lookupNumber = parseInvoiceLookup(text);
  const invoices = await getInvoices(userId);

  let match = null as any;
  if (lookupNumber) {
    const normalizedLookup = normalizeText(lookupNumber);
    match = invoices.find((invoice) => normalizeText(invoice.invoiceNumber || '') === normalizedLookup)
      || invoices.find((invoice) => normalizeText(invoice.invoiceNumber || '').includes(normalizedLookup));
  }

  if (!match) {
    match = [...invoices].sort((a, b) => (toDate(b.createdAt || b.issueDate)?.getTime() || 0) - (toDate(a.createdAt || a.issueDate)?.getTime() || 0))[0];
  }

  if (!match) {
    return {
      message: {
        role: 'model' as const,
        content: [{ text: 'No invoices found.' }],
      },
    };
  }

  const items = (match.items || []).slice(0, 5)
    .map((item: any) => `- ${item.productName} x${item.quantity} = ${formatCurrency(Number(item.totalPrice) || 0)}`)
    .join('\n');

  return {
    message: {
      role: 'model' as const,
      content: [{
        text: lookupNumber
          ? `**Invoice ${match.invoiceNumber}**\n- Customer: **${match.customerName}**\n- Amount: **${formatCurrency(Number(match.totalAmount) || 0)}**\n- Status: **${match.status}**\n\n**Items:**\n${items || 'N/A'}`
          : `**Latest Invoice**\n- Invoice No: **${match.invoiceNumber}**\n- Customer: **${match.customerName}**\n- Amount: **${formatCurrency(Number(match.totalAmount) || 0)}**\n- Status: **${match.status}**`,
      }],
    },
    invoiceCard: {
      invoiceId: match.id,
      invoiceNumber: match.invoiceNumber,
    },
  };
};

// ─── Mutation handlers ───────────────────────────────────────────────

/**
 * Handle "add customer" commands
 * e.g. "add customer John Doe phone 9876543210 email john@email.com"
 */
const handleAddCustomer = async (userId: string, text: string) => {
  const firestore = getFirestore();
  // Try to extract name after "add customer" or "new customer"
  const nameMatch = text.match(/(?:add|create|new)\s+customer\s+(.+?)(?:\s+phone\s+|\s+email\s+|\s+address\s+|$)/i);
  if (!nameMatch) return null;
  const customerName = nameMatch[1].trim();
  if (!customerName) return null;

  // Extract optional phone and email
  const phoneMatch = text.match(/phone\s+([+\d\s-]+?)(?:\s+email\s+|\s+address\s+|$)/i);
  const emailMatch = text.match(/email\s+([^\s]+@[^\s]+)/i);
  const addressMatch = text.match(/address\s+(.+?)$/i);

  const ref = await firestore.collection(`users/${userId}/customers`).add({
    name: customerName,
    phone: phoneMatch?.[1]?.trim() || '',
    email: emailMatch?.[1]?.trim() || '',
    address: addressMatch?.[1]?.trim() || '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    userId,
  });

  return {
    message: {
      role: 'model' as const,
      content: [{
        text: `**Customer added successfully**\n- Name: **${customerName}**\n- Phone: ${phoneMatch?.[1]?.trim() || 'N/A'}\n- Email: ${emailMatch?.[1]?.trim() || 'N/A'}`,
      }],
    },
  };
};

/**
 * Handle "add product" commands
 * e.g. "add product Balloon price 10 stock 100"
 */
const handleAddProduct = async (userId: string, text: string) => {
  const firestore = getFirestore();
  const nameMatch = text.match(/(?:add|create|new)\s+product\s+(.+?)(?:\s+price\s+|\s+stock\s+|\s+rate\s+|$)/i);
  if (!nameMatch) return null;
  const productName = nameMatch[1].trim();
  if (!productName) return null;

  const priceMatch = text.match(/(?:price|rate|cost)\s+[₹$]?\s*([\d.,]+)/i);
  const stockMatch = text.match(/stock\s+(\d+)/i);

  const ref = await firestore.collection(`users/${userId}/products`).add({
    name: productName,
    price: priceMatch ? Number(priceMatch[1].replace(/,/g, '')) : 0,
    stock: stockMatch ? Number(stockMatch[1]) : 0,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    userId,
  });

  return {
    message: {
      role: 'model' as const,
      content: [{
        text: `**Product added successfully**\n- Name: **${productName}**\n- Price: ${priceMatch ? formatCurrency(Number(priceMatch[1].replace(/,/g, ''))) : 'N/A'}\n- Stock: ${stockMatch?.[1] || '0'}`,
      }],
    },
  };
};

/**
 * Handle "update stock" commands
 * e.g. "update stock for Balloon to 200" or "increase stock of Balloon by 50"
 */
const handleUpdateStock = async (userId: string, text: string) => {
  const firestore = getFirestore();
  const normalized = normalizeText(text);
  const productQuery = normalized.match(/(?:stock\s+(?:for|of)\s+|update\s+stock\s+(?:for|of)\s+)(.+?)(?:\s+to\s+|\s+by\s+|\s+as\s+|\s*$)/i)?.[1]?.trim();
  if (!productQuery) return null;

  const products = await getProducts(userId);
  const product = matchProduct(productQuery, products);
  if (!product) {
    return {
      message: {
        role: 'model' as const,
        content: [{ text: `Product not found matching "${productQuery}".` }],
      },
    };
  }

  // Check for absolute set: "to 200"
  const toMatch = text.match(/\bto\s+(\d+)\b/i);
  // Check for incremental: "by 50" or "+50"
  const byMatch = text.match(/\b(?:by|add|increase)\s+(\d+)\b/i);
  const addMatch = text.match(/[+](\d+)/);

  let newStock: number;
  if (toMatch) {
    newStock = Number(toMatch[1]);
  } else if (byMatch) {
    newStock = (Number(product.stock) || 0) + Number(byMatch[1]);
  } else if (addMatch) {
    newStock = (Number(product.stock) || 0) + Number(addMatch[1]);
  } else {
    return null;
  }

  await firestore.collection(`users/${userId}/products`).doc(product.id).update({
    stock: newStock,
  });

  return {
    message: {
      role: 'model' as const,
      content: [{
        text: `**Stock updated**\n- Product: **${product.name}**\n- Previous stock: **${product.stock ?? 0}**\n- New stock: **${newStock}**`,
      }],
    },
  };
};

const routeDirectBillingQuestion = async (userId: string, text: string) => {
  const normalized = normalizeText(text);

  // Creation commands should never be treated as lookups.
  if (isCreateInvoiceIntent(text)) return null;

  // 1. Date range sales (e.g. "total sales from 12.3.26-22.3.26")
  if (/(?:sales|revenue|bill).*(?:from|between).*\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}/i.test(normalized)) {
    const result = await answerSalesDateRange(userId, text);
    if (result) return result;
  }

  // 2. Month sales (e.g. "sales in january", "last month sales", "this month sales")
  if (/(sales|revenue|bill value).*(month|january|february|march|april|may|june|july|august|september|october|november|december)/i.test(normalized) || /(?:last|this|current)\s+month\s+sales|sales\s+(?:of|for)\s+(?:last|this|current)\s+month/i.test(normalized) || /^show\s+(?:last|this|current)\s+month\s+sales$/i.test(normalized)) {
    return answerSalesOfMonth(userId, text);
  }

  // 3. Top customer
  if (/top\s+customer/i.test(normalized) || /best\s+customer/i.test(normalized) || /highest\s+(?:paying|spending)\s+customer/i.test(normalized)) {
    return answerTopCustomer(userId);
  }

  // 4. Top product / highest sold
  if (/(?:top|best|highest)\s+(?:selling|sold|product|products)/i.test(normalized) || /which\s+product\s+sold\s+(?:most|highest|the\s+most)/i.test(normalized)) {
    return answerTopProduct(userId);
  }

  // 5. Invoice lookup
  if (
    /(?:invoice|bill)\s*(?:no|number|#)?\s*[:\-]?\s*["']?[A-Za-z0-9-]+["']?/i.test(normalized) ||
    /\b(?:last|latest)\s+(?:invoice|bill)\b/i.test(normalized) ||
    /\bshow\s+(?:the\s+)?(?:invoice|bill)\b/i.test(normalized)
  ) {
    return answerInvoiceLookup(userId, text);
  }

  // 6. Stock query (e.g. "stock left for balloon", "how many balloons in stock")
  if (/(?:stock|balance|remaining|how many).*(?:left|for|of|in stock)/i.test(normalized) && !/(?:update|increase|add|change|set)\s+stock/i.test(normalized)) {
    const result = await answerStockQuery(userId, text);
    if (result) return result;
  }

  // 7. List all invoices/bills
  if (/(all|show|list).*(created|created bills|invoices|bills)/i.test(normalized)) {
    const invoices = await getInvoices(userId);
    const sorted = invoices
      .sort((a, b) => (toDate(b.createdAt || b.issueDate)?.getTime() || 0) - (toDate(a.createdAt || a.issueDate)?.getTime() || 0))
      .slice(0, 10);
    const total = invoices.reduce((sum, invoice) => sum + (Number(invoice.totalAmount) || 0), 0);

    return {
      message: {
        role: 'model' as const,
        content: [{
          text: `**Created Bills**\n\n- Total bills: **${invoices.length}**\n- Total value: **${formatCurrency(total)}**\n\n${sorted.length ? sorted.map((invoice) => `- ${invoice.invoiceNumber} | ${invoice.customerName} | ${formatCurrency(Number(invoice.totalAmount) || 0)} | ${invoice.status}`).join('\n') : 'No bills found.'}`,
        }],
      },
    };
  }

  // 8. Paid bills in last N days
  if (/last\s+\d+\s+days?.*(paid\s+bills|paid\s+invoices)/i.test(normalized) || /(paid bills|paid invoices).*(last\s+\d+\s+days?)/i.test(normalized)) {
    return answerRecentPaidBills(userId, text);
  }

  // 9. All invoices query (any sales/revenue question)
  if (/(?:total\s+)?(?:sales|revenue|income)/i.test(normalized)) {
    const invoices = await getInvoices(userId);
    const total = invoices.reduce((sum, invoice) => sum + (Number(invoice.totalAmount) || 0), 0);
    return {
      message: {
        role: 'model' as const,
        content: [{
          text: `**Total Sales**\n\n- Total bills: **${invoices.length}**\n- Total value: **${formatCurrency(total)}**`,
        }],
      },
    };
  }

  return null;
};

// ─── Mutation routing ────────────────────────────────────────────────

const routeMutation = async (userId: string, text: string) => {
  // Add customer
  if (/(?:add|create|new)\s+customer\s+/i.test(text)) {
    const result = await handleAddCustomer(userId, text);
    if (result) return result;
  }

  // Add product
  if (/(?:add|create|new)\s+product\s+/i.test(text)) {
    const result = await handleAddProduct(userId, text);
    if (result) return result;
  }

  // Update stock
  if (/(?:update|increase|change|set)\s+stock/i.test(text) || /stock.*to\s+\d+/i.test(text)) {
    const result = await handleUpdateStock(userId, text);
    if (result) return result;
  }

  return null;
};

const isCreateInvoiceIntent = (text: string) =>
  /(create|make|generate|new)\s+(bill|invoice)|\bbill\s+for\b|\binvoice\s+for\b/i.test(text);

const createInvoiceFromText = async (userId: string, text: string) => {
  const directDraft = parseSimpleInvoiceDraft(text);
  if (directDraft) {
    const invoice = await createInvoiceDirect(userId, directDraft);
    return {
      message: {
        role: 'model' as const,
        content: [{
          text: `**Bill created successfully**\n\n- Invoice No: **${invoice.invoiceNumber}**\n- Customer: **${directDraft.customerName}**\n- Status: **Sent**`,
        }],
      },
      invoiceCard: invoice,
    };
  }

  return null;
};

export async function handleBillingAgentRequest(messages: ChatMessage[], userId: string): Promise<BillingRouterResult> {
  const lastUserText = getLastUserText(messages);
  if (!lastUserText) {
    return {
      message: {
        role: 'model',
        content: [{ text: 'Please send a billing-related message so I can help.' }],
      },
    };
  }

  // 1. Handle mutations (add customer, add product, update stock)
  const mutationResult = await routeMutation(userId, lastUserText);
  if (mutationResult) return mutationResult as BillingRouterResult;

  // 2. Handle invoice creation before any lookup-style routing.
  if (isCreateInvoiceIntent(lastUserText)) {
    const created = await createInvoiceFromText(userId, lastUserText);
    if (created) return created;
    // If parsing failed, return helpful message instead of falling through to OpenRouter
    return {
      message: {
        role: 'model',
        content: [{ text: 'I understood you want to create a bill, but I couldn\'t parse the items. Please try a format like: "create bill for John with Recharge 2 qty ₹199 and Domain 2 qty ₹399"' }],
      },
    };
  }

  // 3. Handle direct billing queries (sales, stock check, top customer, top product, invoice lookup)
  const directQuery = await routeDirectBillingQuestion(userId, lastUserText);
  if (directQuery) return directQuery as BillingRouterResult;

  // 4. Fallback to OpenRouter AI
  try {
    const reply = await callOpenRouterText(messages);
    return {
      message: {
        role: 'model',
        content: [{ text: reply }],
      },
    };
  } catch (error: any) {
    const message = String(error?.message || '');
    if (isRateLimitError(error) || message.includes('OPENROUTER_API_KEY') || message.includes('OpenRouter error')) {
      return {
        message: {
          role: 'model',
          content: [{ text: 'I\'m having trouble with the chat provider right now, but billing lookups and bill creation still work. Please try again in a moment.' }],
        },
      };
    }
    throw error;
  }
}
