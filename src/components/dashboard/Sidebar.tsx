import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Users, 
  ShoppingBag, 
  ClipboardList, 
  FileText, 
  BarChart3, 
  Menu, 
  Home,
  X,
  LogOut,
  Settings
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Products", href: "/products", icon: ShoppingBag },
  { name: "Orders", href: "/orders", icon: ClipboardList },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "Expenses", href: "/expenses", icon: ClipboardList },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Settings", href: "/settings/company", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();
  const { logout, currentUser } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className={cn(
      "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar transition-all duration-300 border-r border-sidebar-border",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center h-16 border-b border-sidebar-border px-4">
        {!collapsed && (
          <h1 className="text-xl font-bold text-sidebar-foreground">
            Harimidhu<span className="text-organic-secondary">Organic</span>
          </h1>
        )}
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "ml-auto text-sidebar-foreground",
            collapsed && "mx-auto"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <Menu /> : <X />}
        </Button>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                to={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                  location.pathname === item.href && "bg-sidebar-primary text-sidebar-primary-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", collapsed ? "mx-auto" : "mr-3")} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="border-t border-sidebar-border p-2">
        <div className={cn(
          "flex items-center",
          collapsed ? "justify-center" : "space-x-3"
        )}>
          <div className="h-8 w-8 rounded-full bg-organic-secondary flex items-center justify-center text-sidebar-primary-foreground">
            {currentUser?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
          {!collapsed && (
            <div className="flex-1">
              <p className="text-sm font-medium text-sidebar-foreground">Admin</p>
              <p className="text-xs text-sidebar-foreground/70">{currentUser?.email || 'admin@harimidhu.com'}</p>
            </div>
          )}
          {!collapsed && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-sidebar-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
