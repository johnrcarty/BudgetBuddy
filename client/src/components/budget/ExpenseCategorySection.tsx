import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency, getVarianceClass } from "@/lib/utils";
import ExpenseCategory from "./ExpenseCategory";
import BudgetItemDialog from "./BudgetItemDialog";

interface ExpenseCategorySectionProps {
  expenseCategories: Array<{
    category: string;
    displayName: string;
    items: Array<{
      id: number;
      name: string;
      expectedAmount: number;
      actualAmount: number;
      variance: number;
    }>;
    totals: {
      expectedTotal: number;
      actualTotal: number;
      variance: number;
    };
  }>;
  totals: {
    expectedTotalExpenses: number;
    actualTotalExpenses: number;
    expensesVariance: number;
  };
}

export default function ExpenseCategorySection({ expenseCategories, totals }: ExpenseCategorySectionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("housing");
  
  const handleAddExpense = () => {
    setIsDialogOpen(true);
  };
  
  return (
    <>
      <Card className="overflow-hidden">
        <div className="bg-primary bg-opacity-10 px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Expenses</h2>
          <Button 
            className="bg-primary text-white text-sm px-3 py-1 h-auto" 
            onClick={handleAddExpense}
          >
            Add Item
          </Button>
        </div>
        
        {/* Expense Categories */}
        <div className="space-y-4 p-6">
          {expenseCategories.map((categoryData) => (
            <ExpenseCategory 
              key={categoryData.category}
              categoryData={categoryData}
              onAddItem={() => {
                setSelectedCategory(categoryData.category);
                setIsDialogOpen(true);
              }}
            />
          ))}
          
          {/* Expense Totals */}
          <div className="mt-6 bg-white rounded-lg p-6 shadow">
            <div className="grid grid-cols-1 sm:grid-cols-12 sm:gap-4">
              <div className="sm:col-span-3 font-bold text-lg text-gray-800">Total Expenses</div>
              <div className="sm:col-span-3 text-right font-mono font-bold text-lg text-gray-800">
                {formatCurrency(totals.expectedTotalExpenses)}
              </div>
              <div className="sm:col-span-3 text-right font-mono font-bold text-lg text-gray-800">
                {formatCurrency(totals.actualTotalExpenses)}
              </div>
              <div className={`sm:col-span-2 text-right font-mono font-bold text-lg ${getVarianceClass(totals.expensesVariance, false)}`}>
                {totals.expensesVariance > 0 ? '+' : ''}{formatCurrency(totals.expensesVariance)}
              </div>
              <div className="sm:col-span-1">&nbsp;</div>
            </div>
          </div>
        </div>
      </Card>
      
      <BudgetItemDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        category={selectedCategory}
        item={null}
      />
    </>
  );
}
