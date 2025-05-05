import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { z } from "zod";
import { storage } from "./storage";
import { budgetItemFormSchema } from "@shared/schema";

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

  const httpServer = createServer(app);
  return httpServer;
}
