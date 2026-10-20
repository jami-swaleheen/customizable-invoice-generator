import { z } from "zod";

export const partySchema = z.object({
  name: z.string().trim().max(200).default(""),
  email: z.string().trim().max(200).default(""),
  address: z.string().trim().max(500).default(""),
});

export const lineItemSchema = z.object({
  id: z.string(),
  description: z.string().trim().max(500).default(""),
  qty: z.number().finite().min(0),
  unit_price_cents: z.number().int().min(0),
});

export const customFieldSchema = z.object({
  id: z.string(),
  label: z.string().trim().max(200).default(""),
  value: z.string().trim().max(1000).default(""),
  visible: z.boolean().default(true),
});

export const invoiceInputSchema = z.object({
  invoice_number: z.string().trim().min(1).max(50),
  issue_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  business: partySchema,
  customer: partySchema,
  notes: z.string().trim().max(2000).default(""),
  line_items: z.array(lineItemSchema).min(1, "Add at least one line item"),
  custom_fields: z.array(customFieldSchema).default([]),
  discount_cents: z.number().int().min(0),
  tax_rate_bp: z.number().int().min(0).max(100_000),
});

export const invoiceRowSchema = invoiceInputSchema.extend({
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Party = z.infer<typeof partySchema>;
export type LineItemInput = z.infer<typeof lineItemSchema>;
export type CustomField = z.infer<typeof customFieldSchema>;
export type InvoiceInput = z.infer<typeof invoiceInputSchema>;
export type InvoiceRow = z.infer<typeof invoiceRowSchema>;

export const sendEmailSchema = z.object({
  invoice_id: z.string().uuid(),
  to: z.string().email(),
});
