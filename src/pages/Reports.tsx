import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { useState } from "react";
import InventoryReport from "@/components/reports/InventoryReport";
import SalesReport from "@/components/reports/SalesReport";
import ExpenseReport from "@/components/reports/ExpenseReport";
import OrderBackLogReport from "@/components/reports/OrderBackLogReport";
import OutstandingReport from "@/components/reports/OutstandingReport";
import ProfitLossReport from "@/components/reports/ProfitLossReport";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Reports = () => {
  const [selectedReport, setSelectedReport] = useState<string>("inventory");

  const renderReport = () => {
    switch (selectedReport) {
      case "inventory":
        return <InventoryReport />;
      case "sales":
        return <SalesReport />;
      case "expense":
        return <ExpenseReport />;
      case "orderBacklog":
        return <OrderBackLogReport />;
      case "outstanding":
        return <OutstandingReport />;
      case "profitLoss":
        return <ProfitLossReport />;
      default:
        return <InventoryReport />;
    }
  };

  return (
    <DashboardLayout title="Reports">
      <div className="flex flex-col gap-4">
        <div className="w-full max-w-xs">
          <Select value={selectedReport} onValueChange={setSelectedReport}>
            <SelectTrigger>
              <SelectValue placeholder="Select Report Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inventory">Inventory Report</SelectItem>
              <SelectItem value="sales">Sales Report</SelectItem>
              <SelectItem value="expense">Expense Report</SelectItem>
              <SelectItem value="orderBacklog">Order Backlog Report</SelectItem>
              <SelectItem value="outstanding">Outstanding Report</SelectItem>
              <SelectItem value="profitLoss">Profit & Loss Report</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4">
          {renderReport()}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
