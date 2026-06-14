
export type Customer = {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address: string;
  gstin?: string;
  createdAt: string; // Stored as ISO string
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  mrp?: number; // Maximum Retail Price — display only, no calculation role
  stock: number; // Infinity for services/unlimited
  unit?: string;
  hsnCode?: string;
  gstRate?: number;
  imageUrl?: string; // Image for POS
  category?: string; // e.g., Snacks, Beverages, Icecream
  soldBy?: 'piece' | 'weight' | 'both'; // 'piece' = unit-based, 'weight' = grams/kg based, 'both' = allows selection
  pricePerPiece?: number; // Used if soldBy is 'both'
  pricePerKg?: number; // Used if soldBy is 'both'
};

export type InvoiceItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  mrp?: number; // Display only — no calculation role
  totalPrice: number;
  unit?: string;
  hsnCode?: string;
  gstRate?: number; // Added combined GST rate (e.g. 18)
  taxAmount?: number; // Added combined tax amount
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string; // Denormalized for easy display
  customerPhone?: string; // Replaced email with phone
  issueDate: string; // Stored as ISO string
  dueDate: string; // Stored as ISO string
  invoiceType: "Retail" | "Wholesale";
  gstType?: 'CGST_SGST' | 'IGST';
  placeOfSupply?: string;
  customerGstin?: string;
  reverseCharge?: boolean;
  items: InvoiceItem[];
  subtotal: number;
  discountType?: 'percentage' | 'fixed';
  discountValue?: number;
  discountAmount?: number;
  taxRate: number; // Stored as decimal, e.g., 0.08 for 8%
  taxAmount: number;
  cgstRate?: number;
  cgstAmount?: number;
  sgstRate?: number;
  sgstAmount?: number;
  igstRate?: number;
  igstAmount?: number;
  totalAmount: number;
  status: "draft" | "sent" | "paid" | "overdue" | "void";
  notes?: string;
  currency: string; // e.g., 'USD', 'INR'
  isTaxInclusive?: boolean;
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
  enclaimQrUrl?: string;
  invoicePrefix?: string;
  state?: string;
};

export type InvoiceSettings = {
  defaultInvoiceType?: 'gst' | 'non-gst';
  footerNote?: string;
  enableDiscounts?: boolean;
  currency?: string;
  defaultTaxRate?: number;
  defaultDueDateDays?: number;
  nextInvoiceSequence?: number;
  enableAdvancedInvoiceSystem?: boolean;
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
  paperSize?: string;
  customWidth?: number;
  customHeight?: number;
  unit?: 'mm' | 'in';
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

export const INDIAN_STATES = [
  { code: "35", name: "Andaman and Nicobar Islands" },
  { code: "37", name: "Andhra Pradesh" },
  { code: "12", name: "Arunachal Pradesh" },
  { code: "18", name: "Assam" },
  { code: "10", name: "Bihar" },
  { code: "04", name: "Chandigarh" },
  { code: "22", name: "Chhattisgarh" },
  { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu" },
  { code: "07", name: "Delhi" },
  { code: "30", name: "Goa" },
  { code: "24", name: "Gujarat" },
  { code: "06", name: "Haryana" },
  { code: "02", name: "Himachal Pradesh" },
  { code: "01", name: "Jammu and Kashmir" },
  { code: "20", name: "Jharkhand" },
  { code: "29", name: "Karnataka" },
  { code: "32", name: "Kerala" },
  { code: "38", name: "Ladakh" },
  { code: "31", name: "Lakshadweep" },
  { code: "23", name: "Madhya Pradesh" },
  { code: "27", name: "Maharashtra" },
  { code: "14", name: "Manipur" },
  { code: "17", name: "Meghalaya" },
  { code: "15", name: "Mizoram" },
  { code: "13", name: "Nagaland" },
  { code: "21", name: "Odisha" },
  { code: "34", name: "Puducherry" },
  { code: "03", name: "Punjab" },
  { code: "08", name: "Rajasthan" },
  { code: "11", name: "Sikkim" },
  { code: "33", name: "Tamil Nadu" },
  { code: "36", name: "Telangana" },
  { code: "16", name: "Tripura" },
  { code: "09", name: "Uttar Pradesh" },
  { code: "05", name: "Uttarakhand" },
  { code: "19", name: "West Bengal" }
];


// Mock data is no longer the source of truth for authenticated users.
// Firestore will manage this data on a per-user basis.
// These arrays are kept for type reference and potential fallback/testing.

export const mockCustomers: Customer[] = [];

export const mockProducts: Product[] = [];

export const mockInvoices: Invoice[] = [];
