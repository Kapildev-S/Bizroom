export type InvoiceProfitItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  profit: number; // calculated as (unitPrice - costPrice) * quantity
};

export type InvoiceProfit = {
  invoiceId: string;
  invoiceNumber: string;
  issueDate: string;
  customerName: string;
  totalInvoiceAmount: number;
  items: InvoiceProfitItem[];
  totalCost: number;
  totalProfit: number;
  updatedAt: string; // ISO string
};
