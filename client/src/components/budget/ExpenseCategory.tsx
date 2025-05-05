import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, ChevronDown, ChevronUp, Calendar, CheckCircle2 } from "lucide-react";
import { formatCurrency, getVarianceClass } from "@/lib/utils";
import BudgetItemDialog from "./BudgetItemDialog";
import { format } from "date-fns";

interface ExpenseCategoryProps {
  categoryData: {
    category: string;
    displayName: string;
    items: Array<{
      id: number;
      name: string;
      expectedAmount: number;
      actualAmount: number;
      dueDate?: string | null;
      isPaid?: boolean;
      variance: number;
    }>;
    totals: {
      expectedTotal: number;
      actualTotal: number;
      variance: number;
    };
  };
  onAddItem: () => void;
}

export default function ExpenseCategory({ categoryData, onAddItem }: ExpenseCategoryProps) {
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(true);
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
  
  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };
  
  const handleDeleteItem = (id: number) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      deleteItem(id);
    }
  };
  
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };
  
  return (
    <>
      <div>
        <div className="flex justify-between items-center cursor-pointer mb-2" onClick={toggleExpanded}>
          <h3 className="text-lg font-medium text-gray-700">{categoryData.displayName}</h3>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
        
        {isExpanded && (
          <>
            {/* Category items header */}
            <div className="hidden sm:grid sm:grid-cols-12 gap-4 px-4 py-2 bg-gray-50 text-sm font-medium text-gray-500 rounded-t-lg">
              <div className="sm:col-span-3">Item</div>
              <div className="sm:col-span-3 text-right">Expected</div>
              <div className="sm:col-span-3 text-right">Actual</div>
              <div className="sm:col-span-2 text-right">Variance</div>
              <div className="sm:col-span-1 text-right">Actions</div>
            </div>
            
            {/* Category items */}
            <div className="divide-y divide-gray-200 border border-gray-200 rounded-b-lg overflow-hidden">
              {categoryData.items.length === 0 ? (
                <div className="px-4 py-3 text-gray-500 text-center bg-white">
                  No items in this category. Click "Add Item" to create one.
                </div>
              ) : (
                categoryData.items.map((item) => (
                  <div key={item.id} className="px-4 py-3 sm:grid sm:grid-cols-12 sm:gap-4 bg-white">
                    <div className="sm:col-span-3 mb-2 sm:mb-0 flex justify-between sm:block">
                      <div className="flex items-center">
                        <div className="font-medium text-gray-800">{item.name}</div>
                        <div className="flex ml-2 items-center">
                          {item.dueDate && (
                            <div className="flex items-center text-xs mr-2">
                              <Calendar className="h-3 w-3 text-gray-400 mr-1" />
                              <span className="text-gray-500">
                                {format(new Date(item.dueDate), 'MMM d')}
                              </span>
                            </div>
                          )}
                          {item.isPaid ? (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200 flex items-center">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Paid
                            </Badge>
                          ) : item.dueDate ? (
                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-600 border-yellow-200">
                              Due
                            </Badge>
                          ) : null}
                        </div>
                      </div>
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
                    
                    <div className="sm:col-span-2 mb-2 sm:mb-0 flex justify-between sm:justify-end sm:text-right">
                      <div className="sm:hidden text-sm text-gray-500">Variance</div>
                      <span className={`font-mono ${getVarianceClass(item.variance, false)}`}>
                        {item.variance > 0 ? '+' : ''}{formatCurrency(item.variance)}
                      </span>
                    </div>
                    
                    <div className="sm:col-span-1 flex justify-end items-center">
                      <div className="flex">
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
                ))
              )}
              
              {/* Category Total */}
              <div className="px-4 py-3 sm:grid sm:grid-cols-12 sm:gap-4 bg-gray-50">
                <div className="sm:col-span-3 font-semibold text-gray-800">{categoryData.displayName} Total</div>
                <div className="sm:col-span-3 font-mono font-semibold text-right text-gray-800">
                  {formatCurrency(categoryData.totals.expectedTotal)}
                </div>
                <div className="sm:col-span-3 font-mono font-semibold text-right text-gray-800">
                  {formatCurrency(categoryData.totals.actualTotal)}
                </div>
                <div className={`sm:col-span-2 font-mono font-semibold text-right ${getVarianceClass(categoryData.totals.variance, false)}`}>
                  {categoryData.totals.variance > 0 ? '+' : ''}{formatCurrency(categoryData.totals.variance)}
                </div>
                <div className="sm:col-span-1">&nbsp;</div>
              </div>
            </div>
          </>
        )}
      </div>
      
      <BudgetItemDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        item={editingItem}
        category={categoryData.category}
      />
    </>
  );
}
