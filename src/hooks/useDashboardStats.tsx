import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { db, customersCollection, productsCollection, ordersCollection, invoicesCollection } from '@/firebase';
import { Product, Order, Invoice } from '@/types';
import { subDays, isAfter, parseISO } from 'date-fns';

// Define DashboardStats interface locally if not exported from types
interface DashboardStats {
  totalSales: number; // This will now represent Sales After Expenses
  totalOrders: number;
  totalCustomers: number;
  totalOutstandingAmount: number; // Total outstanding from all invoices
  pendingOrders: number;
  totalCollectionAmount: number; // Total collected from all invoices
  sumOfAllInvoiceTotals: number; // New field for sum of all invoice.total
  totalShippingCurrentMonth: number;
}

// Define a stronger typed version of Order with specific date type
interface ProcessedOrder extends Omit<Order, 'createdAt'> {
  createdAt: Date;
}

export const useDashboardStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0, // Initialize with 0
    totalOrders: 0,
    totalCustomers: 0,
    totalOutstandingAmount: 0,
    pendingOrders: 0,
    totalCollectionAmount: 0,
    sumOfAllInvoiceTotals: 0, // Initialize new field
    totalShippingCurrentMonth: 0,
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [salesData, setSalesData] = useState<{ name: string; sales: number }[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [totalMonthlyExpenses, setTotalMonthlyExpenses] = useState(0); // Keep this state for the expense card

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);

        // Get total customers
        const customersSnapshot = await getDocs(customersCollection);
        const totalCustomers = customersSnapshot.size;

        // Get recent orders
        const ordersQuery = query(ordersCollection, orderBy("createdAt", "desc"), limit(5));
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData = ordersSnapshot.docs.map(doc => {
          const data = doc.data();
          // Normalize createdAt to Date object
          let createdAt: Date;
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt) {
            createdAt = new Date(data.createdAt);
          } else {
            createdAt = new Date();
          }

          return {
            id: doc.id,
            ...data,
            createdAt
          } as unknown as Order;
        });

        setRecentOrders(ordersData);

        // Calculate total sales and orders for last 30 days from Firebase
        const thirtyDaysAgo = subDays(new Date(), 30);

        // Get all orders without timestamp filter first
        const allOrdersQuery = query(ordersCollection, orderBy("createdAt", "desc"));
        const allOrdersSnapshot = await getDocs(allOrdersQuery);

        const allOrdersData = allOrdersSnapshot.docs.map(doc => {
          const data = doc.data();
          // Normalize createdAt to Date object
          let createdAt: Date;
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt) {
            createdAt = new Date(data.createdAt);
          } else {
            createdAt = new Date();
          }

          return {
            id: doc.id,
            ...data,
            createdAt
          } as ProcessedOrder;
        });

        // Get all invoices
        const invoicesQuery = query(invoicesCollection, orderBy("createdAt", "desc"));
        const invoicesSnapshot = await getDocs(invoicesQuery);

        // Get the first and last date of the current month
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        // Filter orders and invoices to only those in the current month
        const ordersThisMonth = allOrdersData.filter(order => {
          const createdAt = order.createdAt ?? null;
          if (!createdAt) return false;
          return createdAt >= firstDayOfMonth && createdAt <= lastDayOfMonth;
        });

        // Get all invoices in the current month
        const invoicesThisMonth = invoicesSnapshot.docs.map(doc => doc.data() as Invoice).filter(invoice => {
          const createdAt = invoice.createdAt ?? null;
          if (!createdAt) return false;
          const invoiceDate = typeof createdAt === 'object' && 'toDate' in createdAt
            ? createdAt.toDate()
            : new Date(createdAt);
          return invoiceDate >= firstDayOfMonth && invoiceDate <= lastDayOfMonth;
        });

        // Calculate stats for the current month only
        let totalSalesCurrentMonth = 0;
        let totalOutstandingAmountCurrentMonth = 0;
        let totalCollectionAmountCurrentMonth = 0;
        let sumOfAllInvoiceTotalsCurrentMonth = 0;
        let totalShippingCurrentMonth = 0;

        invoicesThisMonth.forEach(invoice => {
          const createdAt = invoice.createdAt ?? null;
          if (!createdAt) return;
          const invoiceDate = typeof createdAt === 'object' && 'toDate' in createdAt
            ? createdAt.toDate()
            : new Date(createdAt);
          const subtotalFromItems = invoice.items?.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0) || 0;
          totalSalesCurrentMonth += subtotalFromItems;
          totalOutstandingAmountCurrentMonth += invoice.outstandingAmount || 0;
          if (invoice.paidStatus === 'paid' || invoice.paidStatus === 'partially_paid') {
            totalCollectionAmountCurrentMonth += invoice.amountPaid || 0;
          }
          sumOfAllInvoiceTotalsCurrentMonth += invoice.total || 0;
          totalShippingCurrentMonth += invoice.shippingCost || 0;
        });

        // Calculate total expenses for current month from local storage
        const existingExpenses = JSON.parse(localStorage.getItem("expenses") || "[]");
        const expensesThisMonth = existingExpenses.filter((expense: any) => {
          try {
            const expenseDate = parseISO(expense.date);
            return expenseDate >= firstDayOfMonth && expenseDate <= lastDayOfMonth;
          } catch (error) {
            console.error("Error parsing expense date:", expense.date, error);
            return false;
          }
        });
        const totalExpensesCurrentMonth = expensesThisMonth.reduce((sum: number, expense: any) => sum + expense.amount, 0);
        setTotalMonthlyExpenses(totalExpensesCurrentMonth);

        // Calculate Sales After Expenses for current month
        const salesAfterExpensesCurrentMonth = totalSalesCurrentMonth - totalExpensesCurrentMonth;

        // Count pending orders for current month
        const pendingOrdersCurrentMonth = ordersThisMonth.filter(order => order.status === 'pending').length;

        // Set final stats for current month
        setStats({
          totalSales: salesAfterExpensesCurrentMonth,
          totalOrders: ordersThisMonth.length,
          totalCustomers, // This is still all-time unless you want only new customers this month
          totalOutstandingAmount: totalOutstandingAmountCurrentMonth,
          pendingOrders: pendingOrdersCurrentMonth,
          totalCollectionAmount: totalCollectionAmountCurrentMonth,
          sumOfAllInvoiceTotals: sumOfAllInvoiceTotalsCurrentMonth,
          totalShippingCurrentMonth,
        });

        console.log('Dashboard stats:', {
          totalSales: salesAfterExpensesCurrentMonth, // Log the new value
          totalOrders: ordersThisMonth.length,
          totalOutstandingAmount: totalOutstandingAmountCurrentMonth, // Log total outstanding
          pendingOrders: pendingOrdersCurrentMonth,
          totalCollectionAmount: totalCollectionAmountCurrentMonth, // Log total collection
          sumOfAllInvoiceTotals: sumOfAllInvoiceTotalsCurrentMonth, // Log new field
          salesData: [] // No sales data for current month
        });

        // Build monthly sales map for all months
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlySalesMap = new Map(monthNames.map(month => [month, 0]));

        invoicesSnapshot.docs.forEach(doc => {
          const invoice = doc.data() as Invoice;
          const createdAt = invoice.createdAt ?? null;
          if (!createdAt) return;
          const invoiceDate = typeof createdAt === 'object' && 'toDate' in createdAt
            ? createdAt.toDate()
            : new Date(createdAt);
          const subtotalFromItems = invoice.items?.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0) || 0;
          const monthName = monthNames[invoiceDate.getMonth()];
          monthlySalesMap.set(monthName, (monthlySalesMap.get(monthName) || 0) + subtotalFromItems);
        });

        // Set salesData for the chart (all months)
        setSalesData(
          monthNames.map(month => ({
            name: month,
            sales: monthlySalesMap.get(month) || 0
          }))
        );
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return { stats, isLoading, salesData, recentOrders, totalMonthlyExpenses };
};
