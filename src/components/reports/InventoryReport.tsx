import React, { useState, useEffect } from 'react';
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { productsCollection } from "@/firebase";
import { query, getDocs, Timestamp } from "firebase/firestore";
import { Product, StockBatch } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ProductWithCalculated extends Product {
  totalCostPrice: number;
  unit?: string;
}

const InventoryReport = () => {
  const [allProducts, setAllProducts] = useState<ProductWithCalculated[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductWithCalculated[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalInventoryValue, setTotalInventoryValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        setIsLoading(true);
        const q = query(productsCollection);
        const querySnapshot = await getDocs(q);

        let calculatedTotalValue = 0;

        const productsData: ProductWithCalculated[] = querySnapshot.docs.map(doc => {
          const productData = doc.data();
          
          let createdAtString: string;
          if (productData.createdAt instanceof Timestamp) {
            createdAtString = productData.createdAt.toDate().toISOString();
          } else if (typeof productData.createdAt === 'number') {
             createdAtString = new Date(productData.createdAt).toISOString();
          } else if (typeof productData.createdAt === 'string') {
            createdAtString = productData.createdAt;
          } else {
             createdAtString = new Date().toISOString();
          }

          const totalCostPrice = (productData.stock_batches || []).reduce((sum: number, batch: StockBatch) => sum + (batch.quantity * batch.cost_price), 0);
          
          calculatedTotalValue += totalCostPrice;

          return {
            id: doc.id,
            ...productData as Product,
            createdAt: createdAtString,
            totalCostPrice,
            unit: productData.unit,
          } as ProductWithCalculated;
        });

        productsData.sort((a, b) => b.totalCostPrice - a.totalCostPrice);

        setAllProducts(productsData);
        setFilteredProducts(productsData);
        setTotalInventoryValue(calculatedTotalValue);

      } catch (error) {
        console.error("Error fetching inventory:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventory();
  }, []);

  useEffect(() => {
    const lowerCaseQuery = searchQuery.toLowerCase();
    const filtered = allProducts.filter(product => 
      product.name.toLowerCase().includes(lowerCaseQuery) ||
      product.category.toLowerCase().includes(lowerCaseQuery)
    );
    setFilteredProducts(filtered);
  }, [searchQuery, allProducts]);

  const getTotalStock = (product: Product): number => {
    if (product.stock_batches && product.stock_batches.length > 0) {
      return product.stock_batches.reduce((sum, batch) => sum + batch.quantity, 0);
    }
    return product.stock || 0;
  };

  if (isLoading) {
    return (
     
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary">Inventory Report</div>
        </div>
      
    );
  }

  return (
   
      <div className="container mx-auto py-6">
        <h2 className="text-2xl font-bold mb-4">Inventory Report</h2>
        <div className="mb-4 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-background pl-8"
            />
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold">Inventory Summary</CardTitle>
            <div className="text-lg font-medium">
               Total Value: ₹{totalInventoryValue.toFixed(2)}
            </div>
          </CardHeader>
          <Separator className="mb-4" />
          <CardContent>
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No inventory data found matching your search.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">S.No</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Current Stock</TableHead>
                      <TableHead className="text-right">Total Cost Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product, index) => (
                      <TableRow key={product.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell className="text-right">{getTotalStock(product)} {product.unit || 'items'}</TableCell>
                        <TableCell className="text-right">₹{product.totalCostPrice.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="text-right font-bold">Total Items in Stock:</TableCell>
                      <TableCell className="text-right font-bold">{filteredProducts.reduce((sum, product) => sum + getTotalStock(product), 0)}</TableCell>
                      <TableCell className="text-right font-bold">₹{filteredProducts.reduce((sum, product) => sum + product.totalCostPrice, 0).toFixed(2)}</TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

  );
};

export default InventoryReport;