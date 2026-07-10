import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { ArrowLeft, Plus, Save, Trash2, Search, Pencil, InfoIcon, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { OrderItem, Customer, Product, Order } from "@/types";
import { customersCollection, productsCollection, ordersCollection } from "@/firebase";
import { getDocs, query, where, orderBy, updateDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const EditOrder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState<string>("");
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [originalItems, setOriginalItems] = useState<OrderItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editedPrice, setEditedPrice] = useState<number>(0);
  const [status, setStatus] = useState<string>("pending");
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [outstandingAmount, setOutstandingAmount] = useState<number>(0);
  const [includeOutstanding, setIncludeOutstanding] = useState<boolean>(true);
  const [outstandingNote, setOutstandingNote] = useState<string>("");
  
  useEffect(() => {
    if (id) {
      setOrderId(id);
      Promise.all([
        fetchOrderDetails(id),
        fetchCustomersAndProducts()
      ]);
    } else {
      toast.error("Order ID not found");
      navigate("/orders");
    }
  }, [id]);

  const fetchOrderDetails = async (orderId: string) => {
    try {
      setIsLoading(true);
      const orderDoc = await getDoc(doc(ordersCollection, orderId));
      
      if (orderDoc.exists()) {
        const data = orderDoc.data() as Order;
        setCustomerId(data.customerId || "");
        setItems(data.items);
        setOriginalItems(data.items ? [...data.items] : []);
        setStatus(data.status || "pending");
        setShippingCost(data.shippingCost || 0);
        setOutstandingAmount(data.outstandingAmount || 0);
        setIncludeOutstanding(data.includeOutstanding !== false); // default to true if not set
        setOutstandingNote(data.outstandingNote || "");
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

  const fetchCustomersAndProducts = async () => {
    try {
      setIsLoading(true);
      const [customersSnapshot, productsSnapshot] = await Promise.all([
        getDocs(customersCollection),
        getDocs(productsCollection)
      ]);

      const customersData = customersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Customer[];

      const productsData = productsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        stock: doc.data().stock_batches?.reduce((sum: number, batch: { quantity: number }) => sum + batch.quantity, 0) || 0
      })) as Product[];

      setCustomers(customersData);
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch customers and products");
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone.includes(customerSearch)
  );

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearch.toLowerCase()) &&
    (product.stock || 0) > 0
  );

  // Calculate total
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Calculate grand total with shipping and outstanding amount
  const grandTotal = total + shippingCost + (includeOutstanding ? outstandingAmount : 0);

  // Format number to display with 2 decimal places
  const formatNumber = (num: number) => {
    return num.toFixed(2);
  };

  const handleAddItem = () => {
    if (!selectedProduct || quantity <= 0) {
      toast.error("Please select a product and valid quantity");
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const availableStock = product.stock || 0;
    if (availableStock < quantity) {
      toast.error(`Only ${formatNumber(availableStock)} items available in stock`);
      return;
    }

    // Check if product already in items
    const existingItem = items.find(item => item.productId === selectedProduct);
    
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (availableStock < newQuantity) {
        toast.error(`Only ${formatNumber(availableStock)} items available in stock`);
        return;
      }
      
      // Update quantity of existing item
      setItems(items.map(item => 
        item.productId === selectedProduct 
          ? { 
              ...item, 
              quantity: newQuantity,
              price: item.customPrice || product.price
            } 
          : item
      ));
    } else {
      // Add new item
      const newItem: OrderItem = {
        productId: product.id,
        name: product.name,
        quantity: quantity,
        price: product.price,
        originalPrice: product.price,
        customPrice: null
      };
      
      setItems([...items, newItem]);
    }
    
    // Reset selection
    setSelectedProduct("");
    setQuantity(1);
    setProductSearch("");
  };

  const handleRemoveItem = (productId: string) => {
    setItems(items.filter(item => item.productId !== productId));
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setQuantity(isNaN(value) ? 1 : value);
  };

  const handleStartEditPrice = (productId: string) => {
    const item = items.find(i => i.productId === productId);
    if (item) {
      setEditingItemId(productId);
      setEditedPrice(item.price);
    }
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setEditedPrice(isNaN(value) || value < 0 ? 0 : value);
  };

  const handleSavePrice = (productId: string) => {
    if (editedPrice < 0) {
      toast.error("Price cannot be negative");
      return;
    }

    setItems(items.map(item => 
      item.productId === productId 
        ? { 
            ...item, 
            price: editedPrice,
            customPrice: editedPrice
          } 
        : item
    ));
    
    setEditingItemId(null);
    toast.success("Price updated for this order");
  };

  const handleCancelEditPrice = () => {
    setEditingItemId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    
    if (items.length === 0) {
      toast.error("Please add at least one product to the order");
      return;
    }

    try {
      setIsSubmitting(true);

      // Get selected customer
      const selectedCustomer = customers.find(c => c.id === customerId);
      if (!selectedCustomer) {
        toast.error("Customer not found");
        return;
      }

      // Get customer data to include latitude and longitude
      const customerDoc = await getDoc(doc(customersCollection, selectedCustomer.id));
      const customerData = customerDoc.data();
      
      // Create order update data
      const orderData = {
        customerId,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        deliveryAddress: selectedCustomer.address,
        items: items.map(item => ({
          ...item,
          originalPrice: products.find(p => p.id === item.productId)?.price || item.price
        })),
        total: grandTotal,
        shippingCost,
        status,
        updatedAt: new Date().toISOString(),
        latitude: customerData?.latitude || 0,
        longitude: customerData?.longitude || 0,
        outstandingAmount,
        includeOutstanding,
        outstandingNote
      };

      // Update the order
      await updateDoc(doc(ordersCollection, orderId), orderData);

      // Update product stocks - handle the inventory changes based on what changed
      const stockUpdatePromises = [];

      // Track removed items (need to add back to stock)
      const removedItems = originalItems.filter(
        original => !items.some(current => current.productId === original.productId)
      );

      // Add back stock for removed items
      for (const item of removedItems) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;

        const updatedBatches = [...(product.stock_batches || [])];
        
        // Add quantity back to the first batch
        if (updatedBatches.length > 0) {
          updatedBatches[0].quantity += item.quantity;
        } else {
          // Create new batch if none exists
          updatedBatches.push({
            id: new Date().toISOString(),
            quantity: item.quantity,
            cost_price: product.price,
            date_added: new Date().toISOString()
          });
        }

        stockUpdatePromises.push(
          updateDoc(doc(productsCollection, product.id), {
            stock_batches: updatedBatches
          })
        );
      }

      // Handle quantity changes for existing items
      for (const currentItem of items) {
        const originalItem = originalItems.find(item => item.productId === currentItem.productId);
        
        // Skip if new item (will be handled separately)
        if (!originalItem) continue;
        
        // If quantity changed, adjust stock accordingly
        if (currentItem.quantity !== originalItem.quantity) {
          const quantityDiff = originalItem.quantity - currentItem.quantity;
          
          // Skip if no change
          if (quantityDiff === 0) continue;
          
          const product = products.find(p => p.id === currentItem.productId);
          if (!product) continue;
          
          const updatedBatches = [...(product.stock_batches || [])];
          
          if (quantityDiff > 0) {
            // Customer is ordering less now, add stock back
            if (updatedBatches.length > 0) {
              updatedBatches[0].quantity += quantityDiff;
            } else {
              updatedBatches.push({
                id: new Date().toISOString(),
                quantity: quantityDiff,
                cost_price: product.price,
                date_added: new Date().toISOString()
              });
            }
          } else {
            // Customer is ordering more, remove from stock using FIFO
            let remainingToRemove = -quantityDiff;
            
            for (let i = 0; i < updatedBatches.length && remainingToRemove > 0; i++) {
              const batch = updatedBatches[i];
              if (batch.quantity > remainingToRemove) {
                batch.quantity -= remainingToRemove;
                remainingToRemove = 0;
              } else {
                remainingToRemove -= batch.quantity;
                batch.quantity = 0;
              }
            }
            
            // Check if we had enough stock
            if (remainingToRemove > 0) {
              toast.error(`Not enough stock for ${product.name}`);
              return;
            }
          }
          
          // Remove empty batches
          const filteredBatches = updatedBatches.filter(batch => batch.quantity > 0);
          
          stockUpdatePromises.push(
            updateDoc(doc(productsCollection, product.id), {
              stock_batches: filteredBatches
            })
          );
        }
      }
      
      // Handle new items (need to remove from stock)
      const newItems = items.filter(
        current => !originalItems.some(original => original.productId === current.productId)
      );
      
      for (const item of newItems) {
        const product = products.find(p => p.id === item.productId);
        if (!product) continue;
        
        // Update stock_batches using FIFO
        const updatedBatches = [...(product.stock_batches || [])];
        let remainingQuantity = item.quantity;
        
        for (let i = 0; i < updatedBatches.length && remainingQuantity > 0; i++) {
          const batch = updatedBatches[i];
          if (batch.quantity > remainingQuantity) {
            batch.quantity -= remainingQuantity;
            remainingQuantity = 0;
          } else {
            remainingQuantity -= batch.quantity;
            batch.quantity = 0;
          }
        }
        
        // Check if we had enough stock
        if (remainingQuantity > 0) {
          toast.error(`Not enough stock for ${product.name}`);
          return;
        }
        
        // Remove empty batches
        const filteredBatches = updatedBatches.filter(batch => batch.quantity > 0);
        
        stockUpdatePromises.push(
          updateDoc(doc(productsCollection, product.id), {
            stock_batches: filteredBatches
          })
        );
      }

      await Promise.all(stockUpdatePromises);

      toast.success("Order updated successfully!");
      navigate("/orders");
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Edit Order">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Edit Order">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Link to="/orders">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Orders
            </Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Selection */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Customer Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer">
                      Select Customer <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search customers..."
                        className="pl-9"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                      />
                    </div>
                    <Select 
                      value={customerId}
                      onValueChange={setCustomerId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredCustomers.map(customer => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} - {customer.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {customerId && (
                    <div className="rounded-md border p-4 mt-4">
                      <h3 className="font-medium mb-2">Selected Customer:</h3>
                      {(() => {
                        const customer = customers.find(c => c.id === customerId);
                        return customer ? (
                          <div className="space-y-1 text-sm">
                            <p><span className="font-medium">Name:</span> {customer.name}</p>
                            <p><span className="font-medium">Email:</span> {customer.email}</p>
                            <p><span className="font-medium">Phone:</span> {customer.phone}</p>
                            <p><span className="font-medium">Address:</span> {customer.address}</p>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}

                  <div className="space-y-2 mt-4">
                    <Label htmlFor="status">
                      Order Status <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={status}
                      onValueChange={setStatus}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="out-for-delivery">Out for Delivery</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="rounded-md border p-4 mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">Outstanding Amount</h3>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <InfoIcon className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-72">
                              <p>Add any outstanding or previous balance that the customer needs to pay.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {outstandingAmount > 0 && (
                        <Badge className={`flex items-center gap-1 ${includeOutstanding ? 'bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'}`}>
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {includeOutstanding ? 'Included' : 'Not included'}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="include-outstanding" 
                          checked={includeOutstanding}
                          onCheckedChange={setIncludeOutstanding}
                        />
                        <Label htmlFor="include-outstanding" className={includeOutstanding ? "text-amber-800" : ""}>
                          {includeOutstanding ? "Included in total" : "Not included in total"}
                        </Label>
                      </div>

                      <div className="flex items-center">
                        <span className="mr-2">₹</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={outstandingAmount}
                          onChange={(e) => setOutstandingAmount(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className={outstandingAmount > 0 && includeOutstanding ? "border-amber-300" : ""}
                        />
                      </div>

                      <Input
                        placeholder="Note about outstanding amount (optional)"
                        value={outstandingNote}
                        onChange={(e) => setOutstandingNote(e.target.value)}
                      />
                      
                      {outstandingAmount > 0 && (
                        <div className={`text-sm p-2 rounded-md ${includeOutstanding ? 'bg-amber-50 text-amber-800' : 'bg-gray-50 text-gray-700'}`}>
                          <span className="font-medium">Summary:</span> Outstanding amount of ₹{outstandingAmount.toFixed(2)} will be {includeOutstanding ? 'added to' : 'tracked separately from'} the order total.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Add Product Form */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search products..."
                          className="pl-9"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                        />
                      </div>
                      <Select 
                        value={selectedProduct}
                        onValueChange={setSelectedProduct}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredProducts.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - ₹{product.price} (Stock: {formatNumber(product.stock || 0)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="w-full sm:w-24">
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={quantity}
                        onChange={handleQuantityChange}
                        placeholder="Qty"
                      />
                    </div>
                    
                    <Button 
                      type="button" 
                      onClick={handleAddItem}
                      className="gap-2 bg-organic-primary hover:bg-organic-dark"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  
                  {/* Items Table */}
                  {items.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.productId}>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="text-right">
                              {editingItemId === item.productId ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editedPrice}
                                  onChange={handlePriceChange}
                                  className="w-24 ml-auto"
                                />
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <span className={item.customPrice ? "line-through text-xs text-muted-foreground" : "hidden"}>
                                    ₹{item.originalPrice?.toFixed(2)}
                                  </span>
                                  <span className={item.customPrice ? "text-organic-primary font-medium" : ""}>
                                    ₹{formatNumber(item.price)}
                                  </span>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(item.quantity)}</TableCell>
                            <TableCell className="text-right font-medium">₹{formatNumber(item.price * item.quantity)}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                {editingItemId === item.productId ? (
                                  <>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={() => handleSavePrice(item.productId)}
                                      className="h-7 w-7 text-green-600"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M20 6 9 17l-5-5"></path></svg>
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      onClick={handleCancelEditPrice}
                                      className="h-7 w-7 text-destructive"
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleStartEditPrice(item.productId)}
                                      className="h-7 w-7"
                                    >
                                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleRemoveItem(item.productId)}
                                      className="h-7 w-7"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-10 border rounded-md bg-muted/50">
                      <p className="text-muted-foreground">No items added to this order yet.</p>
                    </div>
                  )}
                  
                  {/* Order Summary */}
                  {items.length > 0 && (
                    <div className="flex flex-col gap-2 items-end pt-4 border-t">
                      <div className="text-lg font-medium flex justify-between w-full max-w-xs">
                        <span>Subtotal:</span>
                        <span>₹{formatNumber(total)}</span>
                      </div>
                      
                      <div className="flex w-full max-w-xs mt-2">
                        <div className="w-full flex items-center">
                          <label htmlFor="shippingCost" className="text-sm flex-1">
                            Shipping Cost:
                          </label>
                          <Input
                            id="shippingCost"
                            type="number"
                            min="0"
                            step="0.01"
                            value={shippingCost}
                            onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                            className="w-28 ml-4"
                          />
                        </div>
                      </div>

                      {outstandingAmount > 0 && (
                        <div className="flex justify-between w-full max-w-xs mt-2">
                          <span className="text-sm flex-1">Outstanding Amount:</span>
                          <span className={`${includeOutstanding ? 'text-amber-600' : 'text-muted-foreground line-through'}`}>
                            ₹{formatNumber(outstandingAmount)}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-lg font-semibold flex justify-between w-full max-w-xs mt-2 pt-2 border-t">
                        <span>Grand Total:</span>
                        <span>₹{formatNumber(grandTotal)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end mt-6">
            <Button 
              type="submit" 
              size="lg"
              className="gap-2 bg-organic-primary hover:bg-organic-dark"
              disabled={!customerId || items.length === 0 || isSubmitting}
            >
              <Save className="h-4 w-4" />
              {isSubmitting ? "Updating Order..." : "Update Order"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default EditOrder; 