import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Search, Edit, Trash2, AlertTriangle, PackageOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Product, StockBatch } from '@/types'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { productsCollection } from '@/firebase'
import { getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore'
import { db } from '@/firebase'

const Products = () => {
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true)
        const productsQuery = query(productsCollection, orderBy('createdAt', 'desc'))
        const querySnapshot = await getDocs(productsQuery)
        
        const productsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString()
        } as Product))
        
        setProducts(productsData)
        setFilteredProducts(productsData)
      } catch (error) {
        console.error('Error fetching products:', error)
        toast.error('Failed to load products')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase()
    setSearchQuery(query)
    filterProducts(query, categoryFilter)
  }

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value)
    filterProducts(searchQuery, value)
  }

  const filterProducts = (query: string, category: string) => {
    let filtered = [...products]
    
    if (query.trim() !== '') {
      filtered = filtered.filter(
        product =>
          product.name.toLowerCase().includes(query) ||
          product.description.toLowerCase().includes(query)
      )
    }
    
    if (category !== 'all') {
      filtered = filtered.filter(product => product.category === category)
    }
    
    setFilteredProducts(filtered)
  }

  const getTotalStock = (product: Product): number => {
    if (product.stock_batches && product.stock_batches.length > 0) {
      return product.stock_batches.reduce((sum, batch) => sum + batch.quantity, 0)
    }
    return product.stock || 0
  }

  const getAverageCostPrice = (product: Product): number => {
    if (product.stock_batches && product.stock_batches.length > 0) {
      const totalCost = product.stock_batches.reduce(
        (sum, batch) => sum + (batch.quantity * batch.cost_price), 0
      )
      const totalQuantity = getTotalStock(product)
      return totalQuantity > 0 ? totalCost / totalQuantity : 0
    }
    return 0
  }

  const isLowStock = (product: Product): boolean => {
    return getTotalStock(product) <= 10
  }

  const handleDelete = async (product: Product) => {
    if (window.confirm(`Are you sure you want to delete ${product.name}?`)) {
      try {
        await deleteDoc(doc(db, 'products', product.id))
        setProducts(prevProducts => prevProducts.filter(p => p.id !== product.id))
        setFilteredProducts(prevFiltered => prevFiltered.filter(p => p.id !== product.id))
        toast.success(`Product "${product.name}" deleted successfully`)
      } catch (error) {
        console.error('Error deleting product:', error)
        toast.error('Failed to delete product')
      }
    }
  }

  const openStockDetails = (product: Product) => {
    setSelectedProduct(product)
  }

  const closeStockDetails = () => {
    setSelectedProduct(null)
  }

  // Get unique categories
  const categories = ['all', ...new Set(products.map((product) => product.category))]

  return (
    <DashboardLayout title="Products">
      <div className="flex flex-col gap-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-9"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
            <Select
              value={categoryFilter}
              onValueChange={handleCategoryChange}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Link to="/products/new">
              <Button className="w-full sm:w-auto gap-1 bg-organic-primary hover:bg-organic-dark">
                <Plus className="h-4 w-4" />
                Add New Product
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Products Grid */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>All Products</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard 
                    key={product.id} 
                    product={product} 
                    onViewStockDetails={() => openStockDetails(product)}
                    onDelete={() => handleDelete(product)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No products found matching your criteria.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stock Details Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={closeStockDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Stock Batches - {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              View all stock batches with their cost prices and quantities
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <h3 className="text-xs text-muted-foreground mb-1">Total Stock</h3>
              <p className="text-2xl font-semibold">
                {selectedProduct ? getTotalStock(selectedProduct) : 0}
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <h3 className="text-xs text-muted-foreground mb-1">Selling Price</h3>
              <p className="text-2xl font-semibold">
                ₹{selectedProduct?.price.toFixed(2)}
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4 text-center">
              <h3 className="text-xs text-muted-foreground mb-1">Avg. Cost Price</h3>
              <p className="text-2xl font-semibold">
                ₹{selectedProduct ? getAverageCostPrice(selectedProduct).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
          
          {selectedProduct?.stock_batches && selectedProduct.stock_batches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Cost Price</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedProduct.stock_batches.map((batch) => {
                  const margin = ((selectedProduct.price - batch.cost_price) / selectedProduct.price) * 100
                  return (
                    <TableRow key={batch.id}>
                      <TableCell>{new Date(batch.date_added).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">{batch.quantity}</TableCell>
                      <TableCell className="text-right">₹{batch.cost_price.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        ₹{(batch.quantity * batch.cost_price).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={margin < 20 ? 'text-red-500' : margin < 30 ? 'text-amber-500' : 'text-green-600'}>
                          {margin.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-6 border rounded-md bg-muted/50">
              {selectedProduct?.stock ? (
                <p className="text-muted-foreground">
                  Legacy stock data: {selectedProduct.stock} units
                </p>
              ) : (
                <p className="text-muted-foreground">No stock batches available for this product.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

interface ProductCardProps {
  product: Product
  onViewStockDetails: () => void
  onDelete: () => void
}

const ProductCard = ({ product, onViewStockDetails, onDelete }: ProductCardProps) => {
  const totalStock = product.stock_batches
    ? product.stock_batches.reduce((sum, batch) => sum + batch.quantity, 0)
    : product.stock || 0
    
  const isLowStock = totalStock <= 10
  
  return (
    <div className="group flex flex-col border rounded-lg overflow-hidden transition-all hover:shadow-md">
      <div className="relative h-48 bg-muted">
        <img
          src={product.image}
          alt={product.name}
          className="object-cover w-full h-full"
        />
        {isLowStock && (
          <div className="absolute top-2 right-2 bg-red-100 text-red-800 text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Low Stock
          </div>
        )}
      </div>
      
      <div className="flex-1 p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-medium text-lg">{product.name}</h3>
          <span className="text-organic-primary font-semibold">₹{product.price}</span>
        </div>
        
        <p className="text-muted-foreground text-sm mb-3 line-clamp-2">{product.description}</p>
        
        <div className="flex justify-between items-center">
          <span className={cn(
            'text-xs px-2 py-1 rounded-full',
            product.category === 'Oil' && 'bg-yellow-100 text-yellow-800',
            product.category === 'Rice' && 'bg-amber-100 text-amber-800',
            product.category === 'Millet' && 'bg-orange-100 text-orange-800',
            product.category === 'Provisions' && 'bg-green-100 text-green-800',
            product.category === 'Homemade Soaps' && 'bg-purple-100 text-purple-800',
            product.category === 'Chekku Raw Materials' && 'bg-blue-100 text-blue-800',
          )}>
            {product.category}
          </span>
          
          <span className={cn(
            'text-xs font-medium',
            isLowStock ? 'text-red-600' : 'text-muted-foreground'
          )}>
            Stock: {totalStock}
          </span>
        </div>
      </div>
      
      <div className="border-t p-3 flex justify-between">
        <div className="flex gap-2">
          <Link to={`/products/edit/${product.id}`}>
            <Button variant="outline" size="sm" className="gap-1">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-1"
            onClick={onViewStockDetails}
          >
            <PackageOpen className="h-4 w-4" />
            Stock
          </Button>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1 text-destructive border-destructive hover:bg-destructive/10"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
      </div>
    </div>
  )
}

export default Products
