export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  gstin?: string;
}

export interface StockBatch {
  id: string;
  quantity: number;
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
  stock?: number; // For backward compatibility
}

export interface OrderItem {
  id?: string;
  name?: string;
  productName?: string;
  price?: number;
  unitPrice?: number;
  quantity: number;
  productId?: string;
  total?: number;
  costPrice?: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'processing' | 'out-for-delivery' | 'delivered';
  createdAt: string;
  updatedAt: string;
  deliveryAddress: string;
  customerPhone: string;
  latitude: number;
  longitude: number;
  shippingCost?: number;
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

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  total: number;
  paidStatus: "paid" | "unpaid" | "partially_paid";
  paymentMethod?: string;
  paymentDate?: number;
  paymentReference?: string;
  dueDate: number;
  notes?: string;
  createdAt: number;
  updatedAt?: number;
  shippingCost?: number;
  amountPaid?: number;
  paymentHistory?: PaymentRecord[];
  outstandingAmount?: number;
  includeOutstanding?: boolean;
  outstandingNote?: string;
  customerGstin?: string;
}

export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  lowStockItems: number;
}
