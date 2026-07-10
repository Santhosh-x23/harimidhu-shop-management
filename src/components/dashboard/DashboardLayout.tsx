
import React from "react";
import { cn } from "@/lib/utils";
import { Sidebar } from "./Sidebar";
import { DashboardHeader } from "./DashboardHeader";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const isMobile = useIsMobile();
  
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <div className={cn(
        "flex flex-col min-h-screen transition-all duration-300",
        isMobile ? "ml-16" : "ml-64"
      )}>
        <DashboardHeader title={title} />
        
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
        
        <footer className="border-t p-4 text-center text-sm text-muted-foreground">
          <p>© 2025 Harimidhu Organic. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
