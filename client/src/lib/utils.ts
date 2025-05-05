import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a number as a currency string
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(value);
}

/**
 * Format a number as a percentage string
 */
export function formatPercentage(value: number): string {
  return new Intl.NumberFormat('en-US', { 
    style: 'percent', 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  }).format(value / 100);
}

/**
 * Get the CSS class for a variance value
 * @param value Variance value
 * @param isRevenue Whether this is a revenue item (affects the color logic)
 */
export function getVarianceClass(value: number, isRevenue: boolean): string {
  if (value === 0) return "text-gray-500";
  
  if (isRevenue) {
    // For revenue, positive variance is good
    return value > 0 ? "text-positive" : "text-negative";
  } else {
    // For expenses, positive variance is bad
    return value > 0 ? "text-negative" : "text-positive";
  }
}
