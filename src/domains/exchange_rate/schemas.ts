import { z } from 'zod';

export const CurrencyCodeSchema = z.string().length(3).transform(val => val.toUpperCase());

export const ExchangeRateSchema = z.object({
  from: CurrencyCodeSchema,
  to: CurrencyCodeSchema,
  rate: z.number().positive(),
  timestamp: z.number(),
});
