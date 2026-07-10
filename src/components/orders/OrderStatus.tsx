import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TruckIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Order } from "@/types";
import { ordersCollection } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const OrderStatus = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const orderDoc = await getDoc(doc(ordersCollection, id));
      
      if (orderDoc.exists()) {
        const data = orderDoc.data();
        setOrder({
          id: orderDoc.id,
          ...data,
          createdAt: data.createdAt || Date.now()
        } as Order);
      } else {
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

  const updateStatus = async (newStatus: Order["status"]) => {
    if (!id || !order) return;

    try {
      setIsUpdating(true);
      await updateDoc(doc(ordersCollection, id), {
        status: newStatus
      });
      
      setOrder(prev => prev ? { ...prev, status: newStatus } : null);
      toast.success("Order status updated successfully");
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Update Order Status">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout title="Update Order Status">
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

  const statuses: Order["status"][] = [
    "pending",
    "processing",
    "out-for-delivery",
    "delivered"
  ];

  return (
    <DashboardLayout title="Update Order Status">
      <div className="flex flex-col gap-6 max-w-lg mx-auto">
        <div className="flex items-center gap-4">
          <Link to={`/orders/${order.id}`}>
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Order #{order.id}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              className={cn(
                "capitalize text-lg px-3 py-1",
                order.status === "pending" && "bg-yellow-100 text-yellow-800",
                order.status === "processing" && "bg-blue-100 text-blue-800",
                order.status === "out-for-delivery" && "bg-purple-100 text-purple-800",
                order.status === "delivered" && "bg-green-100 text-green-800",
              )}
            >
              {order.status?.replace(/-/g, " ") || "pending"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Order ID:</span> {order.id}</p>
              <p><span className="font-medium">Customer:</span> {order.customerName || "Customer"}</p>
              <p><span className="font-medium">Total:</span> ₹{order.total?.toFixed(2) || "0.00"}</p>
              <p><span className="font-medium">Created:</span> {new Date(order.createdAt).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {statuses.map((status) => (
                <Button
                  key={status}
                  variant={order.status === status ? "default" : "outline"}
                  className={cn(
                    "justify-start gap-2",
                    order.status === status && "bg-organic-primary text-white"
                  )}
                  onClick={() => updateStatus(status)}
                  disabled={isUpdating || order.status === status}
                >
                  <TruckIcon className="h-4 w-4" />
                  {status.replace(/-/g, " ")}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <Link to={`/orders/${order.id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Order Details
            </Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrderStatus; 