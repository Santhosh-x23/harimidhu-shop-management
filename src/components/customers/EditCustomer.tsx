import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase";
import { Customer } from "@/types";

const EditCustomer = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    latitude: 0,
    longitude: 0,
    gstin: ""
  });
  const [coordinates, setCoordinates] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const customerDoc = await getDoc(doc(db, "customers", id));
        
        if (customerDoc.exists()) {
          const data = customerDoc.data();
          setFormData({
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            address: data.address || "",
            latitude: data.latitude || 0,
            longitude: data.longitude || 0,
            gstin: data.gstin || ""
          });
          setCoordinates(`${data.latitude || ''}, ${data.longitude || ''}`);
        } else {
          toast.error("Customer not found");
          navigate("/customers");
        }
      } catch (error) {
        console.error("Error fetching customer:", error);
        toast.error("Failed to load customer details");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomer();
  }, [id, navigate]);

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
    
    if (!id) return;
    
    try {
      setIsSaving(true);
      
      // Update customer in Firebase
      await updateDoc(doc(db, "customers", id), {
        ...formData,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        updatedAt: serverTimestamp()
      });
      
      toast.success("Customer updated successfully!");
      navigate(`/customers/${id}`);
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error("Failed to update customer. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Edit Customer">
        <div className="flex justify-center items-center h-40">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Edit Customer">
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Link to={`/customers/${id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Customer
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Edit Customer Information</CardTitle>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    Current values: Latitude: {formData.latitude}, Longitude: {formData.longitude}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  className="gap-2 bg-organic-primary hover:bg-organic-dark"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Update Customer
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

export default EditCustomer; 