import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Order, OrderItem, Product } from "@/types/index"; // Import Product type
import { ordersCollection, productsCollection } from "@/firebase"; // Import productsCollection
import { query, where, getDocs, DocumentData, documentId } from "firebase/firestore"; // Import documentId
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { addDays } from 'date-fns';
import { DateRange } from 'react-day-picker';

const OrderBackLogReport = () => {
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [productsMap, setProductsMap] = useState<Map<string, Product>>(new Map()); // State to store products
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  useEffect(() => {
    applyFilters(pendingOrders, searchQuery, date);
  }, [pendingOrders, searchQuery, date]);

  const applyFilters = (orders: Order[], search: string, date: DateRange | undefined) => {
    let filtered = [...orders];
    if (date?.from && date?.to) {
      const fromTime = new Date(date.from).setHours(0, 0, 0, 0);
      const toTime = new Date(date.to).setHours(23, 59, 59, 999);
      filtered = filtered.filter(order => {
        const orderDate = typeof order.createdAt === 'number' ? order.createdAt : new Date(order.createdAt).getTime();
        return orderDate >= fromTime && orderDate <= toTime;
      });
    }
    if (search.trim()) {
      const lower = search.trim().toLowerCase();
      filtered = filtered.filter(order => {
        const formattedDate = new Date(order.createdAt).toLocaleDateString().toLowerCase();
        const formattedDateISO = new Date(order.createdAt).toISOString().toLowerCase();
        return (
          order.customerName?.toLowerCase().includes(lower) ||
          order.id.toLowerCase().includes(lower) ||
          formattedDate.includes(lower) ||
          formattedDateISO.includes(lower)
        );
      });
    }
    setFilteredOrders(filtered);
  };

  const fetchPendingOrders = async () => {
    try {
      setIsLoading(true);
      // Modified query to only filter by status, avoiding composite index
      const q = query(ordersCollection, where("status", "==", "pending"));
      const querySnapshot = await getDocs(q);
      let ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as Order // Cast data to Order type
      }));

      // Sort pending orders by createdAt client-side
      ordersData.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      setPendingOrders(ordersData);

      // Collect unique productIds from pending orders
      const productIds = new Set<string>();
      ordersData.forEach(order => {
        order.items.forEach(item => {
          if (item.productId) {
            productIds.add(item.productId);
          }
        });
      });

      // Fetch products for the collected productIds using documentId()
      if (productIds.size > 0) {
        // Firestore 'in' query has a limit of 10 items
        const productIdsArray = Array.from(productIds);
        const productsQueries = [];
        for (let i = 0; i < productIdsArray.length; i += 10) {
          const batch = productIdsArray.slice(i, i + 10);
          productsQueries.push(query(productsCollection, where(documentId(), "in", batch)));
        }

        const productSnapshots = await Promise.all(productsQueries.map(q => getDocs(q)));
        const productsData = new Map<string, Product>();
        productSnapshots.forEach(snapshot => {
          snapshot.forEach(doc => {
            productsData.set(doc.id, doc.data() as Product);
          });
        });
        console.log("Fetched products data:", productsData); // Log fetched product data
        setProductsMap(productsData);
      }

    } catch (error) {
      console.error("Error fetching pending orders:", error);
      toast.error("Failed to fetch pending orders");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOrder = (orderId: string, isSelected: boolean) => {
    setSelectedOrderIds(prevSelected =>
      isSelected
        ? [...prevSelected, orderId]
        : prevSelected.filter(id => id !== orderId)
    );
  };

  const generatePrintableContent = (ordersToPrint: Order[]) => {
    let content = `
      <html>
      <head>
        <title>Order Backlog Report - Print</title>
        <style>
          body { font-family: sans-serif; margin: 20px; }
          .order-section { border: 1px solid #ccc; padding: 15px; margin-bottom: 20px; page-break-inside: avoid; }
          .order-section h3 { margin-top: 0; margin-bottom: 10px; }
          .customer-details { margin-bottom: 10px; }
          .customer-details div { margin-bottom: 5px; }
          .item-details { margin-top: 10px; }
          .item-details h4 { margin-top: 0; margin-bottom: 5px; }
          .item-table { width: 100%; border-collapse: collapse; margin-top: 5px; }
          .item-table th, .item-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .item-table th { background-color: #f2f2f2; }
          .item-table td:nth-child(1) { width: 15%; } /* Adjust quantity column width */
          .item-table td:nth-child(2) { width: 85%; } /* Adjust item name column width */
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .header h1 { margin: 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Order Backlog Report</h1>
          <div>Current Date: ${new Date().toLocaleDateString()}</div>
        </div>
    `;

    ordersToPrint.forEach((order, index) => {
      content += `
        <div class="order-section">
          <h3>Order #${index + 1}</h3>
          <div class="customer-details">
            <div><strong>Customer Name:</strong> ${order.customerName}</div>
            <div><strong>Customer Phone:</strong> ${order.customerPhone}</div>
            <div><strong>Delivery Address:</strong> ${order.deliveryAddress}</div>
          </div>
          <div class="item-details">
            <h4>Items:</h4>
            ${order.items && order.items.length > 0 ? (
              `<table class="item-table">
                <thead>
                  <tr>
                    <th>Qty</th>
                    <th>Item</th>
                  </tr>
                </thead>
                <tbody>
                  ${order.items.map(item => {
                    // Find the product for the current item to get the unit
                    const product = productsMap.get(item.productId || '');
                    const unit = product?.unit || ''; // Get the unit, default to empty string if not found
                    return `
                      <tr>
                        <td>${item.quantity}${unit ? ` ${unit}` : ''}</td>
                        <td>${item.name}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>`
            ) : (
              `<p>No items</p>`
            )}
          </div>
        </div>
      `;
    });

    content += `
      </body>
      </html>
    `;
    return content;
  };

  const handlePrintSelected = () => {
    if (selectedOrderIds.length === 0) {
      toast.info("Please select at least one order to print.");
      return;
    }

    const ordersToPrint = pendingOrders.filter(order => selectedOrderIds.includes(order.id));
    if (ordersToPrint.length === 0) {
      toast.error("Selected orders not found.");
      return;
    }

    const printableContent = generatePrintableContent(ordersToPrint);

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printableContent);
      printWindow.document.close();
      printWindow.print();
    } else {
      toast.error("Could not open print window. Please allow pop-ups.");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Order Backlog Report - Pending Orders</CardTitle>
        <div className="flex items-center gap-4 justify-between flex-wrap mt-4">
          <DatePickerWithRange date={date} setDate={setDate} />
          <div className="relative w-full max-w-xs ml-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order ID, customer name, or date..."
              className="pl-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handlePrintSelected} disabled={selectedOrderIds.length === 0}>
            Print Selected ({selectedOrderIds.length})
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Checkbox
                      checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedOrderIds(filteredOrders.map(order => order.id));
                        } else {
                          setSelectedOrderIds([]);
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Customer Phone</TableHead>
                  <TableHead>Delivery Address</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedOrderIds.includes(order.id)}
                        onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                      />
                    </TableCell>
                    <TableCell>{order.id}</TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>{order.customerPhone}</TableCell>
                    <TableCell>{order.deliveryAddress}</TableCell>
                    <TableCell>
                      {order.items && order.items.length > 0 ? (
                        <ul>
                          {order.items.map((item, index) => (
                            <li key={index}>{item.quantity} x {item.name} (@ ₹{item.price.toFixed(2)})</li>
                          ))}
                        </ul>
                      ) : (
                        "No items"
                      )}
                    </TableCell>
                    <TableCell>₹{order.total.toFixed(2)}</TableCell>
                    <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-muted-foreground">No pending orders found.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OrderBackLogReport;