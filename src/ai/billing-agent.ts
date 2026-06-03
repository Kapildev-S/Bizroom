import { ai } from './genkit';
import { z } from 'genkit';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin if not already
if (!admin.apps.length) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    if (process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'bill-7362b',
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
        });
    }
}

const db = admin.apps.length ? admin.firestore() : null;

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
        if (!db) throw new Error("Database not initialized");
        const docRef = await db.collection(`users/${input.userId}/customers`).add({
            name: input.name,
            phone: input.phone || '',
            email: input.email || '',
            address: input.address || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            userId: input.userId,
        });
        return { id: docRef.id, ...input, message: "Customer created successfully" };
    }
);

export const getCustomersTool = ai.defineTool(
    {
        name: 'getCustomers',
        description: 'Fetch all registered customers for the user.',
        inputSchema: z.object({
            userId: z.string(),
        }),
        outputSchema: z.any(),
    },
    async (input) => {
        if (!db) throw new Error("Database not initialized");
        const snapshot = await db.collection(`users/${input.userId}/customers`).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
);

export const getProductsTool = ai.defineTool(
    {
        name: 'getProducts',
        description: 'Fetch all registered products/services for the user.',
        inputSchema: z.object({
            userId: z.string(),
        }),
        outputSchema: z.any(),
    },
    async (input) => {
        if (!db) throw new Error("Database not initialized");
        const snapshot = await db.collection(`users/${input.userId}/products`).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
);

export const createInvoiceTool = ai.defineTool(
    {
        name: 'createInvoice',
        description: 'Create a new invoice. Returns the created invoice ID.',
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
        if (!db) throw new Error("Database not initialized");
        
        const counterRef = db.doc(`users/${input.userId}/counters/invoices`);
        
        let invoiceNumber = '';
        await db.runTransaction(async (transaction) => {
            const counterSnap = await transaction.get(counterRef);
            let lastId = 0;
            if (counterSnap.exists) {
                lastId = counterSnap.data()?.lastId || 0;
            }
            const newId = lastId + 1;
            invoiceNumber = `INV${newId.toString().padStart(3, '0')}`;
            
            transaction.set(counterRef, { lastId: newId }, { merge: true });
            
            const newInvoiceRef = db.collection(`users/${input.userId}/invoices`).doc();
            transaction.set(newInvoiceRef, {
                invoiceNumber,
                customerId: input.customerId,
                customerName: input.customerName,
                items: input.items.map(item => ({
                    ...item,
                    mrp: item.unitPrice,
                    taxAmount: 0,
                    gstRate: 0
                })),
                subtotal: input.subtotal || 0,
                totalAmount: input.totalAmount || 0,
                taxAmount: 0,
                discountAmount: 0,
                issueDate: admin.firestore.FieldValue.serverTimestamp(),
                dueDate: admin.firestore.FieldValue.serverTimestamp(), // Simple default
                status: 'sent',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                userId: input.userId,
            });
            input.invoiceId = newInvoiceRef.id;
        });
        
        return { invoiceId: (input as any).invoiceId, invoiceNumber, message: "Invoice created successfully" };
    }
);

export const billingAgentFlow = ai.defineFlow(
    {
        name: 'billingAgent',
        inputSchema: z.object({
            messages: z.array(z.any()), // Pass through raw messages
            userId: z.string(),
        }),
        outputSchema: z.any(),
    },
    async ({ messages, userId }) => {
        if (!process.env.GOOGLE_GENAI_API_KEY) {
            return {
                message: {
                    role: 'model',
                    content: [{ text: "I'm sorry, my brain is offline right now (API Key missing)." }]
                }
            };
        }

        const systemPrompt = `
You are "BizBot", the friendly and helpful billing assistant for "BizRoom".
You can help users create customers, look up products, and create invoices.

IMPORTANT RULES:
1. ALWAYS pass \`userId: "${userId}"\` when calling ANY tool.
2. If asked to create an invoice, first check if the customer exists using getCustomers. If not, create the customer first.
3. Check if products exist using getProducts.
4. Calculate subtotal and totalAmount carefully before creating the invoice.
5. After successfully creating an invoice, provide the user with the invoice ID and tell them they can view or share it.
6. Return your final response in Markdown format. Be concise but friendly.
`;

        // Format history for Genkit
        const formattedMessages = messages.filter(m => m.role !== 'system').map(m => {
            return {
                role: m.role,
                content: typeof m.content === 'string' ? [{ text: m.content }] : m.content
            };
        });
        
        if (formattedMessages.length > 0 && formattedMessages[0].role === 'user') {
            const firstContent = formattedMessages[0].content[0];
            if (firstContent && firstContent.text) {
                firstContent.text = systemPrompt + "\n\n" + firstContent.text;
            }
        } else if (formattedMessages.length > 0) {
            formattedMessages.unshift({
                role: 'user',
                content: [{ text: systemPrompt }]
            });
        }

        const response = await ai.generate({
            messages: formattedMessages,
            tools: [createCustomerTool, getCustomersTool, getProductsTool, createInvoiceTool],
            // Use gemini-2.5-flash for tool calling
            model: 'googleai/gemini-2.5-flash',
        });

        // Convert response to generic format to send back
        return {
            message: response.message
        };
    }
);
