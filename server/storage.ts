import { db } from "@db";
import { budgetMonths, budgetItems, categories } from "@shared/schema";
import { and, eq, desc, sql, asc } from "drizzle-orm";
import { format, parse } from "date-fns";
import { BudgetItemForm } from "@shared/schema";

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

/**
 * Format a month number (1-12) to a month name
 */
function formatMonthYear(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return format(date, 'MMMM yyyy');
}

/**
 * Calculate variance between actual and expected amounts
 */
function calculateVariance(actual: number, expected: number): number {
  return Number(actual) - Number(expected);
}

/**
 * Calculate variance percentage
 */
function calculateVariancePercentage(variance: number, expected: number): number {
  if (expected === 0) return 0;
  return (variance / expected) * 100;
}

export const storage = {
  /**
   * Get current month data
   */
  async getCurrentMonth(): Promise<MonthData> {
    // Get the most recent budget month, or create current month if none exists
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    
    return this.getOrCreateMonth(currentYear, currentMonth);
  },
  
  /**
   * Get or create a budget month
   */
  async getOrCreateMonth(year: number, month: number): Promise<MonthData> {
    // Check if the month exists
    let budgetMonth = await db.query.budgetMonths.findFirst({
      where: and(
        eq(budgetMonths.year, year),
        eq(budgetMonths.month, month)
      ),
    });
    
    // If month doesn't exist, create it
    if (!budgetMonth) {
      budgetMonth = await this.createMonth(year, month);
    }
    
    // Get all categories
    const allCategories = await db.query.categories.findMany({
      orderBy: asc(categories.sortOrder),
    });
    
    // Get all budget items for this month
    const allItems = await db.query.budgetItems.findMany({
      where: eq(budgetItems.budgetMonthId, budgetMonth.id),
      with: {
        category: true,
      },
    });
    
    // Separate revenue and expense items
    const revenueItems = allItems
      .filter(item => item.category.type === 'revenue')
      .map(item => ({
        id: item.id,
        name: item.name,
        category: 'revenue',
        expectedAmount: Number(item.expectedAmount),
        actualAmount: Number(item.actualAmount || 0),
        variance: calculateVariance(Number(item.actualAmount || 0), Number(item.expectedAmount)),
      }));
    
    // Calculate revenue totals
    const expectedTotalRevenue = revenueItems.reduce((total, item) => total + item.expectedAmount, 0);
    const actualTotalRevenue = revenueItems.reduce((total, item) => total + item.actualAmount, 0);
    const revenueVariance = calculateVariance(actualTotalRevenue, expectedTotalRevenue);
    const revenueVariancePercentage = calculateVariancePercentage(revenueVariance, expectedTotalRevenue);
    
    // Group expense items by category
    const expenseCategories = allCategories
      .filter(category => category.type === 'expense')
      .map(category => {
        const categoryItems = allItems
          .filter(item => item.categoryId === category.id)
          .map(item => ({
            id: item.id,
            name: item.name,
            category: category.name,
            expectedAmount: Number(item.expectedAmount),
            actualAmount: Number(item.actualAmount || 0),
            variance: calculateVariance(Number(item.actualAmount || 0), Number(item.expectedAmount)),
          }));
        
        // Calculate category totals
        const expectedTotal = categoryItems.reduce((total, item) => total + item.expectedAmount, 0);
        const actualTotal = categoryItems.reduce((total, item) => total + item.actualAmount, 0);
        const variance = calculateVariance(actualTotal, expectedTotal);
        
        return {
          category: category.name,
          displayName: category.displayName,
          items: categoryItems,
          totals: {
            expectedTotal,
            actualTotal,
            variance,
          },
        };
      });
    
    // Calculate expense totals
    const expectedTotalExpenses = expenseCategories.reduce((total, category) => total + category.totals.expectedTotal, 0);
    const actualTotalExpenses = expenseCategories.reduce((total, category) => total + category.totals.actualTotal, 0);
    const expensesVariance = calculateVariance(actualTotalExpenses, expectedTotalExpenses);
    const expensesVariancePercentage = calculateVariancePercentage(expensesVariance, expectedTotalExpenses);
    
    // Calculate net income
    const expectedNetIncome = expectedTotalRevenue - expectedTotalExpenses;
    const actualNetIncome = actualTotalRevenue - actualTotalExpenses;
    const netIncomeVariance = calculateVariance(actualNetIncome, expectedNetIncome);
    const netIncomeVariancePercentage = calculateVariancePercentage(netIncomeVariance, expectedNetIncome);
    
    return {
      month: formatMonthYear(year, month),
      revenueItems,
      expenseCategories,
      totals: {
        expectedTotalRevenue,
        actualTotalRevenue,
        expectedTotalExpenses,
        actualTotalExpenses,
        expectedNetIncome,
        actualNetIncome,
        revenueVariance,
        expensesVariance,
        netIncomeVariance,
        revenueVariancePercentage,
        expensesVariancePercentage,
        netIncomeVariancePercentage,
      },
    };
  },
  
  /**
   * Create a new budget month
   */
  async createMonth(year: number, month: number) {
    // Create the new month
    const [newMonth] = await db.insert(budgetMonths)
      .values({
        year,
        month,
        isActive: true,
      })
      .returning();
    
    // Check if the previous month exists
    const prevMonth = month === 1 
      ? { year: year - 1, month: 12 } 
      : { year, month: month - 1 };
    
    const previousMonth = await db.query.budgetMonths.findFirst({
      where: and(
        eq(budgetMonths.year, prevMonth.year),
        eq(budgetMonths.month, prevMonth.month)
      ),
    });
    
    // If the previous month exists, copy its budget items
    if (previousMonth) {
      const prevItems = await db.query.budgetItems.findMany({
        where: eq(budgetItems.budgetMonthId, previousMonth.id),
      });
      
      if (prevItems.length > 0) {
        // Copy each item to the new month
        const newItems = prevItems.map(item => ({
          budgetMonthId: newMonth.id,
          categoryId: item.categoryId,
          name: item.name,
          expectedAmount: item.expectedAmount,
          actualAmount: "0", // Reset actual amount for the new month
        }));
        
        await db.insert(budgetItems).values(newItems);
      }
    }
    
    return newMonth;
  },
  
  /**
   * Create a new budget item
   */
  async createBudgetItem(data: BudgetItemForm) {
    // Get current month
    const currentMonth = await this.getCurrentMonth();
    const [monthYear, _] = currentMonth.month.split(' ');
    const monthDate = parse(currentMonth.month, 'MMMM yyyy', new Date());
    
    // Get budget month record
    const budgetMonth = await db.query.budgetMonths.findFirst({
      where: and(
        eq(budgetMonths.year, monthDate.getFullYear()),
        eq(budgetMonths.month, monthDate.getMonth() + 1)
      ),
    });
    
    if (!budgetMonth) {
      throw new Error('Could not find current budget month');
    }
    
    // Get category ID
    const category = await db.query.categories.findFirst({
      where: eq(categories.name, data.category),
    });
    
    if (!category) {
      throw new Error(`Category not found: ${data.category}`);
    }
    
    // Create the budget item
    const [newItem] = await db.insert(budgetItems)
      .values({
        budgetMonthId: budgetMonth.id,
        categoryId: category.id,
        name: data.name,
        expectedAmount: data.expectedAmount.toString(),
        actualAmount: (data.actualAmount || 0).toString(),
      })
      .returning();
    
    return {
      id: newItem.id,
      name: newItem.name,
      category: data.category,
      expectedAmount: Number(newItem.expectedAmount),
      actualAmount: Number(newItem.actualAmount || 0),
    };
  },
  
  /**
   * Update an existing budget item
   */
  async updateBudgetItem(id: number, data: BudgetItemForm) {
    // Get category ID
    const category = await db.query.categories.findFirst({
      where: eq(categories.name, data.category),
    });
    
    if (!category) {
      throw new Error(`Category not found: ${data.category}`);
    }
    
    // Update the budget item
    const [updatedItem] = await db.update(budgetItems)
      .set({
        categoryId: category.id,
        name: data.name,
        expectedAmount: data.expectedAmount.toString(),
        actualAmount: (data.actualAmount || 0).toString(),
        updatedAt: new Date(),
      })
      .where(eq(budgetItems.id, id))
      .returning();
    
    if (!updatedItem) {
      return null;
    }
    
    return {
      id: updatedItem.id,
      name: updatedItem.name,
      category: data.category,
      expectedAmount: Number(updatedItem.expectedAmount),
      actualAmount: Number(updatedItem.actualAmount || 0),
    };
  },
  
  /**
   * Delete a budget item
   */
  async deleteBudgetItem(id: number) {
    const [deletedItem] = await db.delete(budgetItems)
      .where(eq(budgetItems.id, id))
      .returning();
    
    return deletedItem ? true : false;
  },
};
