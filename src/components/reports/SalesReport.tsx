import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Download } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { collection, getDocs, query, orderBy, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db, invoicesCollection } from '@/firebase';
import { Invoice, OrderItem } from '@/types';
import { format } from 'date-fns';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { addDays } from 'date-fns';
import { DateRange } from 'react-day-picker';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';


interface InvoiceWithId extends Invoice {
  id: string;
  // Inherits createdAt: number, total: number, shippingCost?: number, items: OrderItem[] from Invoice
  customer?: { name?: string }; // Optional nested customer object
  customerName: string; // Ensure customerName is available as string
  invoiceNumber: string; // Ensure invoiceNumber is available as string
}

const SalesReport = () => {
  const [allInvoices, setAllInvoices] = useState<InvoiceWithId[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<InvoiceWithId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalAllInvoicesAmount, setTotalAllInvoicesAmount] = useState(0); // New state for total of all invoices
  const [grossTotalAllInvoices, setGrossTotalAllInvoices] = useState(0); // New state for gross total of all invoices
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });
  const [companyGstRate, setCompanyGstRate] = useState<number>(0.05); // Default 5%

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        setIsLoading(true);
        // Fetch all invoices, ordered by invoice number ascending
        const q = query(invoicesCollection, orderBy("invoiceNumber", "asc"));
        const querySnapshot = await getDocs(q);

        const invoicesData: InvoiceWithId[] = querySnapshot.docs.map(doc => {
          const data = doc.data();

          // Map data, ensuring type compatibility and handling potential missing fields
          return {
            id: doc.id,
            createdAt: data.createdAt as number, // createdAt is a number timestamp
            customerName: data.customerName as string || 'N/A', // Ensure string and handle potential missing
            customer: data.customer as { name?: string } | undefined, // Handle potential nested customer object
            total: data.total as number, // total is a number and required by Invoice type
            shippingCost: data.shippingCost as number | undefined, // Handle potential undefined shippingCost
            items: data.items as OrderItem[], // items is an array and required by Invoice type
            invoiceNumber: data.invoiceNumber as string || doc.id, // Use invoiceNumber or fallback to doc.id
            // ... map other fields from Invoice type as necessary
            ...data as any // Include other properties, temporary any cast for flexibility
          } as InvoiceWithId; // Final cast
        });

        setAllInvoices(invoicesData);
        setFilteredInvoices(invoicesData);

        // Calculate total of all invoices here, excluding outstanding amount
        const total = invoicesData.reduce((sum, invoice) => sum + ((invoice.total || 0) - (invoice.outstandingAmount || 0)), 0);
        setTotalAllInvoicesAmount(total);

        // Calculate the gross total of all invoices (sum of the 'total' field)
        const grossTotal = invoicesData.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
        setGrossTotalAllInvoices(grossTotal);

      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  useEffect(() => {
    // Fetch company GST rate (from Firestore or localStorage)
    const fetchCompanyGstRate = async () => {
      try {
        // Try Firestore first
        const docRef = doc(db, 'companySettings', 'default');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.taxRate) {
            setCompanyGstRate(parseFloat(data.taxRate) / 100);
            return;
          }
        }
        // Fallback to localStorage
        const savedInfo = localStorage.getItem('companyInfo');
        if (savedInfo) {
          const info = JSON.parse(savedInfo);
          if (info.taxRate) {
            setCompanyGstRate(parseFloat(info.taxRate) / 100);
            return;
          }
        }
      } catch (e) {
        // Ignore, use default
      }
    };
    fetchCompanyGstRate();
  }, []);

  useEffect(() => {
    applyFilters(allInvoices, searchQuery, date);
  }, [allInvoices, searchQuery, date]);

  const applyFilters = (data: InvoiceWithId[], search: string, date: DateRange | undefined) => {
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
          inv.customer?.name?.toLowerCase().includes(lower) ||
          inv.id.toLowerCase().includes(lower) ||
          inv.invoiceNumber?.toLowerCase().includes(lower) ||
          formattedDate.includes(lower) ||
          formattedDateISO.includes(lower) ||
          String(inv.total || '').toLowerCase().includes(lower) ||
          String(inv.shippingCost || '').toLowerCase().includes(lower)
        );
      });
    }
    setFilteredInvoices(filtered);
  };

  // Function to calculate basic amount from invoice items
  const calculateBasicAmount = (items: OrderItem[]): number => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
  };

  // GST calculation matching InvoiceTemplate: GST is included in item prices
  const calculateGstAmount = (basicAmount: number): number => {
    const gstRate = companyGstRate;
    const totalWithoutGST = +(basicAmount / (1 + gstRate));
    const totalGST = +(basicAmount - totalWithoutGST);
    return totalGST; // CGST + SGST
  };

  const calculateCgstAmount = (basicAmount: number): number => {
    return calculateGstAmount(basicAmount) / 2;
  };
  const calculateSgstAmount = (basicAmount: number): number => {
    return calculateGstAmount(basicAmount) / 2;
  };

  const calculateNetAmount = (basicAmount: number, gstAmount: number): number => {
    // Net Amount is Basic Amount (which is subtotal incl. GST)
    return basicAmount;
  };

  // Calculate total sales from filtered invoices using the 'total' field - Keep for filtered display
  const totalSalesFiltered = filteredInvoices.reduce((sum, invoice) => {
    const basicAmount = calculateBasicAmount(invoice.items);
    return sum + basicAmount + (invoice.shippingCost || 0);
  }, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Sales Report</CardTitle>
        <div className="flex items-center gap-4 justify-between flex-wrap mt-4">
          <DatePickerWithRange date={date} setDate={setDate} />
          <div className="relative w-full max-w-xs ml-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer, invoice #, or date..."
              className="pl-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="ml-2 p-2 rounded hover:bg-gray-100 transition-colors"
            title="Download PDF"
            onClick={() => {
              console.log('Download PDF button clicked');
              const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'A4' });
              // Title
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(18);
              doc.text("Sales Report", doc.internal.pageSize.getWidth() / 2, 36, { align: 'center' });
              // Subtitle (date range)
              if (date?.from && date?.to) {
                doc.setFontSize(11);
                doc.setFont('helvetica', 'normal');
                doc.text(
                  `From: ${format(new Date(date.from), 'PPP')}  To: ${format(new Date(date.to), 'PPP')}`,
                  doc.internal.pageSize.getWidth() / 2,
                  54,
                  { align: 'center' }
                );
              }
              // Table
              const tableResult = (autoTable as any)(doc, {
                startY: date?.from && date?.to ? 70 : 54,
                head: [[
                  "S.No",
                  "Invoice Date",
                  "Invoice Number",
                  "Customer",
                  "GSTIN",
                  "Basic Amount",
                  "GST Amount",
                  "Net Amount",
                  "Shipping Charges",
                  "Total"
                ]],
                body: filteredInvoices.map((invoice, index) => {
                  const basicAmount = calculateBasicAmount(invoice.items);
                  const gstAmount = calculateGstAmount(basicAmount);
                  const netAmount = calculateNetAmount(basicAmount, gstAmount);
                  const cgstAmount = calculateCgstAmount(basicAmount);
                  const sgstAmount = calculateSgstAmount(basicAmount);
                  return [
                    index + 1,
                    format(new Date(invoice.createdAt), 'PPP'),
                    invoice.invoiceNumber || invoice.id,
                    invoice.customerName || invoice.customer?.name || 'N/A',
                    invoice.customerGstin || 'N/A',
                    (basicAmount - gstAmount).toFixed(2),
                    gstAmount.toFixed(2) + ` (CGST: ${cgstAmount.toFixed(2)}, SGST: ${sgstAmount.toFixed(2)})`,
                    netAmount.toFixed(2),
                    invoice.shippingCost?.toFixed(2) || 'N/A',
                    (basicAmount + (invoice.shippingCost || 0)).toFixed(2)
                  ];
                }),
                styles: {
                  font: 'helvetica',
                  fontSize: 10,
                  cellPadding: 5,
                  valign: 'middle',
                  lineColor: [200, 200, 200],
                  lineWidth: 0.5,
                },
                headStyles: {
                  fillColor: [21, 128, 61], // darker green
                  textColor: 255,
                  fontStyle: 'bold',
                  halign: 'center',
                  lineColor: [200, 200, 200],
                  lineWidth: 1,
                },
                columnStyles: {
                  0: { halign: 'center' },
                  1: { halign: 'center' },
                  2: { halign: 'center' },
                  3: { halign: 'left' },
                  4: { halign: 'center' },
                  5: { halign: 'right' }, // Basic Amount
                  6: { halign: 'right' }, // GST Amount
                  7: { halign: 'right' }, // Net Amount
                  8: { halign: 'right' }, // Shipping Charges
                  9: { halign: 'right' }, // Total
                },
                alternateRowStyles: { fillColor: [245, 245, 245] },
                tableLineColor: [200, 200, 200],
                tableLineWidth: 0.5,
                margin: { left: 10, right: 10 },
                tableWidth: 'auto',
              });
              // Add overall totals at the bottom of the last page or on a new page if needed
              doc.addPage();
              let finalY = 60;
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(12);
              doc.setTextColor(21, 128, 61);
              doc.text('Overall Totals:', doc.internal.pageSize.getWidth() / 2, finalY, { align: 'center' });
              doc.setFontSize(10);
              doc.setTextColor(0, 0, 0);
              const totals = [
                filteredInvoices.reduce((sum, i) => sum + (calculateBasicAmount(i.items) - calculateGstAmount(calculateBasicAmount(i.items))), 0).toFixed(2),
                filteredInvoices.reduce((sum, i) => sum + calculateGstAmount(calculateBasicAmount(i.items)), 0).toFixed(2),
                filteredInvoices.reduce((sum, i) => sum + calculateNetAmount(calculateBasicAmount(i.items), calculateGstAmount(calculateBasicAmount(i.items))), 0).toFixed(2),
                filteredInvoices.reduce((sum, i) => sum + (i.shippingCost || 0), 0).toFixed(2),
                filteredInvoices.reduce((sum, i) => {
                  const basicAmount = calculateBasicAmount(i.items);
                  return sum + basicAmount + (i.shippingCost || 0);
                }, 0).toFixed(2)
              ];
              const labels = ['Basic Amount', 'GST Amount', 'Net Amount', 'Shipping Charges', 'Total'];
              let y = finalY + 18;
              for (let i = 0; i < labels.length; i++) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(21, 128, 61);
                doc.text(`${labels[i]}:`, doc.internal.pageSize.getWidth() / 2 - 60, y, { align: 'right' });
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                doc.text(totals[i], doc.internal.pageSize.getWidth() / 2 + 10, y, { align: 'left' });
                y += 16;
              }
              doc.save("sales-report.pdf");
            }}
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            className="ml-2 p-2 rounded hover:bg-gray-100 transition-colors"
            title="Download Excel"
            onClick={() => {
              // Prepare data for Excel
              const excelData = filteredInvoices.map((invoice, index) => {
                const basicAmount = calculateBasicAmount(invoice.items);
                const gstAmount = calculateGstAmount(basicAmount);
                const netAmount = calculateNetAmount(basicAmount, gstAmount);
                const cgstAmount = calculateCgstAmount(basicAmount);
                const sgstAmount = calculateSgstAmount(basicAmount);
                return {
                  'S.No': index + 1,
                  'Invoice Date': format(new Date(invoice.createdAt), 'PPP'),
                  'Invoice Number': invoice.invoiceNumber || invoice.id,
                  'Customer': invoice.customerName || invoice.customer?.name || 'N/A',
                  'GSTIN': invoice.customerGstin || 'N/A',
                  'Basic Amount': (basicAmount - gstAmount).toFixed(2),
                  'GST Amount': gstAmount.toFixed(2) + ` (CGST: ${cgstAmount.toFixed(2)}, SGST: ${sgstAmount.toFixed(2)})`,
                  'Net Amount': netAmount.toFixed(2),
                  'Shipping Charges': invoice.shippingCost?.toFixed(2) || 'N/A',
                  'Total': (basicAmount + (invoice.shippingCost || 0)).toFixed(2)
                };
              });
              // Create worksheet and workbook
              const ws = XLSX.utils.json_to_sheet(excelData);
              // Set column widths for better alignment
              ws['!cols'] = [
                { wch: 6 },   // S.No
                { wch: 16 },  // Invoice Date
                { wch: 18 },  // Invoice Number
                { wch: 24 },  // Customer
                { wch: 18 },  // GSTIN
                { wch: 14 },  // Basic Amount
                { wch: 32 },  // GST Amount (increased for more spacing)
                { wch: 14 },  // Net Amount
                { wch: 18 },  // Shipping Charges
                { wch: 14 },  // Total
              ];
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
              // Save as Excel file
              const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
              const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
              saveAs(blob, 'sales-report.xlsx');
            }}
          >
            <Download className="h-5 w-5" />
            <span className="ml-1 text-xs">Excel</span>
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No sales data found matching your search.</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">S.No</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Invoice Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead className="text-right">Basic Amount</TableHead>
                  <TableHead className="text-right">GST Amount</TableHead>
                  <TableHead className="text-right">Net Amount</TableHead>
                  <TableHead className="text-right">Shipping Charges</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice, index) => {
                  const basicAmount = calculateBasicAmount(invoice.items);
                  const gstAmount = calculateGstAmount(basicAmount);
                  const netAmount = calculateNetAmount(basicAmount, gstAmount);
                  const cgstAmount = calculateCgstAmount(basicAmount);
                  const sgstAmount = calculateSgstAmount(basicAmount);
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{format(new Date(invoice.createdAt), 'PPP')}</TableCell>
                      <TableCell>{invoice.invoiceNumber || invoice.id}</TableCell>
                      <TableCell>{invoice.customerName || invoice.customer?.name || 'N/A'}</TableCell>
                      <TableCell>{invoice.customerGstin || 'N/A'}</TableCell>
                      <TableCell className="text-right">{(basicAmount - gstAmount).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{gstAmount.toFixed(2)}<br/><span className="text-xs text-muted-foreground">CGST: {cgstAmount.toFixed(2)}, SGST: {sgstAmount.toFixed(2)}</span></TableCell>
                      <TableCell className="text-right">{netAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{invoice.shippingCost?.toFixed(2) || 'N/A'}</TableCell>
                      <TableCell className="text-right">₹{(basicAmount + (invoice.shippingCost || 0)).toFixed(2)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={10} className="text-right font-bold">Filtered Total:</TableCell>
                  <TableCell className="text-right font-bold">₹{totalSalesFiltered.toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SalesReport;