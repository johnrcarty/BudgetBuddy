import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatPercentage } from "@/lib/utils";

interface BudgetSummaryProps {
  monthData: {
    month: string;
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
  };
}

export default function BudgetSummary({ monthData }: BudgetSummaryProps) {
  const { totals } = monthData;
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Monthly Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Expected Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700">Expected</h3>
              
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Total Revenue</span>
                <span className="font-mono font-medium text-gray-900">
                  {formatCurrency(totals.expectedTotalRevenue)}
                </span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Total Expenses</span>
                <span className="font-mono font-medium text-gray-900">
                  {formatCurrency(totals.expectedTotalExpenses)}
                </span>
              </div>
              
              <div className="flex justify-between py-2">
                <span className="text-gray-800 font-medium">Net Income</span>
                <span className="font-mono font-medium text-gray-900">
                  {formatCurrency(totals.expectedNetIncome)}
                </span>
              </div>
            </div>
            
            {/* Actual Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-700">Actual</h3>
              
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Total Revenue</span>
                <span className="font-mono font-medium text-gray-900">
                  {formatCurrency(totals.actualTotalRevenue)}
                </span>
              </div>
              
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Total Expenses</span>
                <span className="font-mono font-medium text-gray-900">
                  {formatCurrency(totals.actualTotalExpenses)}
                </span>
              </div>
              
              <div className="flex justify-between py-2">
                <span className="text-gray-800 font-medium">Net Income</span>
                <span className={`font-mono font-medium ${totals.actualNetIncome >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatCurrency(totals.actualNetIncome)}
                </span>
              </div>
            </div>
          </div>
          
          {/* Variance Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-700 mb-4">Variance (Actual - Expected)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Revenue</span>
                  <span className={`font-mono font-medium ${totals.revenueVariance >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {totals.revenueVariance >= 0 ? '+' : ''}{formatCurrency(totals.revenueVariance)}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {formatPercentage(Math.abs(totals.revenueVariancePercentage))} {totals.revenueVariance >= 0 ? 'over' : 'under'} budget
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Expenses</span>
                  <span className={`font-mono font-medium ${totals.expensesVariance <= 0 ? 'text-positive' : 'text-negative'}`}>
                    {totals.expensesVariance > 0 ? '+' : ''}{formatCurrency(totals.expensesVariance)}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {formatPercentage(Math.abs(totals.expensesVariancePercentage))} {totals.expensesVariance > 0 ? 'over' : 'under'} budget
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Net Income</span>
                  <span className={`font-mono font-medium ${totals.netIncomeVariance >= 0 ? 'text-positive' : 'text-negative'}`}>
                    {totals.netIncomeVariance >= 0 ? '+' : ''}{formatCurrency(totals.netIncomeVariance)}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-500">
                  {formatPercentage(Math.abs(totals.netIncomeVariancePercentage))} {totals.netIncomeVariance >= 0 ? 'over' : 'under'} budget
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
