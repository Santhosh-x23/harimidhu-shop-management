import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetails from "./components/customers/CustomerDetails";
import EditCustomer from "./components/customers/EditCustomer";
import Products from "./pages/Products";
import Orders from "./pages/Orders";
import OrderDetails from "./components/orders/OrderDetails";
import UpdateOrderStatus from "./components/orders/UpdateOrderStatus";
import AddCustomer from "./components/customers/AddCustomer";
import AddProduct from "./components/products/AddProduct";
import EditProduct from "./components/products/EditProduct";
import AddOrder from "./components/orders/AddOrder";
import EditOrder from "./components/orders/EditOrder";
import Invoices from "./pages/Invoices";
import InvoiceGenerator from "./components/invoices/InvoiceGenerator";
import ViewInvoice from "./components/invoices/ViewInvoice";
import UpdateInvoiceStatus from "./components/invoices/UpdateInvoiceStatus";
import Reports from "./pages/Reports";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import CompanySettings from "./pages/CompanySettings";
import ExpenseManagement from "./components/expenses/ExpenseManagement";
import PriceLists from "./pages/PriceLists";
import PrivateRoute from "./components/PrivateRoute";
import { AuthProvider } from "./context/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes */}
            <Route element={<PrivateRoute />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/new" element={<AddCustomer />} />
              <Route path="/customers/:id" element={<CustomerDetails />} />
              <Route path="/customers/edit/:id" element={<EditCustomer />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/new" element={<AddProduct />} />
              <Route path="/products/edit/:id" element={<EditProduct />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/orders/new" element={<AddOrder />} />
              <Route path="/orders/:id" element={<OrderDetails />} />
              <Route path="/orders/edit/:id" element={<EditOrder />} />
              <Route path="/orders/status/:id" element={<UpdateOrderStatus />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/generate/:orderId" element={<InvoiceGenerator />} />
              <Route path="/invoices/status/:id" element={<UpdateInvoiceStatus />} />
              <Route path="/invoices/:id" element={<ViewInvoice />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings/company" element={<CompanySettings />} />
              <Route path="/expenses" element={<ExpenseManagement />} />
              <Route path="/price-lists" element={<PriceLists />} />
            </Route>
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
