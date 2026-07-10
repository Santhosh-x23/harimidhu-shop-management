import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Invoice } from "@/types";
import { invoicesCollection } from "@/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { formatInvoiceNumber } from "./InvoiceGenerator";

const InvoiceStatus = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid">("unpaid");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (id) {
      fetchInvoiceDetails();
    } else {
      setIsLoading(false);
      toast.error("Invoice ID not provided");
      navigate("/invoices");
    }
  }, [id]);

  const fetchInvoiceDetails = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      const invoiceDoc = await getDoc(doc(invoicesCollection, id));
      
      if (invoiceDoc.exists()) {
        const data = invoiceDoc.data();
        const invoiceData = {
          id: invoiceDoc.id,
          ...data
        } as Invoice;
        
        setInvoice(invoiceData);
        setPaymentStatus(invoiceData.paidStatus || "unpaid");
        if (invoiceData.paymentMethod) setPaymentMethod(invoiceData.paymentMethod);
        if (invoiceData.notes) setNotes(invoiceData.notes);
      } else {
        toast.error("Invoice not found");
        navigate("/invoices");
      }
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toast.error("Failed to fetch invoice details");
      navigate("/invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!invoice || !id) return;
    
    try {
      setIsSubmitting(true);
      
      const updateData: Record<string, any> = {
        paidStatus: paymentStatus,
        updatedAt: Date.now()
      };
      
      if (paymentStatus === "paid") {
        updateData.paymentMethod = paymentMethod;
        updateData.paymentDate = new Date(paymentDate).getTime();
        updateData.paymentReference = paymentReference;
      }
      
      if (notes) {
        updateData.notes = notes;
      }
      
      await updateDoc(doc(invoicesCollection, id), updateData);
      
      toast.success("Invoice status updated successfully!");
      
      // Navigate back to the invoice details page
      navigate(`/invoices/${id}`);
    } catch (error) {
      console.error("Error updating invoice status:", error);
      toast.error("Failed to update invoice status");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Update Invoice Status">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout title="Update Invoice Status">
        <div className="text-center py-10">
          <p className="text-muted-foreground">Invoice not found</p>
          <Link to="/invoices" className="mt-4 inline-block">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Invoices
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const createdDate = new Date(invoice.createdAt).toLocaleDateString();

  return (
    <DashboardLayout title="Update Invoice Status">
      <div className="flex flex-col gap-6 max-w-xl mx-auto">
        <div className="flex justify-between items-center">
          <Link to={`/invoices/${invoice.id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Invoice
            </Button>
          </Link>
          <h2 className="text-xl font-bold">Update Invoice Status</h2>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Invoice ID</p>
                <p className="font-medium">{formatInvoiceNumber(invoice.id, invoice.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Invoice Date</p>
                <p className="font-medium">{createdDate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order ID</p>
                <p className="font-medium">{invoice.orderId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium">₹{invoice.total.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customer</p>
                <p className="font-medium">{invoice.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Status</p>
                <Badge className={cn(
                  "mt-1",
                  invoice.paidStatus === "paid" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                )}>
                  {invoice.paidStatus === "paid" ? "Paid" : "Unpaid"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Update Payment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status">Payment Status</Label>
                <Select
                  value={paymentStatus}
                  onValueChange={(value: "paid" | "unpaid") => setPaymentStatus(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentStatus === "paid" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="method">Payment Method</Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={setPaymentMethod}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="credit-card">Credit Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reference">Payment Reference (Optional)</Label>
                    <Input
                      id="reference"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Transaction ID, Receipt Number, etc."
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional notes"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full gap-2 bg-organic-primary hover:bg-organic-dark mt-4"
                disabled={isSubmitting}
              >
                <Save className="h-4 w-4" />
                {isSubmitting ? "Updating..." : "Update Invoice"}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default InvoiceStatus; 