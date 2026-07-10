// Customer type
export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  gstin?: string;
}

// Product types
export interface StockBatch {
  id: string;
  quantity: number; // Can be a decimal/float value
  cost_price: number;
  date_added: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock_batches: StockBatch[];
  category: string;
  image: string;
  createdAt: string;
  stock?: number; // Legacy field
}

// Order types
export interface OrderItem {
  productId: string;
  name: string;
  quantity: number; // Can be a decimal/float value
  price: number;
  originalPrice?: number;  // Store the original product price
  customPrice?: number | null;  // Store custom price if modified for this order
  costPrice?: number | null;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  shippingCost?: number;
  status: "pending" | "processing" | "out-for-delivery" | "delivered";
  createdAt: string;
  customerGstin?: string;
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  total: number;
  shippingCost?: number;
  paidStatus: "paid" | "unpaid" | "partially_paid";
  paymentMethod?: string;
  paymentDate?: number;
  paymentReference?: string;
  dueDate: number;
  notes?: string;
  createdAt: number;
  updatedAt?: number;
  amountPaid?: number;
  paymentHistory?: PaymentRecord[];
  outstandingAmount?: number;
  includeOutstanding?: boolean;
  outstandingNote?: string;
  customerGstin?: string;
}

export interface PaymentRecord {
  amount: number;
  date: string;
  note: string;
  previousStatus: string;
  newStatus: string;
} 
