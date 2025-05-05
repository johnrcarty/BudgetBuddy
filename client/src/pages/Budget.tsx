import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useMobile } from "@/hooks/use-mobile";
import MonthNavigation from "@/components/budget/MonthNavigation";
import BudgetSummary from "@/components/budget/BudgetSummary";
import RevenueCategorySection from "@/components/budget/RevenueCategorySection";
import ExpenseCategorySection from "@/components/budget/ExpenseCategorySection";
import CategoryManagement from "@/components/budget/CategoryManagement";
import ImportBudgetDialog from "@/components/budget/ImportBudgetDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { Settings, BarChart2, Upload } from "lucide-react";
import { Link } from "wouter";

export default function Budget() {
  const { toast } = useToast();
  const isMobile = useMobile();
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  
  interface MonthData {
    month: string;
    revenueItems: any[];
    expenseCategories: any[];
    totals: {
      expectedTotalRevenue: number;
      actualTotalRevenue: number;
      expectedTotalExpenses: number;
      actualTotalExpenses: number;
      expectedNetIncome: number;
      actualNetIncome: number;
      revenueVariance: number;
      expensesVariance: number;
      netIncomeVariance: number;
      revenueVariancePercentage: number;
      expensesVariancePercentage: number;
      netIncomeVariancePercentage: number;
    };
  }

  // Get current month data
  const { data: currentMonth, isLoading } = useQuery<MonthData>({
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
      <header className="bg-white shadow fixed top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Monthly Budget Tracker</h1>
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline"
                size={isMobile ? "sm" : "default"}
                className="border-gray-300"
                onClick={() => setIsCategoryDialogOpen(true)}
              >
                <Settings className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="sm:inline">Categories</span>
              </Button>
              <Button 
                variant="outline"
                size={isMobile ? "sm" : "default"}
                className="border-gray-300"
                onClick={() => setIsImportDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="sm:inline">Import</span>
              </Button>
              <Link href="/visualization">
                <Button 
                  variant="outline"
                  size={isMobile ? "sm" : "default"}
                  className="border-gray-300"
                >
                  <BarChart2 className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="sm:inline">Visualize</span>
                </Button>
              </Link>
              <Button 
                variant="default" 
                size={isMobile ? "sm" : "default"}
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
      
      {/* Spacer to prevent content from hiding under fixed header */}
      <div className="h-24 sm:h-20"></div>

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

      {/* Category Management Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Category Management</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <CategoryManagement />
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Budget Dialog */}
      <ImportBudgetDialog 
        open={isImportDialogOpen} 
        onOpenChange={setIsImportDialogOpen} 
      />
    </div>
  );
}
