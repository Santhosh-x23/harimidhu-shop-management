import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Order } from "@/types";
import { ordersCollection } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

const UpdateOrderStatus = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const statuses = ["pending", "processing", "out-for-delivery", "delivered"];

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const orderDoc = await getDoc(doc(ordersCollection, id));
      
      if (orderDoc.exists()) {
        const data = orderDoc.data();
        const orderData = {
          id: orderDoc.id,
          ...data,
          createdAt: data.createdAt || Date.now()
        } as Order;
        
        setOrder(orderData);
        setStatus(orderData.status || "pending");
      } else {
        toast.error("Order not found");
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error("Failed to fetch order details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
      <DashboardLayout title="Order Not Found">
        <Alert>
          <AlertTitle>Order not found</AlertTitle>
          <AlertDescription>
            The order you are looking for does not exist or has been removed.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link to="/orders">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;
    
    try {
      setIsSubmitting(true);
      
      // Update order status in Firebase
      await updateDoc(doc(ordersCollection, id), {
        status: status
      });
      
      toast.success(`Order status updated to ${status.replace(/-/g, " ")}`);
      
      // Navigate back to the order details page
      navigate(`/orders/${id}`);
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error("Failed to update order status");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title={`Update Order #${order.id} Status`}>
      <div className="flex flex-col gap-6 max-w-md mx-auto">
        <div className="flex justify-start">
          <Link to={`/orders/${order.id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Order Details
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Update Order Status</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Current Status:</p>
                <div className={cn(
                  "text-sm px-2 py-1 rounded-full inline-block capitalize",
                  order.status === "pending" && "bg-yellow-100 text-yellow-800",
                  order.status === "processing" && "bg-blue-100 text-blue-800",
                  order.status === "out-for-delivery" && "bg-purple-100 text-purple-800",
                  order.status === "delivered" && "bg-green-100 text-green-800",
                )}>
                  {order.status?.replace(/-/g, " ") || "pending"}
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Select New Status:</p>
                <Select
                  value={status}
                  onValueChange={setStatus}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s.replace(/-/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">Order Summary:</p>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Order ID:</span> {order.id}</p>
                  <p><span className="font-medium">Customer:</span> {order.customerName || "Customer"}</p>
                  <p><span className="font-medium">Total:</span> ₹{order.total?.toFixed(2) || "0.00"}</p>
                  <p><span className="font-medium">Created:</span> {new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-organic-primary hover:bg-organic-dark"
                disabled={status === order.status || isSubmitting}
              >
                <Save className="mr-2 h-4 w-4" />
                {isSubmitting ? "Updating..." : "Update Status"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UpdateOrderStatus;
