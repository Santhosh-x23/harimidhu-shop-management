import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, SortAsc, SortDesc, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Customer } from "@/types";
import { customersCollection } from "@/firebase";
import { getDocs, deleteDoc, doc, collection, query, orderBy } from "firebase/firestore";
import { db } from "@/firebase";
import { toast } from "sonner";

// Filter types
type SortOption = "a-z" | "z-a" | "recent" | "oldest";

const Customers = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>("recent");

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setIsLoading(true);
        const customersQuery = query(customersCollection, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(customersQuery);
        
        const customersData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.().toISOString() || new Date().toISOString()
        } as Customer));
        
        setCustomers(customersData);
        applyFilters(customersData, searchQuery, sortOption);
      } catch (error) {
        console.error("Error fetching customers:", error);
        toast.error("Failed to load customers");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Apply both search and sort filters
  const applyFilters = (data: Customer[], search: string, sort: SortOption) => {
    let filtered = [...data];
    
    // Apply search filter
    if (search.trim() !== "") {
      filtered = filtered.filter(
        customer =>
          customer.name.toLowerCase().includes(search.toLowerCase()) ||
          (customer.email && customer.email.toLowerCase().includes(search.toLowerCase())) ||
          customer.phone.includes(search)
      );
    }
    
    // Apply sort filter
    switch (sort) {
      case "a-z":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "z-a":
        filtered.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "recent":
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
    }
    
    setFilteredCustomers(filtered);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    applyFilters(customers, query, sortOption);
  };

  const handleSortChange = (option: SortOption) => {
    setSortOption(option);
    applyFilters(customers, searchQuery, option);
  };

  const handleDeleteCustomer = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        await deleteDoc(doc(db, "customers", id));
        const updatedCustomers = customers.filter(customer => customer.id !== id);
        setCustomers(updatedCustomers);
        applyFilters(updatedCustomers, searchQuery, sortOption);
        toast.success("Customer deleted successfully");
      } catch (error) {
        console.error("Error deleting customer:", error);
        toast.error("Failed to delete customer");
      }
    }
  };

  const handleViewCustomer = (id: string) => {
    navigate(`/customers/${id}`);
  };

  const handleEditCustomer = (id: string) => {
    navigate(`/customers/edit/${id}`);
  };

  // Format date to DD/MM/YY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  return (
    <DashboardLayout title="Customers">
      <div className="flex flex-col gap-6">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                className="pl-9 w-full sm:w-80"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
            
            {/* Sort options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  {sortOption === "a-z" && <SortAsc className="mr-2 h-4 w-4" />}
                  {sortOption === "z-a" && <SortDesc className="mr-2 h-4 w-4" />}
                  {(sortOption === "recent" || sortOption === "oldest") && <Clock className="mr-2 h-4 w-4" />}
                  {sortOption === "a-z" && "Name (A-Z)"}
                  {sortOption === "z-a" && "Name (Z-A)"}
                  {sortOption === "recent" && "Most Recent"}
                  {sortOption === "oldest" && "Oldest First"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleSortChange("a-z")}>
                  <SortAsc className="mr-2 h-4 w-4" />
                  Name (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("z-a")}>
                  <SortDesc className="mr-2 h-4 w-4" />
                  Name (Z-A)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("recent")}>
                  <Clock className="mr-2 h-4 w-4" />
                  Most Recent
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleSortChange("oldest")}>
                  <Clock className="mr-2 h-4 w-4" />
                  Oldest First
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <Link to="/customers/new">
            <Button className="w-full sm:w-auto gap-1 bg-organic-primary hover:bg-organic-dark">
              <Plus className="h-4 w-4" />
              Add New Customer
            </Button>
          </Link>
        </div>
        
        {/* Customers Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>All Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
              </div>
            ) : filteredCustomers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Added On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.email || "-"}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={customer.address}>
                        {customer.address || "-"}
                      </TableCell>
                      <TableCell>
                        {formatDate(customer.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="flex items-center gap-2"
                              onClick={() => handleViewCustomer(customer.id)}
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="flex items-center gap-2"
                              onClick={() => handleEditCustomer(customer.id)}
                            >
                              <Edit className="h-4 w-4" />
                              Edit Customer
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="flex items-center gap-2 text-destructive focus:text-destructive"
                              onClick={() => handleDeleteCustomer(customer.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete Customer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10">
                <p className="text-muted-foreground">No customers found matching your search.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Customers;
