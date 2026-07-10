import React, { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { invoicesCollection } from "@/firebase";
import { query, where, getDocs } from "firebase/firestore";
import { Invoice } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { formatInvoiceNumber } from "@/components/invoices/InvoiceGenerator";
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { addDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OutstandingInvoice extends Invoice {
  pendingAmount: number;
}

const OutstandingReport = () => {
  const [outstandingInvoices, setOutstandingInvoices] = useState<OutstandingInvoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<OutstandingInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalPendingAmount, setTotalPendingAmount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  useEffect(() => {
    fetchOutstandingInvoices();
  }, []);

  useEffect(() => {
    applyFilters(outstandingInvoices, searchQuery, date);
  }, [outstandingInvoices, searchQuery, date]);

  const fetchOutstandingInvoices = async () => {
    try {
      setIsLoading(true);
      const q = query(invoicesCollection);
      const querySnapshot = await getDocs(q);
      const pendingInvoices: OutstandingInvoice[] = [];
      let totalPending = 0;
      querySnapshot.forEach((doc) => {
        const invoiceData = doc.data() as Invoice;
        const pending = (invoiceData.total || 0) - (invoiceData.amountPaid || 0);
        if (pending > 0) {
          pendingInvoices.push({
            ...invoiceData,
            id: doc.id,
            pendingAmount: pending,
          });
          totalPending += pending;
        }
      });
      setOutstandingInvoices(pendingInvoices);
      setTotalPendingAmount(totalPending);
    } catch (error) {
      console.error('Error fetching outstanding invoices:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (data: OutstandingInvoice[], search: string, date: DateRange | undefined) => {
    let filtered = [...data];
    if (date?.from && date?.to) {
      const fromTime = new Date(date.from).setHours(0, 0, 0, 0);
      const toTime = new Date(date.to).setHours(23, 59, 59, 999);
      filtered = filtered.filter(inv => {
        const invDate = typeof inv.createdAt === 'number' ? inv.createdAt : new Date(inv.createdAt).getTime();
        return invDate >= fromTime && invDate <= toTime;
      });
    }
    if (search.trim()) {
      const lower = search.trim().toLowerCase();
      filtered = filtered.filter(inv => {
        const formattedDate = new Date(inv.createdAt).toLocaleDateString().toLowerCase();
        const formattedDateISO = new Date(inv.createdAt).toISOString().toLowerCase();
        return (
          inv.customerName?.toLowerCase().includes(lower) ||
          inv.invoiceNumber?.toLowerCase?.().includes(lower) ||
          formattedDate.includes(lower) ||
          formattedDateISO.includes(lower) ||
          (inv.paidStatus ? inv.paidStatus.toLowerCase().includes(lower) : false) ||
          String(inv.total || '').toLowerCase().includes(lower) ||
          String(inv.amountPaid || '').toLowerCase().includes(lower) ||
          String(inv.pendingAmount || '').toLowerCase().includes(lower)
        );
      });
    }
    setFilteredInvoices(filtered);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Outstanding Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Outstanding Report</CardTitle>
        <div className="flex items-center gap-4 justify-between flex-wrap mt-4">
          <DatePickerWithRange date={date} setDate={setDate} />
          <div className="relative w-full max-w-xs ml-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by invoice number or customer name..."
              className="pl-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="text-lg font-medium mt-4">
          Total Pending Amount: ₹{filteredInvoices.reduce((sum, inv) => sum + inv.pendingAmount, 0).toFixed(2)}
        </div>
      </CardHeader>
      <CardContent>
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No outstanding invoices found.</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">S.No</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead className="text-right">Invoice amount</TableHead>
                  <TableHead className="text-right">Paid Amount</TableHead>
                  <TableHead className="text-right">Pending amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice, index) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{invoice.customerName}</TableCell>
                    <TableCell>{formatInvoiceNumber(invoice.invoiceNumber, invoice.createdAt)}</TableCell>
                    <TableCell>{new Date(invoice.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">₹{invoice.total?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{invoice.amountPaid?.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₹{invoice.pendingAmount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={6} className="text-right font-bold">Total Pending Amount:</TableCell>
                  <TableCell className="text-right font-bold">₹{filteredInvoices.reduce((sum, inv) => sum + inv.pendingAmount, 0).toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OutstandingReport;