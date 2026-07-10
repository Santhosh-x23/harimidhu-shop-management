import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Customer } from "@/types";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/firebase";

const CustomerDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const customerDoc = await getDoc(doc(db, "customers", id));
        
        if (customerDoc.exists()) {
          const data = customerDoc.data();
          setCustomer({
            id: customerDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString()
          } as Customer);
        } else {
          toast.error("Customer not found");
        }
      } catch (error) {
        console.error("Error fetching customer:", error);
        toast.error("Failed to load customer details");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id]);

  const handleDelete = async () => {
    if (!customer) return;
    
    if (window.confirm(`Are you sure you want to delete ${customer.name}?`)) {
      try {
        await deleteDoc(doc(db, "customers", customer.id));
        toast.success("Customer deleted successfully");
        navigate("/customers");
      } catch (error) {
        console.error("Error deleting customer:", error);
        toast.error("Failed to delete customer");
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Customer Details">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!customer) {
    return (
      <DashboardLayout title="Customer Not Found">
        <Alert>
          <AlertTitle>Customer not found</AlertTitle>
          <AlertDescription>
            The customer you are looking for does not exist or has been removed.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Link to="/customers">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Customers
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`Customer: ${customer.name}`}>
      <div className="flex flex-col gap-6">
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Link to="/customers">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Customers
            </Button>
          </Link>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2 text-destructive border-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              Delete Customer
            </Button>
            <Button 
              size="sm" 
              className="gap-2 bg-organic-primary hover:bg-organic-dark"
              onClick={() => navigate(`/customers/edit/${customer.id}`)}
            >
              <Edit className="h-4 w-4" />
              Edit Customer
            </Button>
          </div>
        </div>

        {/* Customer Info */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{customer.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{customer.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p>{customer.phone}</p>
                </div>
                {customer.gstin && (
                <div>
                  <p className="text-sm text-muted-foreground">GSTIN</p>
                  <p>{customer.gstin}</p>
                </div>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="whitespace-pre-line">{customer.address || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer ID</p>
                  <p className="font-mono text-xs">{customer.id}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Added On</p>
                  <p>{new Date(customer.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* We could add customer orders or additional information here */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-6">
              Order history will be implemented in a future update.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CustomerDetails; 