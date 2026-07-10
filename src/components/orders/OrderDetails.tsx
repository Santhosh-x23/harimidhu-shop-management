import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Printer, FileText, TruckIcon, PencilIcon, AlertTriangle } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Order } from "@/types";
import { ordersCollection } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Label } from "@/components/ui/label";

// Extended Order interface to include additional properties used in this component
interface ExtendedOrder extends Order {
  customerPhone?: string;
  deliveryAddress?: string;
  latitude?: number;
  longitude?: number;
  outstandingAmount?: number;
  includeOutstanding?: boolean;
  outstandingNote?: string;
}

const OrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<ExtendedOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    } else {
      setIsLoading(false);
      toast.error("Order ID not found");
      navigate("/orders");
    }
  }, [id]);

  const fetchOrderDetails = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      console.log("Fetching order with ID:", id); // Debug log
      
      const orderDoc = await getDoc(doc(ordersCollection, id));
      console.log("Order document:", orderDoc.exists() ? orderDoc.data() : "Not found"); // Debug log
      
      if (orderDoc.exists()) {
        const data = orderDoc.data();
        const orderData = {
          id: orderDoc.id,
          ...data,
          customerId: data.customerId || "",
          createdAt: data.createdAt || Date.now(),
          status: data.status || "pending",
          items: data.items || [],
          total: data.total || 0,
          customerName: data.customerName || "Customer",
          customerPhone: data.customerPhone || "Not specified",
          deliveryAddress: data.deliveryAddress || "Not specified",
          outstandingAmount: data.outstandingAmount,
          includeOutstanding: data.includeOutstanding !== false // default to true if not set
        } as ExtendedOrder;
        
        console.log("Processed order data:", orderData); // Debug log
        setOrder(orderData);
      } else {
        console.error("Order not found with ID:", id); // Debug log
        toast.error("Order not found");
        navigate("/orders");
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to fetch order details");
      navigate("/orders");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Order Details">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout title="Order Details">
        <div className="text-center py-10">
          <p className="text-muted-foreground">Order not found</p>
          <Link to="/orders" className="mt-4 inline-block">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const handlePrint = () => {
    toast.info("Preparing order for printing...");
    setTimeout(() => {
      toast.success("Order ready for printing!");
      window.print();
    }, 1000);
  };

  const handleGenerateInvoice = () => {
    toast.success("Invoice generated successfully!");
    navigate(`/invoices?orderId=${order.id}`);
  };

  const formattedDate = new Date(order.createdAt).toLocaleDateString();

  // Calculate subtotal from items, excluding shipping cost and outstanding amount
  const calculateSubtotal = () => {
    return order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const hasOutstandingAmount = order.outstandingAmount && order.outstandingAmount > 0;
  const hasShippingCost = order.shippingCost && order.shippingCost > 0;

  return (
    <DashboardLayout title="Order Details">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link to="/orders">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Order #{order.id}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge
                  className={cn(
                    "capitalize",
                    order.status === "pending" && "bg-yellow-100 text-yellow-800",
                    order.status === "processing" && "bg-blue-100 text-blue-800",
                    order.status === "out-for-delivery" && "bg-purple-100 text-purple-800",
                    order.status === "delivered" && "bg-green-100 text-green-800",
                  )}
                >
                  {order.status?.replace(/-/g, " ") || "pending"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span>{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Customer</span>
                <span>{order.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{calculateSubtotal().toFixed(2)}</span>
              </div>
              {/* Display shipping cost row only if it exists and is greater than 0 */}
           
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping Cost</span>
                  <span>₹{order.shippingCost.toFixed(2)}</span>
                </div>
         
              {/* Display outstanding amount row only if it exists and is greater than 0 */}
              {hasOutstandingAmount && (
                <div className="flex justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Outstanding Amount</span>
                    {order.includeOutstanding && (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    )}
                  </div>
                  <span className={order.includeOutstanding ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                    ₹{order.outstandingAmount.toFixed(2)}
                    {!order.includeOutstanding && <span className="text-xs ml-1">(not included)</span>}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-medium">₹{order.total.toFixed(2)}</span>
              </div>
              
              {hasOutstandingAmount && order.outstandingNote && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-xs text-amber-800">
                    <span className="font-medium">Note:</span> {order.outstandingNote}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Delivery Address</Label>
                  <p className="text-sm text-muted-foreground">{order.deliveryAddress}</p>
                </div>
                <div className="space-y-2">
                  <Label>Customer Phone</Label>
                  <p className="text-sm text-muted-foreground">{order.customerPhone}</p>
                </div>
                {order.latitude && order.longitude && (
                  <div className="space-y-2">
                    <Label>Coordinates</Label>
                    <p className="text-sm text-muted-foreground">
                      {order.latitude}, {order.longitude}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items && order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <div key={index}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantity: {item.quantity} x 
                          {item.customPrice ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="line-through text-xs">₹{item.originalPrice?.toFixed(2)}</span>
                              <span className="text-organic-primary font-medium">₹{item.price.toFixed(2)}</span>
                              <span className="ml-1 text-xs px-1 py-0.25 bg-blue-100 text-blue-800 rounded-sm">
                                Custom
                              </span>
                            </span>
                          ) : (
                            <span> ₹{item.price.toFixed(2)}</span>
                          )}
                        </p>
                      </div>
                      <p className="font-medium">₹{(item.quantity * item.price).toFixed(2)}</p>
                    </div>
                    {index < order.items.length - 1 && <Separator className="my-4" />}
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No items in this order</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link to={`/orders/edit/${order.id}`}>
            <Button className="gap-2 bg-amber-500 hover:bg-amber-600 text-white">
              <PencilIcon className="h-4 w-4" />
              Edit Order
            </Button>
          </Link>
          <Link to={`/orders/status/${order.id}`}>
            <Button className="gap-2">
              <TruckIcon className="h-4 w-4" />
              Update Status
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center">
          <Link to="/orders">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Print Order
            </Button>
            <Button 
              size="sm" 
              className="gap-2 bg-organic-primary hover:bg-organic-dark"
              onClick={handleGenerateInvoice}
            >
              <FileText className="h-4 w-4" />
              Generate Invoice
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrderDetails;
