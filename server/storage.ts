import { db } from "@db";
import { budgetMonths, budgetItems, categories, users, InsertUser, User, UserWithPassword } from "@shared/schema";
import { and, eq, desc, sql, asc, isNull } from "drizzle-orm";
import { format, parse } from "date-fns";
import { BudgetItemForm } from "@shared/schema";
import connectPgSimple from "connect-pg-simple";
import session from "express-session";
import { pool } from "@db";

// Set up session store with PostgreSQL
const PostgresStore = connectPgSimple(session);
export const sessionStore = new PostgresStore({
  pool,
  tableName: "session", // Default is "session"
  createTableIfMissing: true,
});

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

/**
 * Parse a date string in various formats to a Date object
 */
function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  
  // Try different date formats
  const formats = [
    'yyyy-MM-dd',
    'MM/dd/yyyy',
    'dd/MM/yyyy',
    'M/d/yyyy',
    'MMMM d, yyyy',
    'MMM d, yyyy'
  ];
  
  for (const formatStr of formats) {
    try {
      const date = parse(dateStr, formatStr, new Date());
      if (!isNaN(date.getTime())) {
        return date;
      }
    } catch (e) {
      // Continue trying other formats
    }
  }
  
  // Last resort: try native Date parsing
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  return null;
}

/**
 * Parse a month string (e.g., "January 2023") to get year and month number
 * @returns An object with year and month (1-12) or null if parsing fails
 */
function parseMonthString(monthStr: string): { year: number; month: number } | null {
  if (!monthStr) return null;
  
  // Try to parse as "Month Year" format (e.g., "January 2023")
  try {
    const date = parse(monthStr, 'MMMM yyyy', new Date());
    if (!isNaN(date.getTime())) {
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1
      };
    }
  } catch (e) {
    // Continue to other formats
  }
  
  // Try abbreviated month format (e.g., "Jan 2023")
  try {
    const date = parse(monthStr, 'MMM yyyy', new Date());
    if (!isNaN(date.getTime())) {
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1
      };
    }
  } catch (e) {
    // Continue to other formats
  }
  
  // Try numeric formats (e.g., "2023-01" or "01/2023")
  try {
    // Try yyyy-MM format
    const date = parse(monthStr, 'yyyy-MM', new Date());
    if (!isNaN(date.getTime())) {
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1
      };
    }
  } catch (e) {
    // Continue to other formats
  }
  
  try {
    // Try MM/yyyy format
    const date = parse(monthStr, 'MM/yyyy', new Date());
    if (!isNaN(date.getTime())) {
      return {
        year: date.getFullYear(),
        month: date.getMonth() + 1
      };
    }
  } catch (e) {
    // Continue to other formats
  }
  
  // Last resort: try to extract year and month from the string
  const parts = monthStr.split(/\s+|\/|-/);
  if (parts.length === 2) {
    // Try to determine which part is the year and which is the month
    const yearIndex = parts.findIndex(part => /^\d{4}$/.test(part));
    if (yearIndex !== -1) {
      const year = parseInt(parts[yearIndex]);
      const monthPart = parts[1 - yearIndex];
      
      // Try to parse the month part as a number or a month name
      let month: number;
      
      if (/^\d{1,2}$/.test(monthPart)) {
        // It's a number (1-12)
        month = parseInt(monthPart);
        if (month >= 1 && month <= 12) {
          return { year, month };
        }
      } else {
        // Try to match it against month names
        const monthNames = [
          'january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december'
        ];
        const monthNamesShort = [
          'jan', 'feb', 'mar', 'apr', 'may', 'jun',
          'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
        ];
        
        const lowerMonthPart = monthPart.toLowerCase();
        
        // Try full month names
        const fullMonthIndex = monthNames.indexOf(lowerMonthPart);
        if (fullMonthIndex !== -1) {
          return { year, month: fullMonthIndex + 1 };
        }
        
        // Try abbreviated month names
        const shortMonthIndex = monthNamesShort.indexOf(lowerMonthPart);
        if (shortMonthIndex !== -1) {
          return { year, month: shortMonthIndex + 1 };
        }
      }
    }
  }
  
  return null;
}

// Store the selected month (defaults to current month)
let selectedMonth = {
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1
};

