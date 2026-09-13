import { z } from "zod";

const money = z.union([z.string(), z.number()]).transform(String).pipe(z.string().regex(/^\d+(\.\d{1,4})?$/));
const qty = z.union([z.string(), z.number()]).transform(String).pipe(z.string().regex(/^\d+(\.\d{1,3})?$/));

export const createSaleSchema = z.object({
  customerId: z.string().cuid().optional().nullable(),
  currency: z.enum(["USD", "LBP"]),
  discountAmount: money.default("0"),
  notes: z.string().trim().max(1000).optional(),
  items: z.array(z.object({
    productId: z.string().cuid(),
    quantity: qty
  })).min(1).max(200),
  payments: z.array(z.object({
    amount: money,
    currency: z.enum(["USD", "LBP"]),
    method: z.enum(["CASH", "CARD", "WHISH", "OMT", "BANK_TRANSFER", "OTHER"]),
    reference: z.string().trim().max(120).optional()
  })).max(20).default([])
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
