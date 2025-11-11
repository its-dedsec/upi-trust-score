import { z } from 'zod';

// UPI ID validation schema
export const upiIdSchema = z.string()
  .trim()
  .min(1, "UPI ID is required")
  .max(100, "UPI ID must be less than 100 characters")
  .regex(/^[\w.-]+@[\w.-]+$/, "Invalid UPI ID format. Expected format: username@bank");

// Fraud report validation schema
export const fraudReportSchema = z.object({
  upiId: upiIdSchema,
  reason: z.string()
    .trim()
    .min(5, "Reason must be at least 5 characters")
    .max(200, "Reason must be less than 200 characters"),
  details: z.string()
    .trim()
    .min(10, "Details must be at least 10 characters")
    .max(2000, "Details must be less than 2000 characters"),
  evidenceUrl: z.string()
    .trim()
    .max(500, "URL must be less than 500 characters")
    .url("Invalid URL format")
    .optional()
    .or(z.literal(''))
});

// Admin operations validation
export const addReportsCountSchema = z.number()
  .int("Must be a whole number")
  .min(1, "Must add at least 1 report")
  .max(100, "Cannot add more than 100 reports at once");

export const reportUpdateSchema = z.object({
  reason: z.string()
    .trim()
    .min(5, "Reason must be at least 5 characters")
    .max(500, "Reason must be less than 500 characters"),
  status: z.enum(['open', 'resolved', 'rejected'])
});

export const upiUpdateSchema = z.object({
  upi_id: upiIdSchema
});
