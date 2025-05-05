import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  displayName: text("display_name").notNull(),
  type: text("type").notNull(), // 'revenue' or 'expense'
  sortOrder: integer("sort_order").notNull().default(0),
});

// Budget months table (stores metadata for each month)
export const budgetMonths = pgTable("budget_months", {
  id: serial("id").primaryKey(),
  year: integer("year").notNull(),
  month: integer("month").notNull(), // 1-12
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

// Budget items table (stores individual budget items)
export const budgetItems = pgTable("budget_items", {
  id: serial("id").primaryKey(),
  budgetMonthId: integer("budget_month_id").notNull().references(() => budgetMonths.id),
  categoryId: integer("category_id").notNull().references(() => categories.id),
  name: text("name").notNull(),
  expectedAmount: decimal("expected_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  actualAmount: decimal("actual_amount", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  budgetItems: many(budgetItems),
}));

export const budgetMonthsRelations = relations(budgetMonths, ({ many }) => ({
  budgetItems: many(budgetItems),
}));

export const budgetItemsRelations = relations(budgetItems, ({ one }) => ({
  category: one(categories, {
    fields: [budgetItems.categoryId],
    references: [categories.id],
  }),
  budgetMonth: one(budgetMonths, {
    fields: [budgetItems.budgetMonthId],
    references: [budgetMonths.id],
  }),
}));

// Define schemas for validation
export const categoriesInsertSchema = createInsertSchema(categories);
export type CategoryInsert = z.infer<typeof categoriesInsertSchema>;
export const categoriesSelectSchema = createSelectSchema(categories);
export type Category = z.infer<typeof categoriesSelectSchema>;

export const budgetMonthsInsertSchema = createInsertSchema(budgetMonths);
export type BudgetMonthInsert = z.infer<typeof budgetMonthsInsertSchema>;
export const budgetMonthsSelectSchema = createSelectSchema(budgetMonths);
export type BudgetMonth = z.infer<typeof budgetMonthsSelectSchema>;

export const budgetItemsInsertSchema = createInsertSchema(budgetItems);
export type BudgetItemInsert = z.infer<typeof budgetItemsInsertSchema>;
export const budgetItemsSelectSchema = createSelectSchema(budgetItems);
export type BudgetItem = z.infer<typeof budgetItemsSelectSchema>;

// Custom schemas for the API
export const budgetItemFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  expectedAmount: z.coerce.number().min(0, "Expected amount must be a positive number"),
  actualAmount: z.coerce.number().min(0, "Actual amount must be a positive number").optional(),
});

export type BudgetItemForm = z.infer<typeof budgetItemFormSchema>;
