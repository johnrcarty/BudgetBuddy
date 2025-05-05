import { db } from "./index";
import * as schema from "@shared/schema";
import { format } from "date-fns";

async function seed() {
  try {
    console.log("Seeding database...");
    
    // Check if categories already exist
    const existingCategories = await db.query.categories.findMany();
    
    // Only seed if no categories exist
    if (existingCategories.length === 0) {
      console.log("Seeding categories...");
      
      // Create categories
      await db.insert(schema.categories).values([
        // Revenue category
        {
          name: "revenue",
          displayName: "Revenue",
          type: "revenue",
          sortOrder: 0
        },
        // Expense categories
        {
          name: "housing",
          displayName: "Housing",
          type: "expense",
          sortOrder: 1
        },
        {
          name: "transportation",
          displayName: "Transportation",
          type: "expense",
          sortOrder: 2
        },
        {
          name: "food",
          displayName: "Food",
          type: "expense",
          sortOrder: 3
        },
        {
          name: "other",
          displayName: "Other",
          type: "expense",
          sortOrder: 4
        }
      ]);
      
      // Create current month
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;
      
      console.log(`Creating budget month for ${format(today, 'MMMM yyyy')}...`);
      
      const [budgetMonth] = await db.insert(schema.budgetMonths).values({
        year: currentYear,
        month: currentMonth,
        isActive: true
      }).returning();
      
      // Get category IDs
      const categories = await db.query.categories.findMany();
      const categoryMap = categories.reduce((map, category) => {
        map[category.name] = category.id;
        return map;
      }, {} as Record<string, number>);
      
      // Create sample budget items
      console.log("Creating sample budget items...");
      
      // Revenue items
      await db.insert(schema.budgetItems).values([
        {
          budgetMonthId: budgetMonth.id,
          categoryId: categoryMap.revenue,
          name: "Salary",
          expectedAmount: "4500",
          actualAmount: "4500"
        },
        {
          budgetMonthId: budgetMonth.id,
          categoryId: categoryMap.revenue,
          name: "Freelance Work",
          expectedAmount: "1000",
          actualAmount: "1200"
        },
        {
          budgetMonthId: budgetMonth.id,
          categoryId: categoryMap.revenue,
          name: "Dividends",
          expectedAmount: "250",
          actualAmount: "220"
        }
      ]);
      
      // Housing expenses
      await db.insert(schema.budgetItems).values([
        {
          budgetMonthId: budgetMonth.id,
          categoryId: categoryMap.housing,
          name: "Rent",
          expectedAmount: "1600",
          actualAmount: "1600"
        },
        {
          budgetMonthId: budgetMonth.id,
          categoryId: categoryMap.housing,
          name: "Utilities",
          expectedAmount: "200",
          actualAmount: "245"
        },
        {
          budgetMonthId: budgetMonth.id,
          categoryId: categoryMap.housing,
          name: "Internet",
          expectedAmount: "80",
          actualAmount: "80"
        }
      ]);
      
      // Transportation expenses
      await db.insert(schema.budgetItems).values([
        {
          budgetMonthId: budgetMonth.id,
          categoryId: categoryMap.transportation,
          name: "Car Payment",
          expectedAmount: "350",
          actualAmount: "350"
        },
        {
          budgetMonthId: budgetMonth.id,
          categoryId: categoryMap.transportation,
          name: "Gas",
          expectedAmount: "160",
          actualAmount: "185"
        }
      ]);
      
      // Food expenses
      await db.insert(schema.budgetItems).values([
        {
          budgetMonthId: budgetMonth.id,
          categoryId: categoryMap.food,
          name: "Groceries",
          expectedAmount: "500",
          actualAmount: "545"
        },
        {
          budgetMonthId: budgetMonth.id,
          categoryId: categoryMap.food,
          name: "Dining Out",
          expectedAmount: "250",
          actualAmount: "310"
        }
      ]);
      
      // Other expenses
      await db.insert(schema.budgetItems).values([
        {
          budgetMonthId: budgetMonth.id,
          categoryId: categoryMap.other,
          name: "Entertainment",
          expectedAmount: "150",
          actualAmount: "180"
        },
        {
          budgetMonthId: budgetMonth.id,
          categoryId: categoryMap.other,
          name: "Subscriptions",
          expectedAmount: "60",
          actualAmount: "60"
        },
        {
          budgetMonthId: budgetMonth.id,
          categoryId: categoryMap.other,
          name: "Clothing",
          expectedAmount: "100",
          actualAmount: "150"
        }
      ]);
      
      console.log("Database seeding completed successfully!");
    } else {
      console.log("Database already contains data, skipping seed.");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

seed();
