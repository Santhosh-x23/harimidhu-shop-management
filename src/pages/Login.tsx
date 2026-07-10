import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, LogIn } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

const Login = () => {
  const { login, currentUser } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  // If user is already logged in, redirect to dashboard
  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    // Validate email domain
    if (formData.email !== "harimidhuorganic@gmail.com") {
      toast.error("Only Harimidhu Organic Admin is allowed to login");
      return;
    }
    
    setIsLoading(true);
    
    try {
      await login(formData.email, formData.password);
      // No need to navigate here as it's handled in the auth context
    } catch (error: any) {
      toast.error(error.message || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-amber-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-organic-primary">
            Harimidhu<span className="text-organic-secondary">Organic</span>
          </h1>
          <p className="text-muted-foreground mt-2">Shop Management System</p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Admin Login</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <a 
                    href="#" 
                    className="text-xs text-organic-primary hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      toast.info("Please contact your administrator to reset your password");
                    }}
                  >
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full gap-2 bg-organic-primary hover:bg-organic-dark"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {isLoading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center text-center text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <KeyRound className="h-3 w-3" />
              <span>Access restricted to Harimidhu Organic Admin</span>
            </div>
          </CardFooter>
        </Card>
        
        <p className="text-center text-sm text-muted-foreground mt-6">
          © 2025 Harimidhu Organic. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;
