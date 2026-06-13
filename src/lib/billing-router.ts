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
  reportCard?: ReportCard | null;
};

type ReportCard = {
  title: string;
  periodLabel: string;
  totalRevenue: number;
  totalInvoices: number;
  averageInvoiceValue: number;
  paidRevenue: number;
  totalPaid: number;
  totalUnpaid: number;
  statusDistribution: Array<{ name: string; value: number; color: string }>;
  monthlyTrend: Array<{ name: string; sales: number; count: number }>;
  topCustomers: Array<{ name: string; sales: number }>;
  topProducts: Array<{ name: string; qty: number; revenue: number }>;
  highlights: string[];
  exportRows: Array<Record<string, string | number>>;
};

type InvoiceDraftItem = {
  productQuery: string;
  quantity: number;
  unitPrice: number;
};

type InvoiceDraft = {
  customerName: string;
  customerPhone?: string;
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

const extractPhoneNumber = (text: string) => {
  const match = text.match(/\b(?:mobile|phone|tel|contact)\s*(?:no|number)?\s*[:\-]?\s*([+\d][\d\s\-]{7,}\d)\b/i);
  return match?.[1]?.replace(/[^\d+]/g, '').trim() || '';
};

const normalizeProductQuery = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b(recharges)\b$/i, 'recharge')
    .replace(/\b(domains)\b$/i, 'domain')
    .replace(/\b(websites)\b$/i, 'website');

const splitInvoiceItemSegments = (text: string) =>
  text
    .split(/\s*(?:,|;|\n|\s+\+\s+|\s+\band\b\s+|\s+\bplus\b\s+|\s+\bwith\b\s+|\s+\bincluding\b\s+)\s*/i)
    .map((segment) => segment.trim())
    .filter(Boolean);

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

const parseInvoiceItemSegment = (segment: string): InvoiceDraftItem | null => {
  const compact = segment.replace(/\s+/g, ' ').trim();
  if (!compact) return null;

  const patterns: RegExp[] = [
    // "3 recharges at 199 each"
    /^(\d+)\s+(.+?)\s+(?:at|@|for)\s*(?:[₹$])?\s*([\d.,]+)\s*(?:each|per|pc|piece|unit|units)?$/i,
    // "Recharge 2 qty ₹199" or "Recharge 2 qty at ₹199 each"
    /^(.+?)\s+(\d+)\s*(?:qty|quantity|units?|pcs?|pc)\s*(?:at|@|for|rate|price)?\s*(?:[₹$])?\s*([\d.,]+)\s*(?:each|per|pc|piece|unit|units)?$/i,
    // "2 recharge at ₹199 each"
    /^(\d+)\s+(.+?)\s+(?:at|@|for|of|rate|price)\s*(?:[₹$])?\s*([\d.,]+)\s*(?:each|per|pc|piece|unit|units)?$/i,
    // "Recharge @199 x 3" or "Recharge ₹199 qty 3"
    /^(.+?)\s*(?:@|at|for|rate|price)\s*(?:[₹$])?\s*([\d.,]+)\s*(?:x\s*)?(\d+)?\s*(?:qty|quantity|units?|pcs?|pc|each|per)?$/i,
    // "Recharge ₹199"
    /^(.+?)\s*(?:[₹$])?\s*([\d.,]+)\s*$/i,
  ];

  for (const pattern of patterns) {
    const match = compact.match(pattern);
    if (!match) continue;

    let productQuery = '';
    let quantity = 1;
    let unitPrice = 0;

    if (pattern === patterns[0]) {
      quantity = Number(match[1]);
      productQuery = match[2].trim();
      unitPrice = Number(match[3].replace(/,/g, ''));
    } else if (pattern === patterns[1]) {
      productQuery = match[1].trim();
      quantity = Number(match[2]);
      unitPrice = Number(match[3].replace(/,/g, ''));
    } else if (pattern === patterns[2]) {
      productQuery = match[1].trim();
      unitPrice = Number(match[2].replace(/,/g, ''));
      quantity = Number(match[3] || 1);
    } else {
      productQuery = match[1].trim();
      unitPrice = Number(match[2].replace(/,/g, ''));
      quantity = Number(match[3] || 1);
    }

    productQuery = productQuery.replace(/^[\d\sx]+/i, '').trim();
    if (!/[a-z]/i.test(productQuery) || quantity <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) continue;

    const stripped = normalizeProductQuery(
      productQuery.replace(/\b(recharge|domain|website|bill|invoice|qty|quantity|each|per|pc|piece|rate|price|item|items)\b$/i, '').trim()
    );
    return {
      productQuery: stripped || productQuery,
      quantity,
      unitPrice,
    };
  }

  return null;
};

