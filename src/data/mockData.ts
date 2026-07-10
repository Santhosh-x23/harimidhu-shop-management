import { Customer, Product, Order, Invoice, DashboardStats } from "@/types";

// Mock Customers
export const customers: Customer[] = [
  {
    id: "c1",
    name: "Arjun Sharma",
    email: "arjun@example.com",
    phone: "9876543210",
    address: "123 Green Park, Delhi",
    createdAt: "2024-03-15T10:30:00Z",
  },
  {
    id: "c2",
    name: "Priya Patel",
    email: "priya@example.com",
    phone: "8765432109",
    address: "456 Eco Village, Mumbai",
    createdAt: "2024-03-10T14:20:00Z",
  },
  {
    id: "c3",
    name: "Raj Kumar",
    email: "raj@example.com",
    phone: "7654321098",
    address: "789 Nature View, Bangalore",
    createdAt: "2024-02-25T09:15:00Z",
  },
  {
    id: "c4",
    name: "Meena Desai",
    email: "meena@example.com",
    phone: "6543210987",
    address: "234 Organic Lane, Chennai",
    createdAt: "2024-02-20T16:45:00Z",
  },
  {
    id: "c5",
    name: "Vijay Singh",
    email: "vijay@example.com",
    phone: "5432109876",
    address: "567 Fresh Gardens, Hyderabad",
    createdAt: "2024-01-10T11:00:00Z",
  },
];

// Mock Products
export const products: Product[] = [
  {
    id: "p1",
    name: "Organic Apples",
    description: "Fresh organic apples from Himalayan farms",
    price: 180,
    stock_batches: [
      { id: "b1", quantity: 35, cost_price: 120, date_added: "2024-01-05T10:00:00Z" }
    ],
    category: "Fruits",
    image: "/placeholder.svg",
    createdAt: "2024-01-05T10:00:00Z",
  },
  {
    id: "p2",
    name: "Organic Tomatoes",
    description: "Pesticide-free tomatoes grown naturally",
    price: 60,
    stock_batches: [
      { id: "b2", quantity: 5, cost_price: 40, date_added: "2024-01-06T11:00:00Z" }
    ],
    category: "Vegetables",
    image: "/placeholder.svg",
    createdAt: "2024-01-06T11:00:00Z",
  },
  {
    id: "p3",
    name: "Extra Virgin Olive Oil",
    description: "Cold-pressed organic olive oil",
    price: 450,
    stock_batches: [
      { id: "b3", quantity: 15, cost_price: 300, date_added: "2024-01-07T12:00:00Z" }
    ],
    category: "Oils",
    image: "/placeholder.svg",
    createdAt: "2024-01-07T12:00:00Z",
  },
  {
    id: "p4",
    name: "Brown Rice",
    description: "Unpolished organic brown rice",
    price: 120,
    stock_batches: [
      { id: "b4", quantity: 25, cost_price: 80, date_added: "2024-01-08T13:00:00Z" }
    ],
    category: "Grains",
    image: "/placeholder.svg",
    createdAt: "2024-01-08T13:00:00Z",
  },
  {
    id: "p5",
    name: "Fresh Spinach",
    description: "Organically grown leafy spinach",
    price: 40,
    stock_batches: [
      { id: "b5", quantity: 8, cost_price: 25, date_added: "2024-01-09T14:00:00Z" }
    ],
    category: "Vegetables",
    image: "/placeholder.svg",
    createdAt: "2024-01-09T14:00:00Z",
  },
  {
    id: "p6",
    name: "Organic Honey",
    description: "Raw and unfiltered forest honey",
    price: 350,
    stock_batches: [
      { id: "b6", quantity: 12, cost_price: 250, date_added: "2024-01-10T15:00:00Z" }
    ],
    category: "Sweeteners",
    image: "/placeholder.svg",
    createdAt: "2024-01-10T15:00:00Z",
  },
];

// Mock Orders
export const orders: Order[] = [
  {
    id: "o1",
    customerId: "c1",
    customerName: "Arjun Sharma",
    customerPhone: "9876543210",
    deliveryAddress: "123 Green Park, Delhi",
    total: 720,
    status: "delivered",
    items: [
      {
        productId: "p1",
        name: "Organic Apples",
        price: 180,
        quantity: 2,
        productName: "Organic Apples",
        unitPrice: 180,
        total: 360,
      },
      {
        productId: "p3",
        name: "Extra Virgin Olive Oil",
        price: 450,
        quantity: 1,
        productName: "Extra Virgin Olive Oil",
        unitPrice: 450,
        total: 450,
      },
    ],
    createdAt: "2024-03-28T10:00:00Z",
  },
  {
    id: "o2",
    customerId: "c2",
    customerName: "Priya Patel",
    customerPhone: "8765432109",
    deliveryAddress: "456 Eco Village, Mumbai",
    total: 240,
    status: "processing",
    items: [
      {
        productId: "p4",
        name: "Brown Rice",
        price: 120,
        quantity: 2,
      },
    ],
    createdAt: "2024-04-01T12:00:00Z",
  },
  {
    id: "o3",
    customerId: "c3",
    customerName: "Raj Kumar",
    customerPhone: "7654321098",
    deliveryAddress: "789 Nature View, Bangalore",
    total: 500,
    status: "pending",
    items: [
      {
        productId: "p2",
        name: "Organic Tomatoes",
        price: 60,
        quantity: 5,
        productName: "Organic Tomatoes",
        unitPrice: 60,
        total: 300,
      },
      {
        productId: "p5",
        name: "Fresh Spinach",
        price: 40,
        quantity: 5,
        productName: "Fresh Spinach",
        unitPrice: 40,
        total: 200,
      },
    ],
    createdAt: "2024-04-02T09:30:00Z",
  },
];

// Mock Invoices
export const invoices: Invoice[] = [
  {
    id: "i1",
    orderId: "o1",
    customerName: "Arjun Sharma",
    customerPhone: "9876543210",
    deliveryAddress: "123 Green Park, Delhi",
    items: [
      {
        productId: "p1",
        name: "Organic Apples",
        price: 180,
        quantity: 2,
      }
    ],
    total: 720,
    paidStatus: "paid",
    amountPaid: 720,
    dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    createdAt: Date.now(),
    paymentHistory: [
      {
        amount: 720,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Full payment received",
        previousStatus: "unpaid",
        newStatus: "paid"
      }
    ]
  },
  {
    id: "i2",
    orderId: "o2",
    customerName: "Priya Patel",
    customerPhone: "8765432109",
    deliveryAddress: "456 Eco Village, Mumbai",
    items: [
      {
        productId: "p4",
        name: "Brown Rice",
        price: 120,
        quantity: 2,
      }
    ],
    total: 240,
    paidStatus: "unpaid",
    amountPaid: 0,
    dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    createdAt: Date.now(),
    paymentHistory: []
  },
  {
    id: "i3",
    orderId: "o3",
    customerName: "Raj Kumar",
    customerPhone: "7654321098",
    deliveryAddress: "789 Nature View, Bangalore",
    items: [
      {
        productId: "p2",
        name: "Organic Tomatoes",
        price: 60,
        quantity: 5,
      }
    ],
    total: 500,
    paidStatus: "partially_paid",
    amountPaid: 200,
    dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000,
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    paymentHistory: [
      {
        amount: 200,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        note: "Initial payment",
        previousStatus: "unpaid",
        newStatus: "partially_paid"
      }
    ]
  }
];

// Mock Dashboard Stats
export const dashboardStats: DashboardStats = {
  totalSales: 960,
  totalOrders: 3,
  totalCustomers: 5,
  lowStockItems: 2,
};
