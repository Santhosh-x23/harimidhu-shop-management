import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Invoice } from "@/types";
import { invoicesCollection, productsCollection } from "@/firebase";
import { getDocs, query, where, orderBy } from "firebase/firestore";
import { toast } from "sonner";
import { formatInvoiceNumber } from "@/components/invoices/InvoiceGenerator";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { addDays } from "date-fns";
import { DateRange } from 'react-day-picker';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

const ProfitLossReport = () => {
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (date?.from && date?.to) {
      fetchInvoices();
    }
  }, [date]);

  useEffect(() => {
    applySearchFilter(invoices, searchQuery);
  }, [invoices, searchQuery]);

  const fetchInvoices = async () => {
    if (!date?.from || !date?.to) return;
    try {
      setIsLoading(true);
      const startDate = new Date(date.from);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date.to);
      endDate.setHours(23, 59, 59, 999);

      const startTimestamp = startDate.getTime();
      const endTimestamp = endDate.getTime();

      const invoicesQuery = query(
        invoicesCollection,
        where("createdAt", ">=", startTimestamp),
        where("createdAt", "<=", endTimestamp),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(invoicesQuery);
      const invoicesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Invoice[];

      setInvoices(invoicesData);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to fetch invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const applySearchFilter = (data: Invoice[], search: string) => {
    if (!search.trim()) {
      setFilteredInvoices(data);
      return;
    }
    const lower = search.trim().toLowerCase();
    setFilteredInvoices(
      data.filter(inv => {
        const formattedDate = new Date(inv.createdAt).toLocaleDateString().toLowerCase();
        const formattedDateISO = new Date(inv.createdAt).toISOString().toLowerCase();
        return (
          inv.customerName?.toLowerCase().includes(lower) ||
          inv.invoiceNumber?.toLowerCase?.().includes(lower) ||
          formattedDate.includes(lower) ||
          formattedDateISO.includes(lower) ||
          String(inv.total || '').toLowerCase().includes(lower) ||
          (inv.paidStatus ? inv.paidStatus.toLowerCase().includes(lower) : false)
        );
      })
    );
  };

  const calculateMaterialCost = (invoice: Invoice): number => {
    if (!invoice.items) return 0;
    return invoice.items.reduce((total, item) => {
      // Get the cost price from the item's cost_price property
      const costPrice = item.costPrice|| 0;
      return total + costPrice * item.quantity;
    }, 0);
  };

  const calculateProfit = (invoice: Invoice): number => {
    const materialCost = calculateMaterialCost(invoice);
    return invoice.total - materialCost;
  };

  const calculateMargin = (invoice: Invoice): number => {
    const profit = calculateProfit(invoice);
    return invoice.total > 0 ? (profit / invoice.total) * 100 : 0;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Profit & Loss Report</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-4 justify-between flex-wrap">
            <DatePickerWithRange date={date} setDate={setDate} />
            <div className="relative w-full max-w-xs ml-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by invoice number, customer name, or date..."
                className="pl-9"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
            </div>
          ) : filteredInvoices.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">S.No</TableHead>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead className="text-right">Invoice Amount</TableHead>
                    <TableHead className="text-right">Material Cost</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice, index) => {
                    const materialCost = calculateMaterialCost(invoice);
                    const profit = calculateProfit(invoice);
                    const margin = calculateMargin(invoice);

                    return (
                      <TableRow key={invoice.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{invoice.customerName}</TableCell>
                        <TableCell>
                          {formatInvoiceNumber(invoice.invoiceNumber, invoice.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">₹{invoice.total.toFixed(2)}</TableCell>
                        <TableCell className="text-right">₹{materialCost.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{profit.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={margin < 20 ? 'text-red-500' : margin < 30 ? 'text-amber-500' : 'text-green-600'}
                          >
                            {margin.toFixed(1)}%
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No invoices found for the selected date range.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfitLossReport;