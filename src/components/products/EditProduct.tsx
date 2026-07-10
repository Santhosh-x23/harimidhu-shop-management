import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Product, StockBatch } from "@/types";
import StockBatchManager from "@/components/products/StockBatchManager";
import { productsCollection } from "@/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { uploadImageToSupabase } from "@/lib/supabase";

// Extended Product type with unit field
interface ExtendedProduct extends Omit<Product, "id" | "createdAt"> {
  unit: string;
}

const EditProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState<Omit<ExtendedProduct, "stock_batches">>({
    name: "",
    description: "",
    price: 0,
    category: "",
    image: "",
    unit: "Kilogram",
  });
  const [stockBatches, setStockBatches] = useState<StockBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isEditingBatch, setIsEditingBatch] = useState(false);
  
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const productDoc = await getDoc(doc(productsCollection, id));
        
        if (!productDoc.exists()) {
          toast.error("Product not found");
          navigate("/products");
          return;
        }

        const productData = productDoc.data() as ExtendedProduct;
        setFormData({
          name: productData.name,
          description: productData.description,
          price: productData.price,
          category: productData.category,
          image: productData.image,
          unit: productData.unit || "Kilogram",
        });
        
        if (productData.stock_batches) {
          // Ensure we work with ISO date strings in the UI
          const batchesWithISODates = productData.stock_batches.map(batch => {
            // Check if date_added is already in ISO format
            if (typeof batch.date_added === 'string' && 
                batch.date_added.match(/^\d{4}-\d{2}-\d{2}T/)) {
              return batch;
            }
            
            // Convert date format (DD/MM/YY) back to ISO string
            try {
              const parts = batch.date_added.split('/');
              if (parts.length === 3) {
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1; // Month is 0-based in JS Date
                const year = 2000 + parseInt(parts[2]); // Assume 20xx for 2-digit years
                const dateObj = new Date(year, month, day);
                return {
                  ...batch,
                  date_added: dateObj.toISOString()
                };
              }
            } catch (error) {
              console.error("Error parsing date:", error);
            }
            
            // Fallback to current date if parsing fails
            return {
              ...batch,
              date_added: new Date().toISOString()
            };
          });
          
          setStockBatches(batchesWithISODates);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
        toast.error("Failed to load product");
        navigate("/products");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [id, navigate]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "price" ? Number(value) : value,
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset error
    setUploadError("");
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Image size exceeds 2MB limit");
      toast.error("Image size exceeds 2MB limit");
      return;
    }

    try {
      setIsLoading(true);
      const imageUrl = await uploadImageToSupabase(file);
      setFormData(prev => ({
        ...prev,
        image: imageUrl
      }));
      toast.success("Image uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      setUploadError(error instanceof Error ? error.message : "Failed to upload image");
      toast.error(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditingBatch) {
      toast.error("Please save or cancel your stock batch changes first");
      return;
    }
    
    if (!formData.name || !formData.price || !formData.category) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setIsSaving(true);
      
      // Format dates in stock batches to DD/MM/YY format
      const formattedStockBatches = stockBatches.map(batch => {
        // Convert the ISO string date to a Date object
        const dateObj = new Date(batch.date_added);
        
        // Format as DD/MM/YY
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = String(dateObj.getFullYear()).slice(-2);
        
        return {
          ...batch,
          date_added: `${day}/${month}/${year}`
        };
      });
      
      const productData = {
        ...formData,
        stock_batches: formattedStockBatches,
        updatedAt: serverTimestamp()
      };

      await updateDoc(doc(productsCollection, id), productData);
      
      toast.success("Product updated successfully!");
      navigate("/products");
    } catch (error) {
      console.error("Error updating product:", error);
      toast.error("Failed to update product");
    } finally {
      setIsSaving(false);
    }
  };

  // Get unique categories for the dropdown
  const categories = ["Oil", "Rice", "Millet", "Provisions", "Homemade Soaps", "Chekku Raw Materials"];

  if (isLoading) {
    return (
      <DashboardLayout title="Edit Product">
        <div className="flex justify-center items-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Edit Product">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Link to="/products">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Products
            </Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Edit Product Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter product name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">
                    Selling Price (₹) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => handleSelectChange("category", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">
                    Unit <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select unit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Kilogram">Kilogram</SelectItem>
                      <SelectItem value="Litre">Litre</SelectItem>
                      <SelectItem value="Piece">Piece</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image">
                    Image <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="image"
                    name="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isLoading}
                  />
                  {uploadError && <p className="text-xs text-destructive mt-1">{uploadError}</p>}
                  {formData.image && (
                    <div className="mt-2">
                      <img 
                        src={formData.image} 
                        alt="Product preview" 
                        className="w-32 h-32 object-cover rounded-md"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">
                    Description <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Enter product description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Batch Manager */}
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Stock Batches</CardTitle>
              </CardHeader>
              <CardContent>
                <StockBatchManager
                  batches={stockBatches}
                  onChange={setStockBatches}
                  onEditStatusChange={setIsEditingBatch}
                />
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              className="gap-2 bg-organic-primary hover:bg-organic-dark"
              disabled={isSaving || isEditingBatch}
            >
              <Save className="h-4 w-4" />
              {isSaving ? "Saving..." : "Update Product"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default EditProduct;