const parseSimpleInvoiceDraft = (text: string): InvoiceDraft | null => {
  // Strip out discount language while keeping the rest of the request intact.
  let cleanText = text
    .replace(/\b(?:add|apply|give)\s+discount\s+\d+\s*%/gi, '')
    .replace(/^[\"']|[\"']$/g, '')
    .trim();

  const phoneMatch = extractPhoneNumber(cleanText);
  let customerPhone = phoneMatch;
  if (phoneMatch) {
    cleanText = cleanText.replace(/\b(?:mobile|phone|tel|contact)\s*(?:no|number)?\s*[:\-]?\s*[+\d][\d\s\-]{7,}\d\b/i, ' ').replace(/\s+/g, ' ').trim();
  }

  // Extract customer name from a wider set of billing verbs and connectors.
  const customerMatch = cleanText.match(/(?:bill|invoice|make bill|make invoice|create bill|create invoice|generate bill|generate invoice|raise bill|raise invoice|prepare bill|prepare invoice)\s+(?:for|to|of)\s+(.+)/i);
  const requestTail = customerMatch?.[1]?.trim().replace(/^[\"']|[\"']$/g, '');
  if (!requestTail) return null;

  const separatorMatch = requestTail.match(/\s*(,|\bwith\b|\bplus\b|\bincluding\b|\band\b)\s+/i);
  const separatorIndex = separatorMatch?.index ?? requestTail.length;
  let customerName = separatorMatch
    ? requestTail.slice(0, separatorIndex).trim()
    : requestTail.replace(/\s*(?:,|;)\s*$/, '').trim();
  if (!customerName) return null;

  // Extract phone number from customer name if it is embedded there.
  if (!customerPhone) {
    const embeddedPhone = customerName.match(/(?:\+?\d[\d\s-]{8,}\d)/);
    if (embeddedPhone) {
      customerPhone = embeddedPhone[0].replace(/[^\d+]/g, '').trim();
      customerName = customerName.replace(embeddedPhone[0], ' ').replace(/\s+/g, ' ').trim();
    }
  }

  // Remove "name:" prefix if present in customer name (e.g. "name:Kapil" -> "Kapil")
  customerName = customerName.replace(/^name:\s*/i, '').trim();

  if (!customerName) return null;

  const itemsSection = separatorMatch
    ? requestTail.slice(separatorIndex + separatorMatch[0].length).trim().replace(/^[\"']|[\"']$/g, '')
    : '';
  if (!itemsSection) return null;

  const cleanedItemsSection = itemsSection.replace(
    /\b(?:mobile|phone|tel|contact)\s*(?:no|number)?\s*[:\-]?\s*[+\d][\d\s\-]{7,}\d\b.*$/i,
    ''
  ).trim();

  // Split by common separators so prompts like "recharge x2 @199, domain x1 @399" are handled naturally.
  const segments = splitInvoiceItemSegments(cleanedItemsSection);

  const items: InvoiceDraftItem[] = [];
  for (const segment of segments) {
    const item = parseInvoiceItemSegment(segment);
    if (item) items.push(item);
  }

  if (!items.length) return null;
  return { customerName, customerPhone, items };
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
Understand the user's intent from short, informal, or incomplete billing prompts.
Map shorthand to likely billing actions such as invoice creation, invoice lookup, sales summary, stock lookup, or customer/product updates.
If a request is ambiguous, ask one short clarifying question instead of guessing.
Answer clearly, briefly, and in a helpful tone.
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

const createCustomerIfMissing = async (userId: string, customerName: string, phone?: string) => {
  const firestore = getFirestore();
  const customers = await getCustomers(userId);
  const normalizedTarget = normalizeText(customerName);
  const existing = customers.find((customer) => normalizeText(customer.name || '') === normalizedTarget);
  if (existing) return existing;

  const ref = await firestore.collection(`users/${userId}/customers`).add({
    name: customerName,
    phone: phone || '',
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
  const customer = await createCustomerIfMissing(userId, draft.customerName, draft.customerPhone);

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

const buildReportCard = (title: string, periodLabel: string, invoices: any[]): ReportCard => {
  const totalRevenue = invoices.reduce((sum, invoice) => sum + (Number(invoice.totalAmount) || 0), 0);
  const totalInvoices = invoices.length;
  const averageInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
  const totalPaid = invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + (Number(invoice.totalAmount) || 0), 0);
  const totalUnpaid = invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + (Number(invoice.totalAmount) || 0), 0);
  const paidCount = invoices.filter((invoice) => invoice.status === 'paid').length;
  const sentCount = invoices.filter((invoice) => invoice.status === 'sent').length;
  const overdueCount = invoices.filter((invoice) => invoice.status === 'overdue').length;
  const draftCount = invoices.filter((invoice) => invoice.status === 'draft').length;

  const statusDistribution = [
    { name: 'Paid', value: paidCount, color: '#19CB97' },
    { name: 'Sent', value: sentCount, color: '#0f6f80' },
    { name: 'Overdue', value: overdueCount, color: '#ef4444' },
    { name: 'Draft', value: draftCount, color: '#94a3b8' },
  ].filter((entry) => entry.value > 0);

  const monthlyMap: Record<string, { name: string; sales: number; count: number }> = {};
  invoices.forEach((invoice) => {
    const date = toDate(invoice.issueDate || invoice.createdAt);
    if (!date) return;
    const key = date.toLocaleString('default', { month: 'short' }) + ' ' + date.getFullYear();
    if (!monthlyMap[key]) monthlyMap[key] = { name: key, sales: 0, count: 0 };
    monthlyMap[key].sales += Number(invoice.totalAmount) || 0;
    monthlyMap[key].count += 1;
  });

  const customerTotals: Record<string, number> = {};
  invoices.forEach((invoice) => {
    const name = invoice.customerName || 'Unknown';
    customerTotals[name] = (customerTotals[name] || 0) + (Number(invoice.totalAmount) || 0);
  });
  const topCustomers = Object.entries(customerTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, sales]) => ({ name, sales }));

  const productTotals: Record<string, { name: string; qty: number; revenue: number }> = {};
  invoices.forEach((invoice) => {
    (invoice.items || []).forEach((item: any) => {
      const key = item.productId || item.productName || 'unknown';
      if (!productTotals[key]) productTotals[key] = { name: item.productName || key, qty: 0, revenue: 0 };
      productTotals[key].qty += Number(item.quantity) || 0;
      productTotals[key].revenue += Number(item.totalPrice) || 0;
    });
  });
  const topProducts = Object.values(productTotals)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const exportRows = invoices.map((invoice) => ({
    invoiceNumber: invoice.invoiceNumber || '',
    customerName: invoice.customerName || '',
    date: toDate(invoice.issueDate || invoice.createdAt)?.toLocaleDateString('en-IN') || '',
    status: invoice.status || '',
    totalAmount: Number(invoice.totalAmount) || 0,
    items: (invoice.items || []).length,
  }));

  return {
    title,
    periodLabel,
    totalRevenue,
    totalInvoices,
    averageInvoiceValue,
    paidRevenue: totalPaid,
    totalPaid,
    totalUnpaid,
    statusDistribution,
    monthlyTrend: Object.values(monthlyMap),
    topCustomers,
    topProducts,
    highlights: [
      `${totalInvoices} invoices in ${periodLabel}`,
      `${formatCurrency(totalRevenue)} total revenue`,
      `${paidCount} paid and ${overdueCount} overdue`,
    ],
    exportRows,
  };
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
  const reportCard = buildReportCard(`${monthName} ${monthYear.year} Sales`, `${monthName} ${monthYear.year}`, matching);

  return {
    message: {
      role: 'model' as const,
      content: [{
        text: `**${monthName} ${monthYear.year} Sales**\n\n- Total bills: **${matching.length}**\n- Total value: **${formatCurrency(totalSales)}**\n\n${topInvoices.length ? `Recent bills:\n${topInvoices.join('\n')}` : 'No bills found for that month.'}`,
      }],
    },
    reportCard,
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
  const periodLabel = `${range.startDate.toLocaleDateString('en-IN')} to ${range.endDate.toLocaleDateString('en-IN')}`;
  const reportCard = buildReportCard(`Sales from ${periodLabel}`, periodLabel, matching);

  return {
    message: {
      role: 'model' as const,
      content: [{
        text: `**Sales from ${range.startDate.toLocaleDateString('en-IN')} to ${range.endDate.toLocaleDateString('en-IN')}**\n\n- Total bills: **${matching.length}**\n- Total value: **${formatCurrency(totalSales)}**\n\n${topInvoices.length ? `Recent bills:\n${topInvoices.join('\n')}` : 'No bills found in this period.'}`,
      }],
    },
    reportCard,
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
  const reportCard = buildReportCard('Top Customer Report', 'all time', invoices);

  return {
    message: {
      role: 'model' as const,
      content: [{
        text: `**Top Customer**\n\n- Customer: **${topName}**\n- Total bill value: **${formatCurrency(topValue)}**`,
      }],
    },
    reportCard,
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
  const reportCard = buildReportCard('Top Products Report', 'all time', invoices);

  return {
    message: {
      role: 'model' as const,
      content: [{
        text: `**Top Selling Products**\n\n${lines.join('\n')}`,
      }],
    },
    reportCard,
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
    const reportCard = buildReportCard('Total Sales Report', 'all time', invoices);
    return {
      message: {
        role: 'model' as const,
        content: [{
          text: `**Total Sales**\n\n- Total bills: **${invoices.length}**\n- Total value: **${formatCurrency(total)}**`,
        }],
      },
      reportCard,
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
  /(create|make|generate|raise|prepare|new)\s+(bill|invoice)|\b(?:bill|invoice)\s+for\b|\b(?:create|make|generate|raise|prepare)\s+(?:a\s+)?(?:bill|invoice)\b/i.test(text);

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
