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
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Save, FileText, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Order, Invoice } from "@/types";
import { Invoice as IndexInvoice } from "@/types/index";
import { ordersCollection, invoicesCollection, invoiceCounterCollection, db } from "@/firebase";
import { doc, getDoc, addDoc, runTransaction } from "firebase/firestore";
import { generateInvoicePdf } from "@/utils/pdfUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Helper function to format invoice ID in the format 0001/2025-26
export const formatInvoiceNumber = (invoiceNumber: string, createdAt: number | string | Date) => {
  // Get financial year in format YYYY-YY
  const date = new Date(createdAt)
  const currentYear = date.getFullYear()
  const nextYear = currentYear + 1
  
  // Format as financial year YYYY-YY
  const financialYear = `${currentYear}-${nextYear.toString().slice(-2)}`
  
  return `${invoiceNumber}/${financialYear}`
}

// Extended Order type to include properties needed for Invoice
interface ExtendedOrder extends Order {
  customerPhone?: string;
  deliveryAddress?: string;
  outstandingAmount?: number;
  outstandingNote?: string;
  customerGstin?: string;
}

const InvoiceGenerator = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<ExtendedOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid" | "partially_paid">("unpaid");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [amountPaid, setAmountPaid] = useState(0);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 14); // 14 days from now
    return date.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState("");
  const [includeOutstanding, setIncludeOutstanding] = useState(true);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    } else {
      setIsLoading(false);
      toast.error("Order ID not provided");
      navigate("/orders");
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    if (!orderId) return;

    try {
      setIsLoading(true);
      const orderDoc = await getDoc(doc(ordersCollection, orderId));
      
      if (orderDoc.exists()) {
        const data = orderDoc.data();
        setOrder({
          id: orderDoc.id,
          customerId: data.customerId,
          customerName: data.customerName,
          items: data.items,
          total: data.total,
          status: data.status,
          createdAt: data.createdAt || Date.now(),
          // Add optional properties that may be in data
          customerPhone: data.customerPhone || "",
          deliveryAddress: data.deliveryAddress || "",
          shippingCost: data.shippingCost,
          outstandingAmount: data.outstandingAmount,
          outstandingNote: data.outstandingNote,
          customerGstin: data.customerGstin || ""
        } as ExtendedOrder);
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

  useEffect(() => {
    // When payment status changes, update amount paid
    if (paymentStatus === "paid" && order) {
      const totalWithOutstanding = includeOutstanding && order.outstandingAmount 
        ? order.total + order.outstandingAmount 
        : order.total;
      setAmountPaid(totalWithOutstanding);
    } else if (paymentStatus === "unpaid") {
      setAmountPaid(0);
    }
  }, [paymentStatus, order, includeOutstanding]);

  const handlePaymentStatusChange = (value: "paid" | "unpaid" | "partially_paid") => {
    setPaymentStatus(value);
  };

  const getTotalWithOutstanding = () => {
    if (!order) return 0;
    
    // Calculate base order total (subtotal + shipping)
    const baseTotal = calculateSubtotal() + (order.shippingCost || 0);
    
    return includeOutstanding && order.outstandingAmount 
      ? baseTotal + order.outstandingAmount 
      : baseTotal;
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!order) {
      toast.error("Order information is required");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const orderTotal = calculateSubtotal() + (order.shippingCost || 0);
      const totalWithOutstanding = includeOutstanding && order.outstandingAmount 
        ? orderTotal + order.outstandingAmount 
        : orderTotal;

      // Validate amount paid for partially paid status
      if (paymentStatus === "partially_paid") {
        if (amountPaid <= 0) {
          toast.error("Please enter the amount paid");
          setIsSubmitting(false);
          return;
        }
        
        const totalAmount = Number(totalWithOutstanding);
        if (amountPaid >= totalAmount) {
          toast.error("For partially paid invoices, amount must be less than total");
          setIsSubmitting(false);
          return;
        }
      }

      // Get the next invoice number using a transaction
      const counterRef = doc(invoiceCounterCollection, 'current');
      const invoiceNumber = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextNumber = 1;
        
        if (counterDoc.exists()) {
          nextNumber = counterDoc.data().number + 1;
        }
        
        transaction.set(counterRef, { number: nextNumber });
        return nextNumber.toString().padStart(4, '0');
      });
      
      // Create invoice data
      const invoiceData: Record<string, unknown> = {
        orderId: order.id,
        invoiceNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone || "",
        deliveryAddress: order.deliveryAddress || "",
        customerGstin: order.customerGstin || "",
        items: order.items,
        total: totalWithOutstanding,
        shippingCost: order.shippingCost,
        paidStatus: paymentStatus,
        paymentMethod: paymentMethod || "",
        paymentDate: paymentStatus !== 'unpaid' && paymentDate ? new Date(paymentDate).getTime() : null,
        paymentReference: paymentReference || "",
        dueDate: new Date(dueDate).getTime(),
        notes: notes || "",
        createdAt: Date.now()
      };
      
      // Add outstandingAmount and outstandingNote if included
      if (includeOutstanding && order.outstandingAmount) {
        invoiceData.outstandingAmount = order.outstandingAmount;
        invoiceData.outstandingNote = order.outstandingNote || "Previous outstanding balance";
      }

      // Set amountPaid based on status
      let amountPaidValue: number;
      if (paymentStatus === "paid") {
        amountPaidValue = totalWithOutstanding;
      } else if (paymentStatus === "partially_paid") {
        amountPaidValue = amountPaid;
      } else {
        amountPaidValue = 0;
      }
      invoiceData.amountPaid = amountPaidValue;

      // Create payment history record if payment was made
      if (paymentStatus !== "unpaid" && amountPaidValue > 0) {
        invoiceData.paymentHistory = [{
          amount: amountPaidValue,
          date: new Date().toISOString(),
          note: `Initial payment: ${paymentMethod}`,
          previousStatus: "unpaid",
          newStatus: paymentStatus
        }];
      }
      
      // Add invoice to Firestore
      const docRef = await addDoc(invoicesCollection, invoiceData);
      
      // Make a complete invoice object with the ID
      const newInvoice = {
        id: docRef.id,
        ...invoiceData
      } as Invoice;
      
      // Store for download function
      setInvoice(newInvoice);
      
      toast.success("Invoice generated successfully!");
      navigate(`/invoices/${docRef.id}`);
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!invoice) return;
    
    try {
      // Get company info from localStorage or use defaults
      let companyInfo = {};
      
      // Try to get company info from Firebase
      try {
        const docRef = doc(db, 'companySettings', 'default');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          companyInfo = docSnap.data();
        } else {
          // Fall back to localStorage
          const savedInfo = localStorage.getItem('companyInfo');
          if (savedInfo) {
            companyInfo = JSON.parse(savedInfo);
          }
        }
      } catch (error) {
        console.error('Error fetching company info:', error);
        // Fall back to localStorage
        const savedInfo = localStorage.getItem('companyInfo');
        if (savedInfo) {
          companyInfo = JSON.parse(savedInfo);
        }
      }
      
      // Ensure the custom notes from the invoice are used
      if (invoice.notes) {
        companyInfo = {
          ...companyInfo,
          notes: invoice.notes
        };
      }
      
      // Format the invoice to match the expected type
      const formattedInvoice: IndexInvoice = {
        ...invoice,
        customerPhone: invoice.customerPhone || "",
        deliveryAddress: invoice.deliveryAddress || "",
        paymentDate: invoice.paymentDate || undefined,
        updatedAt: undefined
      };
      
      // Generate PDF
      const pdfDoc = await generateInvoicePdf(formattedInvoice, companyInfo);
      
      // Save the PDF
      pdfDoc.save(`Invoice-${invoice.id.slice(0, 6)}.pdf`);
      toast.success('Invoice downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Generate Invoice">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout title="Generate Invoice">
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

  const formattedDate = new Date(order.createdAt).toLocaleDateString();

  // Calculate subtotal from items, excluding shipping cost
  const calculateSubtotal = () => {
    return order.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  };

  return (
    <DashboardLayout title="Generate Invoice">
      <div className="flex flex-col gap-6 max-w-3xl mx-auto">
        <div className="flex justify-between items-center">
          <Link to="/orders">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
          <h2 className="text-2xl font-bold">Generate Invoice for Order #{order.id}</h2>
        </div>

        <form onSubmit={submitForm}>
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order ID</p>
                    <p className="font-medium">{order.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Date</p>
                    <p className="font-medium">{formattedDate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{order.customerName || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{order.customerPhone || "N/A"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Delivery Address</p>
                    <p className="font-medium">{order.deliveryAddress || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                                  <span className="text-organic-primary font-medium">₹{item.price?.toFixed(2)}</span>
                                  <span className="ml-1 text-xs px-1 py-0.25 bg-blue-100 text-blue-800 rounded-sm">
                                    Custom
                                  </span>
                                </span>
                              ) : (
                                <span> ₹{item.price?.toFixed(2)}</span>
                              )}
                            </p>
                          </div>
                          <p className="font-medium">₹{((item.price || 0) * item.quantity).toFixed(2)}</p>
                        </div>
                        {index < order.items.length - 1 && <Separator className="my-4" />}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">No items in this order</p>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <div className="flex justify-between font-medium">
                      <span>Subtotal:</span>
                      <span>₹{calculateSubtotal().toFixed(2)}</span>
                    </div>
                    {order.shippingCost && order.shippingCost > 0 && (
                      <div className="flex justify-between mt-2">
                        <span>Shipping Cost:</span>
                        <span>₹{order.shippingCost.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium mt-2 pt-2 border-t">
                      <span>Total Order Amount:</span>
                      <span>₹{(calculateSubtotal() + (order.shippingCost || 0)).toFixed(2)}</span>
                    </div>

                    {order.outstandingAmount && order.outstandingAmount > 0 && (
                      <div className="mt-4 pt-4 border-t border-amber-200">
                        <div className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            id="includeOutstanding"
                            checked={includeOutstanding}
                            onChange={(e) => setIncludeOutstanding(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 mr-2"
                          />
                          <Label htmlFor="includeOutstanding" className="flex items-center cursor-pointer">
                            <span>Include Outstanding Amount</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" className="h-6 w-6 p-0 ml-1">
                                    <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs text-xs">
                                    This will add the outstanding amount to the invoice total.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </Label>
                        </div>
                        
                        {includeOutstanding && (
                          <>
                            <div className="flex justify-between mt-2 text-red-600">
                              <span className="flex items-center">
                                Outstanding Amount:
                                <span className="text-xs ml-2">({order.outstandingNote || "Previous balance"})</span>
                              </span>
                              <span>₹{order.outstandingAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-medium mt-2 pt-2 border-t text-red-600">
                              <span>Total with Outstanding:</span>
                              <span>₹{(calculateSubtotal() + (order.shippingCost || 0) + order.outstandingAmount).toFixed(2)}</span>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Payment Status</Label>
                      <Select
                        value={paymentStatus}
                        onValueChange={handlePaymentStatusChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="partially_paid">Partially Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="method">Payment Method</Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={setPaymentMethod}
                        disabled={paymentStatus === "unpaid"}
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
                  </div>

                  {paymentStatus === "partially_paid" && (
                    <div className="space-y-2">
                      <Label htmlFor="amountPaid">Amount Paid</Label>
                      <div className="flex items-center">
                        <span className="mr-2">₹</span>
                        <Input
                          id="amountPaid"
                          type="number"
                          min="0"
                          max={getTotalWithOutstanding()}
                          step="0.01"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Due: ₹{(getTotalWithOutstanding() - amountPaid).toFixed(2)}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="paymentDate">Payment Date</Label>
                    <Input
                      id="paymentDate"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      disabled={paymentStatus === "unpaid"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentReference">Payment Reference</Label>
                    <Input
                      id="paymentReference"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="Reference number or transaction ID"
                      disabled={paymentStatus === "unpaid"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes for the invoice"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                size="lg"
                className="gap-2 bg-organic-primary hover:bg-organic-dark"
                disabled={isSubmitting}
              >
                <FileText className="h-4 w-4" />
                {isSubmitting ? "Generating..." : "Generate Invoice"}
              </Button>
            </div>

            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={handleDownloadPdf}
                disabled={!invoice || isSubmitting}
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default InvoiceGenerator; 