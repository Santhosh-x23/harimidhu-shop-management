import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "react-router-dom";
import { customersCollection } from "@/firebase";
import { addDoc, serverTimestamp } from "firebase/firestore";

const AddCustomer = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    latitude: null,
    longitude: null,
    gstin: ""
  });
  const [coordinates, setCoordinates] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCoordinatesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCoordinates(value);
    
    // Automatically extract latitude and longitude if in format "lat, long"
    const parts = value.split(',').map(part => part.trim());
    if (parts.length === 2) {
      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        setFormData(prev => ({
          ...prev,
          latitude: lat,
          longitude: lng
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form - only name and phone are required
    if (!formData.name || !formData.phone) {
      toast.error("Please fill all required fields");
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Add customer to Firebase
      await addDoc(customersCollection, {
        ...formData,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        createdAt: serverTimestamp()
      });
      
      toast.success("Customer added successfully!");
      navigate("/customers");
    } catch (error) {
      console.error("Error adding customer:", error);
      toast.error("Failed to add customer. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardLayout title="Add New Customer">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Link to="/customers">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Customers
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter customer name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter email address"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstin">
                    GSTIN
                  </Label>
                  <Input
                    id="gstin"
                    name="gstin"
                    placeholder="Enter GSTIN (optional)"
                    value={formData.gstin}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    name="address"
                    placeholder="Enter complete address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="coordinates">Coordinates (Latitude, Longitude)</Label>
                  <Input
                    id="coordinates"
                    name="coordinates"
                    placeholder="e.g. 13.11973153117644, 80.15038241763571"
                    value={coordinates}
                    onChange={handleCoordinatesChange}
                  />
                  {(formData.latitude || formData.longitude) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Current values: Latitude: {formData.latitude}, Longitude: {formData.longitude}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  className="gap-2 bg-organic-primary hover:bg-organic-dark"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Customer
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AddCustomer;