export const storage = {
  /**
   * Get a user by ID
   */
  async getUser(id: number): Promise<User | undefined> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    
    if (!user) return undefined;
    
    // Omit password from returned user
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword as User;
  },
  
  /**
   * Get a user by username (with password for auth)
   */
  async getUserByUsername(username: string): Promise<UserWithPassword | undefined> {
    return await db.query.users.findFirst({
      where: eq(users.username, username),
    });
  },
  
  /**
   * Create a new user
   */
  async createUser(userData: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users)
      .values(userData)
      .returning();
    
    // Omit password from returned user
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword as User;
  },
  /**
   * Set the selected month
   */
  setSelectedMonth(year: number, month: number): void {
    selectedMonth.year = year;
    selectedMonth.month = month;
  },

  /**
   * Get current month data
   */
  async getCurrentMonth(userId?: number): Promise<MonthData> {
    // Return the selected month (which may have been changed by navigation)
    return this.getOrCreateMonth(selectedMonth.year, selectedMonth.month, userId);
  },
  
  /**
   * Get historical budget data for visualization and reporting
   * @param numMonths Number of months to fetch (including current month)
   * @param userId Optional user ID to get data for a specific user
   */
  async getBudgetHistory(numMonths: number = 6, userId?: number): Promise<MonthData[]> {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    
    const months: MonthData[] = [];
    
    // Start with current month and go back in time
    for (let i = 0; i < numMonths; i++) {
      let year = currentYear;
      let month = currentMonth - i;
      
      // Adjust year and month if going to previous year
      while (month <= 0) {
        year--;
        month += 12;
      }
      
      // Try to get month data, or create if it doesn't exist
      try {
        const monthData = await this.getOrCreateMonth(year, month, userId);
        months.push(monthData);
      } catch (error) {
        console.error(`Error getting data for ${month}/${year}:`, error);
      }
    }
    
    // Return months in chronological order (oldest first)
    return months.reverse();
  },
  
  /**
   * Get categories from the database
   */
  async getCategories() {
    return await db.query.categories.findMany({
      orderBy: [
        asc(categories.type),
        asc(categories.sortOrder)
      ],
    });
  },
  
  /**
   * Create a new category
   */
  async createCategory(data: any) {
    const [newCategory] = await db.insert(categories)
      .values({
        name: data.name,
        displayName: data.displayName,
        type: data.type,
        sortOrder: data.sortOrder,
      })
      .returning();
    
    return newCategory;
  },
  
  /**
   * Update a category
   */
  async updateCategory(id: number, data: any) {
    const [updatedCategory] = await db.update(categories)
      .set({
        name: data.name,
        displayName: data.displayName,
        type: data.type,
        sortOrder: data.sortOrder,
      })
      .where(eq(categories.id, id))
      .returning();
    
    return updatedCategory;
  },
  
  /**
   * Delete a category
   */
  async deleteCategory(id: number) {
    const [deletedCategory] = await db.delete(categories)
      .where(eq(categories.id, id))
      .returning();
    
    return deletedCategory ? true : false;
  },
  
  /**
   * Get or create a budget month for a user
   */
  async getOrCreateMonth(year: number, month: number, userId?: number): Promise<MonthData> {
    // Build the where clause based on available information
    const whereConditions = [
      eq(budgetMonths.year, year),
      eq(budgetMonths.month, month)
    ];
    
    // Add user ID condition if provided
    if (userId) {
      whereConditions.push(eq(budgetMonths.userId, userId));
    } else {
      // If no user ID, look for entries without a user (for backward compatibility)
      whereConditions.push(isNull(budgetMonths.userId));
    }
    
    // Check if the month exists
    let budgetMonth = await db.query.budgetMonths.findFirst({
      where: and(...whereConditions),
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
        dueDate: item.dueDate,
        isPaid: item.isPaid || false,
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
            dueDate: item.dueDate,
            isPaid: item.isPaid || false,
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
  async createMonth(year: number, month: number, userId?: number) {
    // Create the new month
    const [newMonth] = await db.insert(budgetMonths)
      .values({
        year,
        month,
        userId,
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
          dueDate: item.dueDate, // Keep the same due date (adjusted for the new month) if it exists
          isPaid: false, // Reset paid status for the new month
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
    
    // Parse due date if provided
    let dueDate = null;
    if (data.dueDate) {
      dueDate = new Date(data.dueDate);
    }
    
    // Create the budget item
    const [newItem] = await db.insert(budgetItems)
      .values({
        budgetMonthId: budgetMonth.id,
        categoryId: category.id,
        name: data.name,
        expectedAmount: data.expectedAmount.toString(),
        actualAmount: (data.actualAmount || 0).toString(),
        dueDate: dueDate,
        isPaid: data.isPaid || false,
      })
      .returning();
    
    return {
      id: newItem.id,
      name: newItem.name,
      category: data.category,
      expectedAmount: Number(newItem.expectedAmount),
      actualAmount: Number(newItem.actualAmount || 0),
      dueDate: newItem.dueDate,
      isPaid: newItem.isPaid || false,
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
    
    // Parse due date if provided
    let dueDate = null;
    if (data.dueDate) {
      dueDate = new Date(data.dueDate);
    }
    
    // Update the budget item
    const [updatedItem] = await db.update(budgetItems)
      .set({
        categoryId: category.id,
        name: data.name,
        expectedAmount: data.expectedAmount.toString(),
        actualAmount: (data.actualAmount || 0).toString(),
        dueDate: dueDate,
        isPaid: data.isPaid || false,
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
      dueDate: updatedItem.dueDate,
      isPaid: updatedItem.isPaid || false,
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
  
  /**
   * Import budget data to a specific month
   * @param year Default year to import data to
   * @param month Default month to import data to (1-12)
   * @param data Array of budget items to import
   */
  async importBudgetData(year: number, month: number, data: any[]) {
    // Track existing/created months to avoid redundant lookups
    const monthCache: Record<string, any> = {};
    
    // Get all categories to match imported data
    const allCategories = await db.query.categories.findMany();
    
    // Process each import item
    const importResults = {
      success: 0,
      failed: 0,
      categoryCreated: 0,
      monthsCreated: 0,
      errors: [] as string[]
    };
    
    for (const item of data) {
      try {
        // Determine which month to use for this item
        let targetYear = year;
        let targetMonth = month;
        
        // Check if item has a specific month field
        if (item.month) {
          const parsedMonth = parseMonthString(item.month.toString());
          if (parsedMonth) {
            targetYear = parsedMonth.year;
            targetMonth = parsedMonth.month;
          }
        }
        
        // Get or create the appropriate budget month for this item
        const monthKey = `${targetYear}-${targetMonth}`;
        let budgetMonth = monthCache[monthKey];
        
        if (!budgetMonth) {
          // Check if month exists in database
          budgetMonth = await db.query.budgetMonths.findFirst({
            where: and(
              eq(budgetMonths.year, targetYear),
              eq(budgetMonths.month, targetMonth)
            ),
          });
          
          // If month doesn't exist, create it
          if (!budgetMonth) {
            const [newMonth] = await db.insert(budgetMonths)
              .values({
                year: targetYear,
                month: targetMonth,
                isActive: true,
              })
              .returning();
            
            budgetMonth = newMonth;
            importResults.monthsCreated++;
          }
          
          // Store in cache for future lookups
          monthCache[monthKey] = budgetMonth;
        }
        
        // Try to find matching category or create a new one
        let categoryName = (item.category || '').toString().toLowerCase().trim();
        let categoryType = item.type || 'expense';
        
        if (!categoryName) {
          if (categoryType === 'revenue') {
            categoryName = 'income';
          } else {
            categoryName = 'miscellaneous';
          }
        }
        
        let category = allCategories.find(c => 
          c.name.toLowerCase() === categoryName &&
          c.type === categoryType
        );
        
        // Create category if it doesn't exist
        if (!category) {
          const displayName = categoryName
            .split(/[_\-\s]/)
            .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
          
          const [newCategory] = await db.insert(categories)
            .values({
              name: categoryName,
              displayName: displayName,
              type: categoryType,
              sortOrder: categoryType === 'revenue' ? 0 : 100, // Default sort order
            })
            .returning();
          
          category = newCategory;
          allCategories.push(newCategory);
          importResults.categoryCreated++;
        }
        
        // Parse amounts
        let expectedAmount = 0;
        let actualAmount = 0;
        
        if (item.expectedAmount !== undefined) {
          expectedAmount = typeof item.expectedAmount === 'number' 
            ? item.expectedAmount 
            : parseFloat(item.expectedAmount.toString().replace(/[^0-9.-]+/g, ''));
        } else if (item.budgetAmount !== undefined) {
          expectedAmount = typeof item.budgetAmount === 'number' 
            ? item.budgetAmount 
            : parseFloat(item.budgetAmount.toString().replace(/[^0-9.-]+/g, ''));
        } else if (item.amount !== undefined) {
          expectedAmount = typeof item.amount === 'number' 
            ? item.amount 
            : parseFloat(item.amount.toString().replace(/[^0-9.-]+/g, ''));
        }
        
        if (item.actualAmount !== undefined) {
          actualAmount = typeof item.actualAmount === 'number' 
            ? item.actualAmount 
            : parseFloat(item.actualAmount.toString().replace(/[^0-9.-]+/g, ''));
        }
        
        // Handle negation for expense amounts if needed
        if (categoryType === 'expense' && expectedAmount < 0) {
          expectedAmount = Math.abs(expectedAmount);
        }
        if (categoryType === 'expense' && actualAmount < 0) {
          actualAmount = Math.abs(actualAmount);
        }
        
        // Parse due date if available
        let dueDate = null;
        if (item.dueDate) {
          const parsedDate = parseFlexibleDate(item.dueDate.toString());
          if (parsedDate) dueDate = parsedDate;
        }
        
        // Parse payment status
        let isPaid = false;
        if (item.isPaid !== undefined) {
          isPaid = !!item.isPaid;
        } else if (item.paid !== undefined) {
          isPaid = !!item.paid;
        } else if (item.status && ['paid', 'complete', 'completed'].includes(item.status.toString().toLowerCase())) {
          isPaid = true;
        }
        
        // Create the budget item
        await db.insert(budgetItems)
          .values({
            budgetMonthId: budgetMonth.id,
            categoryId: category.id,
            name: item.name || item.description || 'Imported Item',
            expectedAmount: expectedAmount.toString(),
            actualAmount: actualAmount.toString(),
            dueDate: dueDate,
            isPaid: isPaid,
          });
        
        importResults.success++;
      } catch (error) {
        importResults.failed++;
        importResults.errors.push(`Error importing item ${item.name || 'Unknown'}: ${error}`);
      }
    }
    
    return importResults;
  },
};
