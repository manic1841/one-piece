import { z } from 'zod';
import { CurrencyCodeSchema, ExchangeRateSchema } from './schemas';

export type CurrencyCode = z.infer<typeof CurrencyCodeSchema>;
export type ExchangeRate = z.infer<typeof ExchangeRateSchema>;
