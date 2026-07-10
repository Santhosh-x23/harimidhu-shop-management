import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Search, Download, Eye, FileText, MoreHorizontal, AlertCircle, Clock, HistoryIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Invoice, PaymentRecord } from "@/types";
import { toast } from "sonner";
import { invoicesCollection } from "@/firebase";
import { getDocs, query, orderBy, where, doc, deleteDoc } from "firebase/firestore";
import { generateInvoicePdf } from "@/utils/pdfUtils";
import { db } from "@/firebase";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatInvoiceNumber } from "@/components/invoices/InvoiceGenerator";

const Invoices = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    // Check if there's an orderId in the URL parameters to generate an invoice
    const orderId = searchParams.get("orderId");
    if (orderId) {
      generateInvoiceForOrder(orderId);
    }
  }, [searchParams]);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const invoicesQuery = query(invoicesCollection, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(invoicesQuery);
      
      const invoicesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Invoice[];
      
      setInvoices(invoicesData);
      setFilteredInvoices(invoicesData);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to fetch invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const generateInvoiceForOrder = async (orderId: string) => {
    // Check if invoice already exists for this order
    const existingInvoice = invoices.find(invoice => invoice.orderId === orderId);
    if (existingInvoice) {
      navigate(`/invoices/${existingInvoice.id}`);
      return;
    }

    // If not, navigate to invoice creation page
    navigate(`/invoices/generate/${orderId}`);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    filterInvoices(query, statusFilter);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    filterInvoices(searchQuery, value);
  };

  const filterInvoices = (query: string, status: string) => {
    let filtered = [...invoices];
    
    // Apply search filter
    if (query.trim() !== "") {
      filtered = filtered.filter(
        invoice =>
          (invoice.customerName && invoice.customerName.toLowerCase().includes(query)) ||
          invoice.id.toLowerCase().includes(query) ||
          invoice.orderId.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (status !== "all") {
      filtered = filtered.filter(invoice => invoice.paidStatus === status);
    }
    
    setFilteredInvoices(filtered);
  };

  const handleViewInvoice = (invoiceId: string) => {
    navigate(`/invoices/${invoiceId}`);
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      // Generate and download the PDF
      const doc = await generateInvoicePdf(invoice);
      
      // Sanitize customer name for filename
      const sanitizedCustomerName = invoice.customerName
        .replace(/[^a-zA-Z0-9]/g, '_') // Replace special chars with underscore
        .replace(/_+/g, '_') // Replace multiple underscores with single
        .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      
      // Save the PDF with customer name and invoice number
      doc.save(`${sanitizedCustomerName}-${formatInvoiceNumber(invoice.invoiceNumber, invoice.createdAt)}.pdf`);
      
      toast.success(`Invoice downloaded successfully!`);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Failed to download invoice. Please try again.');
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      try {
        await deleteDoc(doc(db, 'invoices', invoiceId));
        setInvoices(prevInvoices => prevInvoices.filter(invoice => invoice.id !== invoiceId));
        setFilteredInvoices(prevFiltered => prevFiltered.filter(invoice => invoice.id !== invoiceId));
        toast.success('Invoice deleted successfully');
      } catch (error) {
        console.error('Error deleting invoice:', error);
        toast.error('Failed to delete invoice');
      }
    }
  };

  const handleViewPaymentHistory = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentHistoryOpen(true);
  };

  // Calculate total for invoice including outstanding amount
  const calculateTotal = (invoice: Invoice) => {
    // The invoice.total already includes the outstanding amount
    // We don't need to add it again
    return invoice.total;
  };

  // Calculate due amount for an invoice
  const calculateDueAmount = (invoice: Invoice) => {
    const amountPaid = invoice.amountPaid || 0;
    return invoice.total - amountPaid;
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Invoices">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Invoices">
      <div className="flex flex-col gap-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoices..."
              className="pl-9"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          
          <div className="flex gap-4">
            <Select
              value={statusFilter}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Invoices Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>All Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredInvoices.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => {
                      const dueAmount = calculateDueAmount(invoice);
                      
                      return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{formatInvoiceNumber(invoice.invoiceNumber, invoice.createdAt)}</TableCell>
                        <TableCell>{invoice.orderId}</TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>{format(new Date(invoice.createdAt), "dd MMM yyyy")}</TableCell>
                        <TableCell>₹{invoice.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={cn(
                            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                            invoice.paidStatus === "paid" 
                              ? "bg-green-100 text-green-800" 
                              : invoice.paidStatus === "partially_paid"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          )}>
                            {invoice.paidStatus === "paid" 
                              ? "Paid" 
                              : invoice.paidStatus === "partially_paid" 
                                ? "Partially Paid" 
                                : "Unpaid"}
                          </span>
                        </TableCell>
                          <TableCell>
                            {invoice.paidStatus !== "paid" && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1">
                                      <span className="font-medium text-red-600">₹{dueAmount.toFixed(2)}</span>
                                      {invoice.paidStatus === "partially_paid" && (
                                        <AlertCircle className="h-4 w-4 text-amber-500" />
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {invoice.paidStatus === "partially_paid" 
                                      ? `Paid: ₹${(invoice.amountPaid || 0).toFixed(2)} of ₹${invoice.total.toFixed(2)}`
                                      : `Due: ₹${invoice.total.toFixed(2)}`}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {invoice.paidStatus === "paid" && (
                              <span className="text-green-600">Paid</span>
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
                                onClick={() => handleViewInvoice(invoice.id)}
                              >
                                <Eye className="h-4 w-4" />
                                View Invoice
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => handleDownloadInvoice(invoice)}
                              >
                                <Download className="h-4 w-4" />
                                Download PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="flex items-center gap-2 cursor-pointer"
                                onClick={() => navigate(`/invoices/status/${invoice.id}`)}
                              >
                                <FileText className="h-4 w-4" />
                                Update Status
                              </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="flex items-center gap-2 cursor-pointer"
                                  onClick={() => handleViewPaymentHistory(invoice)}
                                >
                                  <HistoryIcon className="h-4 w-4" />
                                  Payment History
                                </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="flex items-center gap-2 cursor-pointer text-destructive"
                                onClick={() => handleDeleteInvoice(invoice.id)}
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
                                Delete Invoice
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-10">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                <p className="mt-2 text-muted-foreground">No invoices found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment History Dialog */}
      <Dialog open={isPaymentHistoryOpen} onOpenChange={setIsPaymentHistoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Payment History</DialogTitle>
            <DialogDescription>
              {selectedInvoice && `Invoice #${formatInvoiceNumber(selectedInvoice.id, selectedInvoice.createdAt)} - ${selectedInvoice.customerName}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="pt-2">
            {selectedInvoice && (
              <div>
                <div className="flex justify-between text-sm mb-4">
                  <div>
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-medium ml-2">₹{selectedInvoice.total.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Current Status:</span>
                    <span className={cn(
                      "ml-2 font-medium capitalize",
                      selectedInvoice.paidStatus === "paid" 
                        ? "text-green-600" 
                        : selectedInvoice.paidStatus === "partially_paid"
                          ? "text-amber-600"
                          : "text-red-600"
                    )}>
                      {selectedInvoice.paidStatus}
                    </span>
                  </div>
                </div>
                
                {selectedInvoice.paidStatus !== "paid" && (
                  <div className="flex justify-between text-sm mb-4 border-t pt-2">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-medium ml-2">₹{(selectedInvoice.amountPaid || 0).toFixed(2)}</span>
                  </div>
                )}
                
                {selectedInvoice.paidStatus !== "paid" && (
                  <div className="flex justify-between text-sm mb-4 text-red-600">
                    <span>Amount Due:</span>
                    <span className="font-medium ml-2">₹{(selectedInvoice.total - (selectedInvoice.amountPaid || 0)).toFixed(2)}</span>
                  </div>
                )}

                <ScrollArea className="h-[300px] rounded-md border p-2">
                  {selectedInvoice.paymentHistory && selectedInvoice.paymentHistory.length > 0 ? (
                    <div className="space-y-4">
                      {selectedInvoice.paymentHistory.map((payment: PaymentRecord, index) => (
                        <div key={index} className="border rounded-md p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(payment.date), 'dd MMM yyyy - HH:mm')}
                              </span>
                            </div>
                            <span className={payment.amount > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                              {payment.amount > 0 ? `+₹${payment.amount.toFixed(2)}` : `-₹${Math.abs(payment.amount).toFixed(2)}`}
                            </span>
                          </div>
                          <p className="text-sm mb-1">
                            {payment.note}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            Status changed from <span className="capitalize">{payment.previousStatus}</span> to <span className="capitalize">{payment.newStatus}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">No payment history available</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            )}
          </div>
          
          <div className="mt-4 flex justify-end">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Invoices;
