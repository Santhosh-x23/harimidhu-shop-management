import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, FileText, Eye, TruckIcon, PencilIcon, CheckIcon, AlertCircle, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Order } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ordersCollection, invoicesCollection } from "@/firebase";
import { getDocs, query, where, orderBy, addDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const Orders = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [orderInvoiceMap, setOrderInvoiceMap] = useState<Record<string, string>>({});

  const statuses = ["all", "pending", "processing", "out-for-delivery", "delivered"];

  useEffect(() => {
    fetchOrders();
    fetchInvoiceStatus();
  }, []);

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const ordersQuery = query(ordersCollection, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(ordersQuery);
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      setFilteredOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to fetch orders");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvoiceStatus = async () => {
    try {
      const invoicesQuery = query(invoicesCollection);
      const querySnapshot = await getDocs(invoicesQuery);
      
      const invoiceMap: Record<string, string> = {};
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.orderId) {
          invoiceMap[data.orderId] = doc.id;
        }
      });
      
      setOrderInvoiceMap(invoiceMap);
    } catch (error) {
      console.error("Error fetching invoice statuses:", error);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    filterOrders(query, statusFilter);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    filterOrders(searchQuery, value);
  };

  const filterOrders = (query: string, status: string) => {
    let filtered = [...orders];
    
    if (query.trim() !== "") {
      filtered = filtered.filter(
        order =>
          order.id.toLowerCase().includes(query) ||
          (order.customerName && order.customerName.toLowerCase().includes(query))
      );
    }
    
    if (status !== "all") {
      filtered = filtered.filter(order => order.status === status);
    }
    
    setFilteredOrders(filtered);
  };

  const handleViewDetails = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const handleEditOrder = (orderId: string) => {
    navigate(`/orders/edit/${orderId}`);
  };

  const handleUpdateStatus = (orderId: string) => {
    navigate(`/orders/status/${orderId}`);
  };

  const handleGenerateInvoice = async (order: Order) => {
    try {
      // Check if invoice already exists for this order
      const invoicesQuery = query(invoicesCollection, where("orderId", "==", order.id));
      const querySnapshot = await getDocs(invoicesQuery);
      
      if (!querySnapshot.empty) {
        // Invoice already exists, navigate to it
        const invoiceId = querySnapshot.docs[0].id;
        toast.info("Invoice already exists");
        navigate(`/invoices/${invoiceId}`);
        return;
      }
      
      // Navigate to invoice generation page with order ID
      navigate(`/invoices/generate/${order.id}`);
    } catch (error) {
      console.error("Error checking for existing invoice:", error);
      toast.error("Failed to generate invoice");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
        setFilteredOrders(prevFiltered => prevFiltered.filter(order => order.id !== orderId));
        toast.success('Order deleted successfully');
      } catch (error) {
        console.error('Error deleting order:', error);
        toast.error('Failed to delete order');
      }
    }
  };

  const viewInvoice = (invoiceId: string) => {
    navigate(`/invoices/${invoiceId}`);
  };

  // Format number to display with 2 decimal places
  const formatNumber = (num: number) => {
    return num.toFixed(2);
  };

  const hasCustomPricing = (order: Order) => {
    return order.items.some(item => item.customPrice !== null && item.customPrice !== undefined);
  };

  const hasShippingCost = (order: Order) => {
    return order.shippingCost !== undefined && order.shippingCost > 0;
  };

  const hasOutstandingAmount = (order: Order) => {
    return order.outstandingAmount && order.outstandingAmount > 0 && order.includeOutstanding !== false;
  };

  const hasInvoice = (orderId: string) => {
    return !!orderInvoiceMap[orderId];
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Orders">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Orders">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                className="pl-9"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
            
            <Select
              value={statusFilter}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status === "all" ? "All Statuses" : status.replace(/-/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <Link to="/orders/new">
            <Button className="w-full sm:w-auto gap-1 bg-organic-primary hover:bg-organic-dark">
              <Plus className="h-4 w-4" />
              Create New Order
            </Button>
          </Link>
        </div>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>All Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        {order.id}
                        <div className="flex gap-1 mt-1">
                          {hasCustomPricing(order) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-sm">
                                    Custom
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Custom pricing applied</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {hasShippingCost(order) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded-sm">
                                    Shipping
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Includes shipping cost</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          {hasOutstandingAmount(order) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-xs rounded-sm flex items-center">
                                    <AlertTriangle className="h-3 w-3 mr-0.5" />
                                    {order.includeOutstanding !== false 
                                      ? 'Outstanding' 
                                      : <span className="flex items-center">Outstanding <span className="text-[10px] ml-0.5">(not incl.)</span></span>}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {order.includeOutstanding !== false 
                                      ? `Includes outstanding amount of ₹${order.outstandingAmount?.toFixed(2)}` 
                                      : `Outstanding amount of ₹${order.outstandingAmount?.toFixed(2)} (not included in total)`}
                                    {order.outstandingNote && <span className="block mt-1 text-xs italic">{order.outstandingNote}</span>}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{order.customerName || "Customer"}</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit'
                      })}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>₹{formatNumber(order.total)}</span>
                          {hasOutstandingAmount(order) && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={`flex items-center mt-1 text-xs ${order.includeOutstanding !== false ? 'text-amber-700' : 'text-gray-600'}`}>
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    <span>
                                      {order.includeOutstanding !== false 
                                        ? `Includes ₹${order.outstandingAmount.toFixed(2)} outstanding` 
                                        : `₹${order.outstandingAmount.toFixed(2)} outstanding (not included)`}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{order.includeOutstanding !== false 
                                    ? `This order includes an outstanding amount of ₹${order.outstandingAmount.toFixed(2)}` 
                                    : `Outstanding amount of ₹${order.outstandingAmount.toFixed(2)} is tracked but not included in this total`}
                                  </p>
                                  {order.outstandingNote && (
                                    <p className="mt-1 text-xs border-t pt-1">{order.outstandingNote}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded-full capitalize",
                          order.status === "pending" && "bg-yellow-100 text-yellow-800",
                          order.status === "processing" && "bg-blue-100 text-blue-800",
                          order.status === "out-for-delivery" && "bg-purple-100 text-purple-800",
                          order.status === "delivered" && "bg-green-100 text-green-800",
                        )}>
                          {order.status?.replace(/-/g, " ") || "pending"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {hasInvoice(order.id) ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge 
                                  variant="outline" 
                                  className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200 cursor-pointer"
                                  onClick={() => viewInvoice(orderInvoiceMap[order.id])}
                                >
                                  <CheckIcon className="h-3 w-3 mr-1" />
                                  Generated
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Click to view invoice</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge 
                                  variant="outline" 
                                  className="bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200 cursor-pointer"
                                  onClick={() => handleGenerateInvoice(order)}
                                >
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Click to generate invoice</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => handleViewDetails(order.id)}
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => handleEditOrder(order.id)}
                            >
                              <PencilIcon className="h-4 w-4" />
                              Edit Order
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => handleUpdateStatus(order.id)}
                            >
                              <TruckIcon className="h-4 w-4" />
                              Update Status
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer"
                              onClick={() => hasInvoice(order.id) 
                                ? viewInvoice(orderInvoiceMap[order.id]) 
                                : handleGenerateInvoice(order)
                              }
                            >
                              <FileText className="h-4 w-4" />
                              {hasInvoice(order.id) ? "View Invoice" : "Generate Invoice"}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="flex items-center gap-2 cursor-pointer text-destructive"
                              onClick={() => handleDeleteOrder(order.id)}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="h-4 w-4"
                              >
                                <path d="M3 6h18"></path>
                                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                              </svg>
                              Delete Order
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No orders found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Orders;
