import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { z } from "zod";
import { storage } from "./storage";
import { budgetItemFormSchema, categories } from "@shared/schema";
import { eq } from "drizzle-orm";
import { createObjectCsvWriter } from 'csv-writer';
import path from 'path';
import fs from 'fs';

export async function registerRoutes(app: Express): Promise<Server> {
  // Get current month budget data
  app.get('/api/budget/current-month', async (req, res) => {
    try {
      const currentMonth = await storage.getCurrentMonth();
      return res.json(currentMonth);
    } catch (error) {
      console.error('Error fetching current month data:', error);
      return res.status(500).json({ error: 'Failed to fetch current month data' });
    }
  });
  
  // Navigate to a specific month
  app.post('/api/budget/navigate', async (req, res) => {
    try {
      const schema = z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
      });
      
      const validatedData = schema.parse(req.body);
      const date = new Date(validatedData.date);
      
      // Get or create month data
      const monthData = await storage.getOrCreateMonth(date.getFullYear(), date.getMonth() + 1);
      return res.json(monthData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error navigating to month:', error);
      return res.status(500).json({ error: 'Failed to navigate to month' });
    }
  });
  
  // Import budget data
  app.post('/api/budget/import', async (req, res) => {
    try {
      const schema = z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD'),
        data: z.array(z.any())
      });
      
      const validatedData = schema.parse(req.body);
      const date = new Date(validatedData.date);
      
      // Import the data to the specified month
      const result = await storage.importBudgetData(
        date.getFullYear(), 
        date.getMonth() + 1, 
        validatedData.data
      );
      
      return res.json({ 
        message: `Successfully imported ${result.success} items, created ${result.categoryCreated} categories`,
        ...result,
        success: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error importing budget data:', error);
      return res.status(500).json({ error: 'Failed to import budget data' });
    }
  });
  
  // Get budget history for visualization
  app.get('/api/budget/history/:months?', async (req, res) => {
    try {
      const monthsParam = req.params.months;
      const months = monthsParam ? parseInt(monthsParam) : 6; // Default to 6 months
      
      if (isNaN(months) || months < 1 || months > 36) {
        return res.status(400).json({ error: 'Invalid number of months. Must be between 1 and 36.' });
      }
      
      const historyData = await storage.getBudgetHistory(months);
      return res.json(historyData);
    } catch (error) {
      console.error('Error fetching budget history:', error);
      return res.status(500).json({ error: 'Failed to fetch budget history' });
    }
  });
  
  // Export current month budget as CSV
  app.get('/api/budget/export/current', async (req, res) => {
    try {
      const currentMonth = await storage.getCurrentMonth();
      
      // Create CSV content
      let csvContent = 'Month,' + currentMonth.month + '\n\n';
      
      // Revenue section
      csvContent += 'REVENUE\n';
      csvContent += 'Name,Expected Amount,Actual Amount,Due Date,Paid,Variance\n';
      
      for (const item of currentMonth.revenueItems) {
        const dueDate = item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '';
        csvContent += `"${item.name}",${item.expectedAmount},${item.actualAmount},"${dueDate}",${item.isPaid ? 'Yes' : 'No'},${item.variance}\n`;
      }
      
      csvContent += `Total,${currentMonth.totals.expectedTotalRevenue},${currentMonth.totals.actualTotalRevenue},,,"${currentMonth.totals.revenueVariance}"\n\n`;
      
      // Expenses section
      csvContent += 'EXPENSES\n';
      
      for (const category of currentMonth.expenseCategories) {
        csvContent += `${category.displayName.toUpperCase()}\n`;
        csvContent += 'Name,Expected Amount,Actual Amount,Due Date,Paid,Variance\n';
        
        for (const item of category.items) {
          const dueDate = item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '';
          csvContent += `"${item.name}",${item.expectedAmount},${item.actualAmount},"${dueDate}",${item.isPaid ? 'Yes' : 'No'},${item.variance}\n`;
        }
        
        csvContent += `Total,${category.totals.expectedTotal},${category.totals.actualTotal},,,"${category.totals.variance}"\n\n`;
      }
      
      // Summary section
      csvContent += 'SUMMARY\n';
      csvContent += `Total Revenue,${currentMonth.totals.expectedTotalRevenue},${currentMonth.totals.actualTotalRevenue},,,"${currentMonth.totals.revenueVariance}"\n`;
      csvContent += `Total Expenses,${currentMonth.totals.expectedTotalExpenses},${currentMonth.totals.actualTotalExpenses},,,"${currentMonth.totals.expensesVariance}"\n`;
      csvContent += `Net Income,${currentMonth.totals.expectedNetIncome},${currentMonth.totals.actualNetIncome},,,"${currentMonth.totals.netIncomeVariance}"\n`;
      
      // Set headers and send response
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="budget-${currentMonth.month.replace(' ', '-')}.csv"`);
      return res.send(csvContent);
    } catch (error) {
      console.error('Error exporting budget to CSV:', error);
      return res.status(500).json({ error: 'Failed to export budget data' });
    }
  });
  
  // Export budget history as CSV
  app.get('/api/budget/export/history/:months?', async (req, res) => {
    try {
      const monthsParam = req.params.months;
      const months = monthsParam ? parseInt(monthsParam) : 6; // Default to 6 months
      
      if (isNaN(months) || months < 1 || months > 36) {
        return res.status(400).json({ error: 'Invalid number of months. Must be between 1 and 36.' });
      }
      
      const historyData = await storage.getBudgetHistory(months);
      
      // Create CSV content
      let csvContent = 'BUDGET HISTORY\n\n';
      
      // Months row
      csvContent += 'Category,';
      for (const month of historyData) {
        csvContent += `${month.month} (Expected),${month.month} (Actual),`;
      }
      csvContent += '\n';
      
      // Revenue row
      csvContent += 'Total Revenue,';
      for (const month of historyData) {
        csvContent += `${month.totals.expectedTotalRevenue},${month.totals.actualTotalRevenue},`;
      }
      csvContent += '\n';
      
      // Expenses row
      csvContent += 'Total Expenses,';
      for (const month of historyData) {
        csvContent += `${month.totals.expectedTotalExpenses},${month.totals.actualTotalExpenses},`;
      }
      csvContent += '\n';
      
      // Net Income row
      csvContent += 'Net Income,';
      for (const month of historyData) {
        csvContent += `${month.totals.expectedNetIncome},${month.totals.actualNetIncome},`;
      }
      csvContent += '\n';
      
      // Set headers and send response
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="budget-history-${months}-months.csv"`);
      return res.send(csvContent);
    } catch (error) {
      console.error('Error exporting budget history to CSV:', error);
      return res.status(500).json({ error: 'Failed to export budget history data' });
    }
  });
  
  // Save budget data
  app.post('/api/budget/save', async (req, res) => {
    try {
      // Nothing to do here, as updates happen in real-time
      return res.json({ success: true, message: 'Budget data saved successfully' });
    } catch (error) {
      console.error('Error saving budget data:', error);
      return res.status(500).json({ error: 'Failed to save budget data' });
    }
  });
  
  // Create budget item
  app.post('/api/budget/items', async (req, res) => {
    try {
      const validatedData = budgetItemFormSchema.parse(req.body);
      const newItem = await storage.createBudgetItem(validatedData);
      return res.status(201).json(newItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating budget item:', error);
      return res.status(500).json({ error: 'Failed to create budget item' });
    }
  });
  
  // Update budget item
  app.put('/api/budget/items/:id', async (req, res) => {
    try {
      const idSchema = z.object({
        id: z.coerce.number().positive('Invalid ID')
      });
      
      const { id } = idSchema.parse({ id: req.params.id });
      const validatedData = budgetItemFormSchema.parse(req.body);
      
      const updatedItem = await storage.updateBudgetItem(id, validatedData);
      
      if (!updatedItem) {
        return res.status(404).json({ error: 'Budget item not found' });
      }
      
      return res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error updating budget item:', error);
      return res.status(500).json({ error: 'Failed to update budget item' });
    }
  });
  
  // Delete budget item
  app.delete('/api/budget/items/:id', async (req, res) => {
    try {
      const idSchema = z.object({
        id: z.coerce.number().positive('Invalid ID')
      });
      
      const { id } = idSchema.parse({ id: req.params.id });
      const result = await storage.deleteBudgetItem(id);
      
      if (!result) {
        return res.status(404).json({ error: 'Budget item not found' });
      }
      
      return res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error deleting budget item:', error);
      return res.status(500).json({ error: 'Failed to delete budget item' });
    }
  });

  // Category management routes
  
  // Get all categories
  app.get('/api/categories', async (req, res) => {
    try {
      const allCategories = await db.query.categories.findMany({
        orderBy: (categories, { asc }) => [asc(categories.sortOrder)],
      });
      return res.json(allCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({ error: 'Failed to fetch categories' });
    }
  });
  
  // Create a new category
  app.post('/api/categories', async (req, res) => {
    try {
      const categorySchema = z.object({
        name: z.string().min(1, "Name is required"),
        displayName: z.string().min(1, "Display name is required"),
        type: z.enum(["revenue", "expense"], {
          required_error: "Type is required"
        }),
        sortOrder: z.coerce.number().int().nonnegative(),
      });
      
      const validatedData = categorySchema.parse(req.body);
      
      // Check if category name already exists
      const existingCategory = await db.query.categories.findFirst({
        where: eq(categories.name, validatedData.name),
      });
      
      if (existingCategory) {
        return res.status(400).json({ error: 'Category with this name already exists' });
      }
      
      // Create new category
      const [newCategory] = await db.insert(categories)
        .values(validatedData)
        .returning();
      
      return res.status(201).json(newCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating category:', error);
      return res.status(500).json({ error: 'Failed to create category' });
    }
  });
  
  // Update a category
  app.put('/api/categories/:id', async (req, res) => {
    try {
      const idSchema = z.object({
        id: z.coerce.number().positive('Invalid ID')
      });
      
      const categorySchema = z.object({
        name: z.string().min(1, "Name is required"),
        displayName: z.string().min(1, "Display name is required"),
        type: z.enum(["revenue", "expense"], {
          required_error: "Type is required"
        }),
        sortOrder: z.coerce.number().int().nonnegative(),
      });
      
      const { id } = idSchema.parse({ id: req.params.id });
      const validatedData = categorySchema.parse(req.body);
      
      // Check if category exists
      const existingCategory = await db.query.categories.findFirst({
        where: eq(categories.id, id),
      });
      
      if (!existingCategory) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      // Check if name change conflicts with existing category
      if (validatedData.name !== existingCategory.name) {
        const nameConflict = await db.query.categories.findFirst({
          where: eq(categories.name, validatedData.name),
        });
        
        if (nameConflict) {
          return res.status(400).json({ error: 'Category with this name already exists' });
        }
      }
      
      // Update category
      const [updatedCategory] = await db.update(categories)
        .set(validatedData)
        .where(eq(categories.id, id))
        .returning();
      
      return res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error updating category:', error);
      return res.status(500).json({ error: 'Failed to update category' });
    }
  });
  
  // Delete a category
  app.delete('/api/categories/:id', async (req, res) => {
    try {
      const idSchema = z.object({
        id: z.coerce.number().positive('Invalid ID')
      });
      
      const { id } = idSchema.parse({ id: req.params.id });
      
      // Check if category exists
      const existingCategory = await db.query.categories.findFirst({
        where: eq(categories.id, id),
      });
      
      if (!existingCategory) {
        return res.status(404).json({ error: 'Category not found' });
      }
      
      // Prevent deletion of default categories
      if (existingCategory.name === 'revenue' || existingCategory.name === 'other') {
        return res.status(400).json({ error: 'Cannot delete default categories' });
      }
      
      // Delete category (and associated budget items through cascade)
      const [deletedCategory] = await db.delete(categories)
        .where(eq(categories.id, id))
        .returning();
      
      return res.json({ success: true, deleted: deletedCategory });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error deleting category:', error);
      return res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
