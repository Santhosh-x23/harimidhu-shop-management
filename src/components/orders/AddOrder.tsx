import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { ArrowLeft, Plus, Save, Trash2, Search, Pencil, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { OrderItem, Customer, Product } from "@/types";
import { customersCollection, productsCollection, ordersCollection } from "@/firebase";
import { getDocs, query, where, orderBy, addDoc, updateDoc, doc, getDoc } from "firebase/firestore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const AddOrder = () => {
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
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
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [outstandingAmount, setOutstandingAmount] = useState<number>(0);
  const [outstandingNote, setOutstandingNote] = useState<string>("");
  
  useEffect(() => {
    fetchCustomersAndProducts();
  }, []);

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
        stock: doc.data().stock_batches?.reduce((sum: number, batch: any) => sum + batch.quantity, 0) || 0
      })) as Product[];

      console.log('Fetched products:', productsData); // Debug log
      setCustomers(customersData);
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch customers and products");
    } finally {
      setIsLoading(false);
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

  // Calculate grand total with shipping
  const grandTotal = total + shippingCost;

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

    // Get cost price from the first available stock batch (FIFO)
    let costPrice = 0;
    if (product.stock_batches && product.stock_batches.length > 0) {
      // Find the first batch with quantity > 0
      const firstBatch = product.stock_batches.find(batch => batch.quantity > 0);
      if (firstBatch) costPrice = firstBatch.cost_price;
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
              price: item.customPrice || product.price,
              costPrice: costPrice
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
        customPrice: null,
        costPrice: costPrice
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
      
      // Create order
      const orderData = {
        customerId,
        customerName: selectedCustomer.name,
        customerPhone: selectedCustomer.phone,
        deliveryAddress: selectedCustomer.address,
        items: items.map(item => ({
          ...item,
          originalPrice: products.find(p => p.id === item.productId)?.price || item.price,
          costPrice: item.costPrice
        })),
        total: grandTotal,
        shippingCost,
        // Only include outstanding amount if it's greater than 0
        ...(outstandingAmount > 0 ? { 
          outstandingAmount, 
          outstandingNote: outstandingNote || "Previous outstanding balance"
        } : {}),
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        latitude: customerData?.latitude || 0,
        longitude: customerData?.longitude || 0,
        customerGstin: customerData?.gstin || ""
      };

      const orderRef = await addDoc(ordersCollection, orderData);

      // Update product stocks
      const updatePromises = items.map(async (item) => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return;

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

        // Remove empty batches
        const filteredBatches = updatedBatches.filter(batch => batch.quantity > 0);

        await updateDoc(doc(productsCollection, product.id), {
          stock_batches: filteredBatches
        });
      });

      await Promise.all(updatePromises);

      toast.success("Order created successfully!");
      navigate("/orders");
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Failed to create order");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Create New Order">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Create New Order">
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
                      
                      <div className="flex w-full max-w-xs mt-2">
                        <div className="w-full flex items-center">
                          <div className="text-sm flex-1 flex items-center">
                            <span>Outstanding Amount:</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" className="h-6 w-6 p-0 ml-1">
                                    <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="max-w-xs text-xs">
                                    Enter any previous outstanding amount owed by the customer.
                                    This will be included in the invoice.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Input
                            id="outstandingAmount"
                            type="number"
                            min="0"
                            step="0.01"
                            value={outstandingAmount}
                            onChange={(e) => setOutstandingAmount(parseFloat(e.target.value) || 0)}
                            className="w-28 ml-4"
                          />
                        </div>
                      </div>
                      
                      {outstandingAmount > 0 && (
                        <div className="flex w-full max-w-xs mt-2">
                          <div className="w-full">
                            <Input
                              id="outstandingNote"
                              placeholder="Note about outstanding amount"
                              value={outstandingNote}
                              onChange={(e) => setOutstandingNote(e.target.value)}
                              className="w-full"
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="text-lg font-semibold flex justify-between w-full max-w-xs mt-2 pt-2 border-t">
                        <span>Grand Total:</span>
                        <span>₹{formatNumber(grandTotal)}</span>
                      </div>
                      
                      {outstandingAmount > 0 && (
                        <div className="text-lg font-semibold flex justify-between w-full max-w-xs mt-2 pt-2 text-red-600">
                          <span>Total with Outstanding:</span>
                          <span>₹{formatNumber(grandTotal + outstandingAmount)}</span>
                        </div>
                      )}
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
              {isSubmitting ? "Creating Order..." : "Create Order"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AddOrder;
