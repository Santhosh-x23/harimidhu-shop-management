import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Edit, Trash2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { format, parseISO, addDays } from 'date-fns';
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';

interface Expense {
  id: number;
  date: string;
  expenseType: string;
  amount: number;
}

const ExpenseReport = () => {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  useEffect(() => {
    const storedExpenses = localStorage.getItem("expenses");
    if (storedExpenses) {
      const expenses: Expense[] = JSON.parse(storedExpenses);
      expenses.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setAllExpenses(expenses);
      setFilteredExpenses(expenses);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    applyFilters(allExpenses, searchQuery, date);
  }, [allExpenses, searchQuery, date]);

  const applyFilters = (data: Expense[], search: string, date: DateRange | undefined) => {
    let filtered = [...data];
    if (date?.from && date?.to) {
      const fromTime = new Date(date.from).setHours(0, 0, 0, 0);
      const toTime = new Date(date.to).setHours(23, 59, 59, 999);
      filtered = filtered.filter(expense => {
        const expenseDate = new Date(expense.date).getTime();
        return expenseDate >= fromTime && expenseDate <= toTime;
      });
    }
    if (search.trim()) {
      const lower = search.trim().toLowerCase();
      filtered = filtered.filter(expense => {
        const formattedDate = new Date(expense.date).toLocaleDateString().toLowerCase();
        const formattedDateISO = new Date(expense.date).toISOString().toLowerCase();
        return (
          expense.expenseType.toLowerCase().includes(lower) ||
          formattedDate.includes(lower) ||
          formattedDateISO.includes(lower) ||
          String(expense.amount || '').toLowerCase().includes(lower)
        );
      });
    }
    setFilteredExpenses(filtered);
  };

  const handleDelete = (id: number) => {
    console.log("Delete expense with ID:", id);
    const updatedExpenses = allExpenses.filter((expense) => expense.id !== id);
    localStorage.setItem("expenses", JSON.stringify(updatedExpenses));
    setAllExpenses(updatedExpenses);
    setFilteredExpenses(
      updatedExpenses.filter((expense) =>
        expense.expenseType.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  };

  const totalAmount = filteredExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Expense Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-organic-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Expense Report</CardTitle>
        <div className="flex items-center gap-4 justify-between flex-wrap mt-4">
          <DatePickerWithRange date={date} setDate={setDate} />
          <div className="relative w-full max-w-xs ml-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by expense type, amount, or date..."
              className="pl-9"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="text-lg font-medium mt-4">
          Total Expenses: ₹{totalAmount.toFixed(2)}
        </div>
      </CardHeader>
      <CardContent>
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No expense data found matching your search.</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">S.No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type of Expense</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense, index) => (
                  <TableRow key={expense.id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{format(parseISO(expense.date), 'PPP')}</TableCell>
                    <TableCell>{expense.expenseType.charAt(0).toUpperCase() + expense.expenseType.slice(1)}</TableCell>
                    <TableCell className="text-right">₹{expense.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(expense.id)}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold">Total:</TableCell>
                  <TableCell className="text-right font-bold">₹{totalAmount.toFixed(2)}</TableCell>
                  <TableCell colSpan={1}></TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpenseReport;
