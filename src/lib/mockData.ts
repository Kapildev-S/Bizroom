
export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string; // Stored as ISO string
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number; // Infinity for services/unlimited
  unit?: string;
};

export type InvoiceItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  unit?: string;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string; // Denormalized for easy display
  customerPhone?: string; // Replaced email with phone
  issueDate: string; // Stored as ISO string
  dueDate: string; // Stored as ISO string
  items: InvoiceItem[];
  subtotal: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount?: number;
  taxRate: number; // Stored as decimal, e.g., 0.08 for 8%
  taxAmount: number;
  totalAmount: number;
  status: "draft" | "sent" | "paid" | "overdue" | "void";
  notes?: string;
  currency: string; // e.g., 'USD', 'INR'
};

export type SmsCampaign = {
  id: string;
  message: string;
  template: string;
  type: 'promotional' | 'transactional';
  sentAt: string; // ISO string
  recipientCount: number;
  status: 'Sent' | 'Scheduled' | 'Failed' | 'Partial Failure';
};

// Settings Types
export type BusinessProfile = {
  businessName?: string;
  gstNumber?: string;
  address?: string;
  email?: string;
  phone?: string;
  logoUrl?: string;
  invoicePrefix?: string;
};

export type InvoiceSettings = {
  defaultInvoiceType?: 'gst' | 'non-gst';
  footerNote?: string;
  enableDiscounts?: boolean;
  currency?: string;
  defaultTaxRate?: number;
  defaultDueDateDays?: number;
};

export type NotificationSettings = {
  email?: boolean;
  paymentReminders?: boolean;
  dailySummary?: boolean;
}

export type AppearanceSettings = {
  theme: 'light' | 'dark' | 'system';
}

export type InvoiceCustomizationSettings = {
  themeColor?: string;
  template?: string;
  showPartyBalance?: boolean;
};

export type PaymentSettings = {
  upiId?: string;
  bankDetails?: string;
  acceptedPaymentModes?: string[];
  enablePaymentReminders?: boolean;
};

export type AppSettings = {
  businessProfile: BusinessProfile;
  invoiceSettings: InvoiceSettings;
  notificationSettings: NotificationSettings;
  appearanceSettings: AppearanceSettings;
  customizationSettings: InvoiceCustomizationSettings;
  paymentSettings?: PaymentSettings;
  subscriptionStatus?: 'basic' | 'premium';
  premiumSince?: string;
  premiumExpiry?: string;
};

export type ColorOption = {
  name: string;
  value: string;
};

export const colorOptions: ColorOption[] = [
  { name: 'Default', value: 'hsl(var(--primary))' },
  { name: 'Green', value: 'hsl(142.1 76.2% 36.3%)' },
  { name: 'Blue', value: 'hsl(221.2 83.2% 53.3%)' },
  { name: 'Purple', value: 'hsl(262.1 83.3% 57.8%)' },
  { name: 'Red', value: 'hsl(346.8 77.2% 49.8%)' },
  { name: 'Indigo', value: 'hsl(240 5.9% 10%)' },
  { name: 'Gold', value: 'hsl(47.9 95.8% 53.1%)' },
  { name: 'Brown', value: 'hsl(25 95% 53.1%)' },
];


// Mock data is no longer the source of truth for authenticated users.
// Firestore will manage this data on a per-user basis.
// These arrays are kept for type reference and potential fallback/testing.

export const mockCustomers: Customer[] = [];

export const mockProducts: Product[] = [];

export const mockInvoices: Invoice[] = [];
