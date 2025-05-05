import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";
import MonthNavigation from "@/components/budget/MonthNavigation";
import BudgetSummary from "@/components/budget/BudgetSummary";
import RevenueCategorySection from "@/components/budget/RevenueCategorySection";
import ExpenseCategorySection from "@/components/budget/ExpenseCategorySection";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

export default function Budget() {
  const { toast } = useToast();
  const isMobile = useMobile();
  
  // Get current month data
  const { data: currentMonth, isLoading } = useQuery({
    queryKey: ['/api/budget/current-month'],
  });
  
  // Save budget data mutation
  const { mutate: saveBudget, isPending } = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', '/api/budget/save', {});
    },
    onSuccess: () => {
      toast({
        title: "Budget Saved",
        description: "Your budget data has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error Saving Budget",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-800">Monthly Budget Tracker</h1>
            <div className="flex space-x-2">
              <Button 
                variant="default" 
                className="bg-primary text-white"
                onClick={() => saveBudget()}
                disabled={isPending}
              >
                {isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Month Navigation */}
      <MonthNavigation />

      {/* Budget Summary */}
      {!isLoading && currentMonth && (
        <>
          <BudgetSummary monthData={currentMonth} />

          {/* Budget Categories */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
            <div className="space-y-8">
              {/* Revenue Section */}
              <RevenueCategorySection 
                revenueItems={currentMonth.revenueItems} 
                totals={currentMonth.totals} 
              />
              
              {/* Expense Section */}
              <ExpenseCategorySection 
                expenseCategories={currentMonth.expenseCategories} 
                totals={currentMonth.totals} 
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
