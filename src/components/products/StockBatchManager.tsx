import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PlusCircle, Trash2, Edit, Check, X } from "lucide-react";
import { StockBatch } from "@/types";
import { toast } from "sonner";

interface StockBatchManagerProps {
  batches: StockBatch[];
  onChange: (batches: StockBatch[]) => void;
  onEditStatusChange?: (isEditing: boolean) => void;
}

const StockBatchManager = ({ batches, onChange, onEditStatusChange }: StockBatchManagerProps) => {
  const [newBatch, setNewBatch] = useState<Omit<StockBatch, "id" | "date_added">>({
    quantity: 0,
    cost_price: 0,
  });
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    quantity: number;
    cost_price: number;
  }>({
    quantity: 0,
    cost_price: 0,
  });
  
  // Use refs to track if we're in an edit operation
  const isInitialEditRef = useRef(true);

  // Reset the initial edit flag when editingBatchId changes
  useEffect(() => {
    isInitialEditRef.current = true;
  }, [editingBatchId]);

  // Notify parent component when editing state changes
  useEffect(() => {
    if (onEditStatusChange) {
      onEditStatusChange(editingBatchId !== null);
    }
  }, [editingBatchId, onEditStatusChange]);

  const totalStock = batches.reduce((sum, batch) => sum + batch.quantity, 0);

  const handleAddBatch = () => {
    if (newBatch.quantity <= 0 || newBatch.cost_price <= 0) {
      toast.error("Please enter valid quantity and cost price");
      return;
    }

    const newBatchWithId: StockBatch = {
      id: crypto.randomUUID(),
      quantity: newBatch.quantity,
      cost_price: newBatch.cost_price,
      date_added: new Date().toISOString(),
    };

    onChange([newBatchWithId, ...batches]);
    setNewBatch({ quantity: 0, cost_price: 0 });
  };

  const handleRemoveBatch = (id: string) => {
    // Prevent removing a batch while editing another
    if (editingBatchId !== null) {
      toast.error("Please save or cancel your current edit first");
      return;
    }
    
    if (window.confirm("Are you sure you want to remove this batch?")) {
      onChange(batches.filter(batch => batch.id !== id));
    }
  };

  const handleEditBatch = (batch: StockBatch) => {
    // Only set edit mode if we're not already editing
    if (editingBatchId !== null) {
      toast.error("Please save or cancel your current edit first");
      return;
    }
    
    setEditingBatchId(batch.id);
    setEditForm({
      quantity: batch.quantity,
      cost_price: batch.cost_price,
    });
  };

  const handleSaveEdit = (id: string) => {
    // Skip saving on initial render of edit mode
    if (isInitialEditRef.current) {
      isInitialEditRef.current = false;
      return;
    }
    
    if (editForm.quantity <= 0 || editForm.cost_price <= 0) {
      toast.error("Please enter valid quantity and cost price");
      return;
    }

    const updatedBatches = batches.map(batch => 
      batch.id === id 
        ? { ...batch, quantity: editForm.quantity, cost_price: editForm.cost_price } 
        : batch
    );
    
    onChange(updatedBatches);
    setEditingBatchId(null);
    toast.success("Batch updated successfully");
  };

  const handleCancelEdit = () => {
    setEditingBatchId(null);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setNewBatch(prev => ({
      ...prev,
      quantity: isNaN(value) ? 0 : value
    }));
  };

  const handleCostPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setNewBatch(prev => ({
      ...prev,
      cost_price: isNaN(value) ? 0 : value
    }));
  };

  const handleEditQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Mark that we've made an edit
    isInitialEditRef.current = false;
    
    const value = parseFloat(e.target.value);
    setEditForm(prev => ({
      ...prev,
      quantity: isNaN(value) ? 0 : value
    }));
  };

  const handleEditCostPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Mark that we've made an edit
    isInitialEditRef.current = false;
    
    const value = parseFloat(e.target.value);
    setEditForm(prev => ({
      ...prev,
      cost_price: isNaN(value) ? 0 : value
    }));
  };

  // Format date to DD/MM/YY
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  };

  // Format number to display with 2 decimal places
  const formatNumber = (num: number) => {
    return num.toFixed(2);
  };

  return (
    <div className="space-y-4">
      {editingBatchId !== null && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-sm mb-4">
          You are currently editing a stock batch. Make your changes, then click the checkmark to save.
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            min="0.01"
            step="0.01"
            value={newBatch.quantity || ''}
            onChange={handleQuantityChange}
            placeholder="Enter quantity"
            disabled={editingBatchId !== null}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost_price">Cost Price (₹)</Label>
          <Input
            id="cost_price"
            type="number"
            min="0.01"
            step="0.01"
            value={newBatch.cost_price || ''}
            onChange={handleCostPriceChange}
            placeholder="Enter cost price"
            disabled={editingBatchId !== null}
          />
        </div>
        <Button 
          onClick={handleAddBatch}
          className="bg-organic-primary hover:bg-organic-dark gap-2"
          disabled={newBatch.quantity <= 0 || newBatch.cost_price <= 0 || editingBatchId !== null}
        >
          <PlusCircle className="h-4 w-4" />
          Add Batch
        </Button>
      </div>

      <div className="bg-white rounded-md border">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="font-medium">Stock Batches</h3>
          <span className="text-sm text-muted-foreground">
            Total Stock: {formatNumber(totalStock)}
          </span>
        </div>

        {batches.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date Added</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Cost Price (₹)</TableHead>
                <TableHead className="text-right">Total Cost (₹)</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.map((batch) => (
                <TableRow key={batch.id} className={editingBatchId === batch.id ? "bg-muted/50" : ""}>
                  <TableCell>
                    {formatDate(batch.date_added)}
                  </TableCell>
                  {editingBatchId === batch.id ? (
                    <>
                      <TableCell>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editForm.quantity}
                          onChange={handleEditQuantityChange}
                          className="w-20"
                          autoFocus
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={editForm.cost_price}
                          onChange={handleEditCostPriceChange}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        ₹{formatNumber(editForm.quantity * editForm.cost_price)}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleSaveEdit(batch.id)}
                          className="h-8 w-8"
                          type="button"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleCancelEdit}
                          className="h-8 w-8"
                          type="button"
                        >
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="text-right">{formatNumber(batch.quantity)}</TableCell>
                      <TableCell className="text-right">₹{formatNumber(batch.cost_price)}</TableCell>
                      <TableCell className="text-right">
                        ₹{formatNumber(batch.quantity * batch.cost_price)}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditBatch(batch)}
                          className="h-8 w-8"
                          disabled={editingBatchId !== null}
                          type="button"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveBatch(batch.id)}
                          className="h-8 w-8"
                          disabled={editingBatchId !== null}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground">No stock batches added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StockBatchManager;
