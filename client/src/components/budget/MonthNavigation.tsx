import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, parse, addMonths, subMonths } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

export default function MonthNavigation() {
  const { toast } = useToast();
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Get current month data
  const { data: currentMonth, isLoading } = useQuery<MonthData>({
    queryKey: ['/api/budget/current-month'],
  });
  
  // Navigate to a different month
  const { mutate: navigateMonth } = useMutation({
    mutationFn: async (date: string) => {
      return await apiRequest('POST', '/api/budget/navigate', { date });
    },
    onMutate: () => {
      setIsNavigating(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/budget/current-month'] });
      setIsNavigating(false);
    },
    onError: (error) => {
      toast({
        title: "Navigation Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsNavigating(false);
    },
  });
  
  // Navigate to the previous month
  const navigateToPreviousMonth = () => {
    if (!currentMonth || isNavigating) return;
    
    const currentDate = parse(currentMonth.month, 'MMMM yyyy', new Date());
    const prevDate = subMonths(currentDate, 1);
    const formattedDate = format(prevDate, 'yyyy-MM-dd');
    
    navigateMonth(formattedDate);
  };
  
  // Navigate to the next month (copying previous month data if needed)
  const navigateToNextMonth = () => {
    if (!currentMonth || isNavigating) return;
    
    const currentDate = parse(currentMonth.month, 'MMMM yyyy', new Date());
    const nextDate = addMonths(currentDate, 1);
    const formattedDate = format(nextDate, 'yyyy-MM-dd');
    
    navigateMonth(formattedDate);
  };
  
  return (
    <div className="sticky top-24 sm:top-20 z-10 bg-slate-50 pb-2 pt-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-3 flex justify-between items-center">
          <Button 
            variant="ghost" 
            size="sm"
            className="p-1 sm:p-2 rounded-full hover:bg-slate-100"
            onClick={navigateToPreviousMonth}
            disabled={isNavigating || isLoading}
          >
            <ChevronLeft className="h-5 w-5 text-gray-500" />
          </Button>
          
          <div className="flex flex-col items-center px-2">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              {isLoading ? "Loading..." : currentMonth?.month}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">Budget Planner</p>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-1 sm:p-2 rounded-full hover:bg-slate-100"
            onClick={navigateToNextMonth}
            disabled={isNavigating || isLoading}
          >
            <ChevronRight className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      </div>
    </div>
  );
}
