import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { ArrowLeft, Save, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import StockBatchManager from "@/components/products/StockBatchManager";
import { StockBatch } from "@/types";
import { productsCollection } from "@/firebase";
import { addDoc, serverTimestamp } from "firebase/firestore";
import { uploadImageToSupabase } from "@/lib/supabase";

const AddProduct = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    image: "",
    unit: "Kilogram", // Default unit
  });
  const [stockBatches, setStockBatches] = useState<StockBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditingBatch, setIsEditingBatch] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      category: value,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Reset error
    setUploadError('');
    
    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image size exceeds 2MB limit');
      toast.error('Image size exceeds 2MB limit');
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
      setUploadError(error instanceof Error ? error.message : 'Failed to upload image');
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
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
    
    if (!formData.name || !formData.price || !formData.category || !formData.image) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setIsLoading(true);
      
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
        price: parseFloat(formData.price),
        stock_batches: formattedStockBatches,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(productsCollection, productData);
      
      toast.success("Product added successfully!");
      navigate("/products");
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("Failed to add product");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout title="Add New Product">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Link to="/products">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Products
            </Button>
          </Link>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Product Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">
                        Product Name <span className="text-destructive">*</span>
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
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        placeholder="Enter product description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          placeholder="Enter selling price"
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
                          onValueChange={handleSelectChange}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Oil">Oil</SelectItem>
                            <SelectItem value="Rice">Rice</SelectItem>
                            <SelectItem value="Millet">Millet</SelectItem>
                            <SelectItem value="Provisions">Provisions</SelectItem>
                            <SelectItem value="Homemade Soaps">Homemade Soaps</SelectItem>
                            <SelectItem value="Chekku Raw Materials">Chekku Raw Materials</SelectItem>
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
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Product Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center gap-4">
                    <div className="border rounded-md w-full aspect-square flex items-center justify-center bg-muted overflow-hidden">
                      {formData.image ? (
                        <img 
                          src={formData.image} 
                          alt="Product preview" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-muted-foreground text-center p-4">
                          <Upload className="h-8 w-8 mx-auto mb-2" />
                          <p>No image uploaded</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full">
                      <Label htmlFor="image" className="mb-2 block">Upload Image</Label>
                      <Input
                        id="image"
                        name="image"
                        type="file"
                        accept="image/*"
                        className="cursor-pointer"
                        onChange={handleImageUpload}
                        disabled={isLoading}
                      />
                      {uploadError && <p className="text-xs text-destructive mt-1">{uploadError}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended size: 600x600px. Max size: 2MB
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stock Batch Manager */}
            <StockBatchManager 
              batches={stockBatches}
              onChange={setStockBatches}
              onEditStatusChange={setIsEditingBatch}
            />
          </div>
          
          {/* Submit Button */}
          <div className="flex justify-end mt-6">
            <Button 
              type="submit" 
              size="lg"
              className="gap-2 bg-organic-primary hover:bg-organic-dark"
              disabled={isLoading || isEditingBatch}
            >
              <Save className="h-4 w-4" />
              {isLoading ? "Saving..." : "Save Product"}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default AddProduct;
