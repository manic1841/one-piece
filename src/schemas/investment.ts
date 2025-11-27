import { z } from "zod";
import { TimestampSchema } from './helper';


// Investment Type Schema
export const InvestmentTypeSchema = z.enum(["stock", "etf", "bond"]);

export type InvestmentType = z.infer<typeof InvestmentTypeSchema>;

// InvestmentHolding Schema
export const InvestmentHoldingSchema = z.object({
    symbol: z.string(),
    name: z.string(),
    shares: z.number(),
    averageCost: z.number(),
    totalCost: z.number(),
    type: InvestmentTypeSchema.optional(),
    leverageRatio: z.number().optional(),
});

export type InvestmentHolding = z.infer<typeof InvestmentHoldingSchema>;

// InvestmentSnapshot Schema
export const InvestmentSnapshotSchema = z.object({
    date: TimestampSchema,
    holdings: z.array(InvestmentHoldingSchema),
    totalCost: z.number(),
    totalValue: z.number(),
    unrealizedGain: z.number(),
});

export type InvestmentSnapshot = z.infer<typeof InvestmentSnapshotSchema>;