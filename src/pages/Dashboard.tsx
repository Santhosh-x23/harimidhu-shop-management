import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Users,
  ShoppingBag,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Plus,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { useEffect, useState } from 'react';
import { subDays, isAfter, parseISO } from 'date-fns';

const Dashboard = () => {
  const { stats, isLoading, salesData, recentOrders } = useDashboardStats();
  const [totalMonthlyExpenses, setTotalMonthlyExpenses] = useState(0);

  useEffect(() => {
    const calculateMonthlyExpenses = () => {
      const existingExpenses = JSON.parse(localStorage.getItem("expenses") || "[]");
      const thirtyDaysAgo = subDays(new Date(), 30);

      const recentExpenses = existingExpenses.filter((expense: any) => {
        try {
          const expenseDate = parseISO(expense.date);
          return isAfter(expenseDate, thirtyDaysAgo);
        } catch (error) {
          console.error("Error parsing expense date:", expense.date, error);
          return false;
        }
      });

      const total = recentExpenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);
      setTotalMonthlyExpenses(total);
    };

    calculateMonthlyExpenses();

  }, []);

  // If dashboard is loading, show loading indicator
  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center h-[80vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      <div className="grid gap-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Sales"
            value={`₹${stats.totalSales}`}
            icon={<TrendingUp className="h-6 w-6" />}
            description="Last 30 days (after expenses)"
            className="bg-blue-50 border-blue-100"
          />
          <StatsCard
            title="Total Orders"
            value={stats.totalOrders.toString()}
            icon={<ClipboardList className="h-6 w-6" />}
            description="Total orders"
            className="bg-green-50 border-green-100"
          />
          <StatsCard
            title="Outstanding Amount"
            value={`₹${stats.totalOutstandingAmount}`}
            icon={<AlertTriangle className="h-6 w-6" />}
            description="Total outstanding from all invoices"
            className="bg-orange-50 border-orange-100"
          />
          <StatsCard
            title="Pending Orders"
            value={stats.pendingOrders.toString()}
            icon={<ClipboardList className="h-6 w-6" />}
            description="Orders pending processing"
            className="bg-purple-50 border-purple-100"
          />
          <StatsCard
            title="Total Collection Amount"
            value={`₹${stats.totalCollectionAmount.toFixed(2)}`}
            icon={<TrendingUp className="h-6 w-6" />}
            description="Total amount collected from all invoices"
            className="bg-teal-50 border-teal-100"
          />
          <StatsCard
            title="Amount to be Paid"
            value={`₹${(stats.sumOfAllInvoiceTotals - stats.totalCollectionAmount).toFixed(2)}`}
            icon={<FileText className="h-6 w-6" />}
            description="Total of all generated invoices minus Total Collection Amount"
            className="bg-yellow-50 border-yellow-100"
          />
          <StatsCard
            title="Total Expenses"
            value={`₹${totalMonthlyExpenses.toFixed(2)}`}
            icon={<ClipboardList className="h-6 w-6" />}
            description="Last 30 days"
            className="bg-red-50 border-red-100"
          />
          <StatsCard
            title="Shipping Cost"
            value={`₹${stats.totalShippingCurrentMonth?.toFixed(2)}`}
            icon={<ShoppingBag className="h-6 w-6" />}
            description="Total shipping for current month"
            className="bg-indigo-50 border-indigo-100"
          />
        </div>

        {/* Sales Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">Monthly Sales</CardTitle>
            <Button variant="outline" size="sm">
              View Report
            </Button>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [`₹${value}`, "Sales"]}
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "0.375rem",
                    }}
                  />
                  <Bar 
                    dataKey="sales" 
                    fill="#4A7C59" 
                    radius={[4, 4, 0, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Lower Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">Recent Orders</CardTitle>
              <Link to="/orders">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.length > 0 ? (
                  recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium">{order.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()} · ₹{order.total}
                        </p>
                      </div>
                      <div>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full capitalize",
                          order.status === "pending" && "bg-yellow-100 text-yellow-800",
                          order.status === "processing" && "bg-blue-100 text-blue-800",
                          order.status === "out-for-delivery" && "bg-purple-100 text-purple-800",
                          order.status === "delivered" && "bg-green-100 text-green-800",
                        )}>
                          {order.status.replace(/-/g, " ")}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4">No recent orders</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <QuickActionCard 
            title="Add New Customer" 
            icon={<Users className="h-5 w-5" />} 
            linkTo="/customers/new"
          />
          <QuickActionCard 
            title="Add New Product" 
            icon={<ShoppingBag className="h-5 w-5" />} 
            linkTo="/products/new"
          />
          <QuickActionCard 
            title="Create New Order" 
            icon={<ClipboardList className="h-5 w-5" />} 
            linkTo="/orders/new"
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  description: string;
  className?: string;
}

const StatsCard = ({ title, value, icon, description, className }: StatsCardProps) => {
  return (
    <Card className={cn(className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
          </div>
          <div className="rounded-full p-2 bg-white/60">
            {icon}
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">{description}</p>
      </CardContent>
    </Card>
  );
};

interface QuickActionCardProps {
  title: string;
  icon: React.ReactNode;
  linkTo: string;
}

const QuickActionCard = ({ title, icon, linkTo }: QuickActionCardProps) => {
  return (
    <Link to={linkTo}>
      <Card className="hover:border-organic-primary transition-colors">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-full p-2 bg-organic-primary/10 text-organic-primary">
            {icon}
          </div>
          <div className="flex-1">
            <h3 className="font-medium">{title}</h3>
          </div>
          <Plus className="h-4 w-4 text-organic-primary" />
        </CardContent>
      </Card>
    </Link>
  );
};

export default Dashboard;
