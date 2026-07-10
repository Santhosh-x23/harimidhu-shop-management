import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, AlertTriangle, Banknote } from "lucide-react";
import { toast } from "sonner";
import { Invoice } from "@/types";
import { invoicesCollection } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";
import InvoiceTemplate from "./InvoiceTemplate";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatInvoiceNumber } from "./InvoiceGenerator";

const InvoiceDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      console.log("Fetching invoice with ID:", id);
      
      const invoiceDoc = await getDoc(doc(invoicesCollection, id));
      console.log("Invoice document:", invoiceDoc.exists() ? "Found" : "Not found");
      
      if (invoiceDoc.exists()) {
        const data = invoiceDoc.data();
        setInvoice({
          id: invoiceDoc.id,
          ...data
        } as Invoice);
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

  if (isLoading) {
    return (
      <DashboardLayout title="Invoice Details">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!invoice) {
    return (
      <DashboardLayout title="Invoice Details">
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

  const hasOutstandingAmount = invoice.outstandingAmount && invoice.outstandingAmount > 0;
  const includeOutstanding = invoice.includeOutstanding !== false; // default to true if not set

  return (
    <DashboardLayout title="Invoice Details">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link to="/invoices">
              <Button variant="outline" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Invoices
              </Button>
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Invoice #{formatInvoiceNumber(invoice.invoiceNumber, invoice.createdAt)}
              {invoice.paidStatus === "paid" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="bg-green-100 hover:bg-green-200 text-green-800 border border-green-300">
                        <Banknote className="h-3 w-3 mr-1" />
                        Paid
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This invoice has been fully paid</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {hasOutstandingAmount && includeOutstanding && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Outstanding
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>This invoice includes an outstanding amount of ₹{invoice.outstandingAmount.toFixed(2)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {invoice.paidStatus === "partially_paid" && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge className="bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300">
                        <Banknote className="h-3 w-3 mr-1" />
                        Partially Paid
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Amount paid: ₹{invoice.amountPaid?.toFixed(2) || '0.00'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </h1>
          </div>
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="gap-2 bg-organic-primary hover:bg-organic-dark"
              onClick={() => navigate(`/invoices/status/${invoice.id}`)}
            >
              <FileText className="h-4 w-4" />
              Update Status
            </Button>
            {invoice.orderId && (
              <Button 
                size="sm" 
                variant="outline"
                className="gap-2"
                onClick={() => navigate(`/orders/${invoice.orderId}`)}
              >
                <ArrowLeft className="h-4 w-4" />
                Go to Order
              </Button>
            )}
          </div>
        </div>

        {hasOutstandingAmount && (
          <Alert className={`${includeOutstanding ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
            <AlertTriangle className={`h-4 w-4 ${includeOutstanding ? 'text-amber-500' : 'text-gray-400'}`} />
            <AlertDescription>
              {includeOutstanding ? (
                <span className="font-medium">
                  This invoice includes an outstanding amount of ₹{invoice.outstandingAmount.toFixed(2)}
                  {invoice.outstandingNote && `: ${invoice.outstandingNote}`}
                </span>
              ) : (
                <span>
                  There is an outstanding amount of ₹{invoice.outstandingAmount.toFixed(2)} which is <span className="font-medium">not included</span> in this invoice total.
                  {invoice.outstandingNote && ` Note: ${invoice.outstandingNote}`}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        {invoice.customerGstin && (
          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <FileText className="h-4 w-4 text-blue-500" />
            <AlertDescription>
              <span className="font-medium">
                Customer GSTIN: {invoice.customerGstin}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {invoice.paidStatus === "partially_paid" && invoice.amountPaid && (
          <Alert className="bg-blue-50 border-blue-200 text-blue-800">
            <Banknote className="h-4 w-4 text-blue-500" />
            <AlertDescription>
              <span className="font-medium">
                Payment of ₹{invoice.amountPaid.toFixed(2)} received. Remaining balance: ₹{(invoice.total - invoice.amountPaid).toFixed(2)}
              </span>
            </AlertDescription>
          </Alert>
        )}

        <InvoiceTemplate invoice={invoice} />
      </div>
    </DashboardLayout>
  );
};

export default InvoiceDetails; 