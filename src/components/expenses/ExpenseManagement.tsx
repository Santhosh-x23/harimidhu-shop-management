import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";

const expenseTypes = ["driver", "porter", "bottle", "labour", "others"];

const ExpenseManagement = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [expenseType, setExpenseType] = useState("");
  const [amount, setAmount] = useState<number | "">("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!date || !expenseType || amount === "") {
      alert("Please fill in all fields.");
      return;
    }

    const newExpense = {
      id: Date.now(), // Simple unique ID
      date: date.toISOString(),
      expenseType,
      amount: parseFloat(amount as unknown as string),
    };

    // Get existing expenses from local storage
    const existingExpenses = JSON.parse(localStorage.getItem("expenses") || "[]");

    // Add the new expense
    const updatedExpenses = [...existingExpenses, newExpense];

    // Save updated expenses back to local storage
    localStorage.setItem("expenses", JSON.stringify(updatedExpenses));

    console.log("Expense saved:", newExpense);

    // Reset form
    setDate(new Date());
    setExpenseType("");
    setAmount("");
  };

  return (
    <DashboardLayout title="Expense Management">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Add New Expense</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="date">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col space-y-1.5">
            <Label htmlFor="expenseType">Type of Expense</Label>
            <Select onValueChange={setExpenseType} value={expenseType}>
              <SelectTrigger id="expenseType">
                <SelectValue placeholder="Select expense type" />
              </SelectTrigger>
              <SelectContent>
                {expenseTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col space-y-1.5 md:col-span-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(parseFloat(e.target.value) || '')} />
          </div>

          <div className="col-span-full">
            <Button type="submit">Add Expense</Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default ExpenseManagement; 