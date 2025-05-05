import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pencil, Trash2 } from "lucide-react";
import { formatCurrency, getVarianceClass } from "@/lib/utils";
import BudgetItemDialog from "./BudgetItemDialog";

interface RevenueCategorySectionProps {
  revenueItems: Array<{
    id: number;
    name: string;
    expectedAmount: number;
    actualAmount: number;
    variance: number;
  }>;
  totals: {
    expectedTotalRevenue: number;
    actualTotalRevenue: number;
    revenueVariance: number;
  };
}

export default function RevenueCategorySection({ revenueItems, totals }: RevenueCategorySectionProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Delete item mutation
  const { mutate: deleteItem } = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/budget/items/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budget/current-month'] });
      toast({
        title: "Item Deleted",
        description: "Budget item has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Deleting Item",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleAddItem = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };
  
  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };
  
  const handleDeleteItem = (id: number) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      deleteItem(id);
    }
  };
  
  return (
    <>
      <Card className="overflow-hidden">
        <div className="bg-secondary bg-opacity-10 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Revenue</h2>
          <Button 
            variant="secondary" 
            className="bg-secondary text-white text-sm px-3 py-1 h-auto"
            onClick={handleAddItem}
          >
            Add Item
          </Button>
        </div>
        
        {/* Revenue Items Header */}
        <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 text-sm font-medium text-gray-500">
          <div className="sm:col-span-4">Item</div>
          <div className="sm:col-span-3 text-right">Expected</div>
          <div className="sm:col-span-3 text-right">Actual</div>
          <div className="sm:col-span-2 text-right">Variance</div>
        </div>
        
        {/* Revenue Items List */}
        <div className="divide-y divide-gray-200">
          {revenueItems.length === 0 ? (
            <div className="px-6 py-4 text-gray-500 text-center">
              No revenue items available. Click "Add Item" to create one.
            </div>
          ) : (
            revenueItems.map((item) => (
              <div key={item.id} className="px-6 py-4 sm:grid sm:grid-cols-12 sm:gap-4">
                <div className="sm:col-span-4 mb-2 sm:mb-0 flex justify-between sm:block">
                  <div className="font-medium text-gray-800">{item.name}</div>
                  <div className="sm:hidden text-sm text-gray-500">Item</div>
                </div>
                
                <div className="sm:col-span-3 mb-2 sm:mb-0 flex justify-between sm:justify-end sm:text-right">
                  <div className="sm:hidden text-sm text-gray-500">Expected</div>
                  <div className="font-mono text-gray-700">{formatCurrency(item.expectedAmount)}</div>
                </div>
                
                <div className="sm:col-span-3 mb-2 sm:mb-0 flex justify-between sm:justify-end sm:text-right">
                  <div className="sm:hidden text-sm text-gray-500">Actual</div>
                  <div className="font-mono text-gray-700">{formatCurrency(item.actualAmount)}</div>
                </div>
                
                <div className="sm:col-span-2 flex justify-between sm:justify-end items-center">
                  <div className="sm:hidden text-sm text-gray-500">Variance</div>
                  <div className="flex items-center">
                    <span className={`font-mono ${getVarianceClass(item.variance, true)}`}>
                      {item.variance > 0 ? '+' : ''}{formatCurrency(item.variance)}
                    </span>
                    <div className="flex ml-2">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="p-1 text-gray-400 hover:text-gray-600"
                        onClick={() => handleEditItem(item)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="p-1 text-gray-400 hover:text-gray-600 ml-1"
                        onClick={() => handleDeleteItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {/* Revenue Total */}
          <div className="px-6 py-4 sm:grid sm:grid-cols-12 sm:gap-4 bg-gray-50">
            <div className="sm:col-span-4 font-semibold text-gray-800">Total Revenue</div>
            <div className="sm:col-span-3 font-mono font-semibold text-right text-gray-800">
              {formatCurrency(totals.expectedTotalRevenue)}
            </div>
            <div className="sm:col-span-3 font-mono font-semibold text-right text-gray-800">
              {formatCurrency(totals.actualTotalRevenue)}
            </div>
            <div className={`sm:col-span-2 font-mono font-semibold text-right ${getVarianceClass(totals.revenueVariance, true)}`}>
              {totals.revenueVariance > 0 ? '+' : ''}{formatCurrency(totals.revenueVariance)}
            </div>
          </div>
        </div>
      </Card>
      
      <BudgetItemDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        item={editingItem}
        category="revenue"
      />
    </>
  );
}
