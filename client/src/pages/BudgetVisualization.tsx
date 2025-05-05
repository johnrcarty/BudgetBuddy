import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download } from 'lucide-react';
import { Link } from 'wouter';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface MonthData {
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
}

export default function BudgetVisualization() {
  const { toast } = useToast();
  const [months, setMonths] = useState<string>("6");
  
  // Fetch budget history data
  const { data: budgetHistory, isLoading } = useQuery<MonthData[]>({
    queryKey: ['/api/budget/history', months],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/budget/history/${months}`);
      return response as MonthData[];
    },
  });
  
  // Format data for charts
  const revenueExpenseData = budgetHistory?.map(month => ({
    name: month.month,
    expectedRevenue: month.totals.expectedTotalRevenue,
    actualRevenue: month.totals.actualTotalRevenue,
    expectedExpenses: month.totals.expectedTotalExpenses,
    actualExpenses: month.totals.actualTotalExpenses,
  })) || [];
  
  const netIncomeData = budgetHistory?.map(month => ({
    name: month.month,
    expectedNetIncome: month.totals.expectedNetIncome,
    actualNetIncome: month.totals.actualNetIncome,
  })) || [];
  
  const varianceData = budgetHistory?.map(month => ({
    name: month.month,
    revenueVariance: month.totals.revenueVariancePercentage,
    expensesVariance: month.totals.expensesVariancePercentage,
    netIncomeVariance: month.totals.netIncomeVariancePercentage,
  })) || [];
  
  // Handle CSV export
  const handleExportCsv = (type: 'current' | 'history') => {
    const url = type === 'current' 
      ? '/api/budget/export/current'
      : `/api/budget/export/history/${months}`;
    
    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', type === 'current' ? 'budget-current.csv' : 'budget-history.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Started",
      description: "Your budget data is being downloaded as a CSV file.",
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow fixed top-0 left-0 right-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:justify-between space-y-3 sm:space-y-0 sm:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/">
                <Button variant="outline" size="sm" className="min-w-0">
                  <ArrowLeft className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Back to Budget</span>
                </Button>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Budget Visualization</h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1 sm:gap-2">
                <Label htmlFor="timeframe" className="text-sm whitespace-nowrap">Months:</Label>
                <Select
                  value={months}
                  onValueChange={(value) => setMonths(value)}
                >
                  <SelectTrigger className="w-20 h-9">
                    <SelectValue placeholder="Months" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 Months</SelectItem>
                    <SelectItem value="6">6 Months</SelectItem>
                    <SelectItem value="12">12 Months</SelectItem>
                    <SelectItem value="24">24 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleExportCsv('current')}
                  className="whitespace-nowrap"
                >
                  <Download className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Export Current</span>
                  <span className="sm:hidden">Current</span>
                </Button>
                <Button 
                  size="sm"
                  onClick={() => handleExportCsv('history')}
                  className="whitespace-nowrap"
                >
                  <Download className="h-4 w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Export History</span>
                  <span className="sm:hidden">History</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Spacer to prevent content from hiding under fixed header */}
      <div className="h-32 sm:h-24"></div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="text-lg">Loading budget data...</div>
            </div>
          </div>
        ) : budgetHistory && budgetHistory.length > 0 ? (
          <div className="space-y-8">
            {/* Revenue vs Expenses Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses Trends</CardTitle>
                <CardDescription>Compare your expected and actual revenue and expenses over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={revenueExpenseData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="expectedRevenue" 
                        name="Expected Revenue" 
                        stroke="#10b981" 
                        strokeDasharray="5 5" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="actualRevenue" 
                        name="Actual Revenue" 
                        stroke="#047857" 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expectedExpenses" 
                        name="Expected Expenses" 
                        stroke="#f43f5e" 
                        strokeDasharray="5 5" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="actualExpenses" 
                        name="Actual Expenses" 
                        stroke="#be123c" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Net Income Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Net Income Trends</CardTitle>
                <CardDescription>Track your expected vs actual net income over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={netIncomeData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar 
                        dataKey="expectedNetIncome" 
                        name="Expected Net Income" 
                        fill="#6366f1" 
                      />
                      <Bar 
                        dataKey="actualNetIncome" 
                        name="Actual Net Income" 
                        fill="#4338ca" 
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Variance Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Variance Analysis</CardTitle>
                <CardDescription>See how your actual spending compares to your budget (in percentages)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={varianceData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis 
                        tickFormatter={(value) => `${value.toFixed(1)}%`} 
                        domain={[-50, 50]}
                      />
                      <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenueVariance" 
                        name="Revenue Variance %" 
                        stroke="#10b981" 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="expensesVariance" 
                        name="Expenses Variance %" 
                        stroke="#f43f5e" 
                        activeDot={{ r: 8 }} 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="netIncomeVariance" 
                        name="Net Income Variance %" 
                        stroke="#6366f1" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex justify-center py-12">
            <div className="text-center">
              <div className="text-lg text-gray-500">No budget data available for the selected timeframe.</div>
              <p className="mt-2">Try selecting a different time period or create budget entries to see visualizations.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}