import { rterExchangeRateClient } from '@/infra/external/rterExchangeRateClient';
import { type CurrencyCode } from '@/domains/exchange_rate/types';

interface GetLatestRateRequest {
  from: CurrencyCode;
  to?: CurrencyCode;
}

export class GetLatestRateUseCase {
  private cache: Map<string, { rate: number; timestamp: number }> = new Map();
  private readonly CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour cache

  async execute(request: GetLatestRateRequest): Promise<number> {
    const { from, to = 'TWD' } = request;

    if (!from || from === to) return 1;

    const cacheKey = `${from}_${to}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.CACHE_DURATION_MS) {
      return cached.rate;
    }

    try {
      const data = await rterExchangeRateClient.fetchAllRates();

      const getUsdRate = (currency: string): number => {
        if (currency === 'USD') return 1;
        const pair = `USD${currency}`;
        const rate = data[pair]?.Exrate;
        if (typeof rate !== 'number') {
          throw new Error(`Rate not found for ${currency}`);
        }
        return rate;
      };

      const fromUsdRate = getUsdRate(from);
      const toUsdRate = getUsdRate(to);

      // (USD to toCurrency) / (USD to fromCurrency) = (fromCurrency to toCurrency)
      const rate = toUsdRate / fromUsdRate;

      this.cache.set(cacheKey, { rate, timestamp: now });
      return rate;
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
      throw error;
    }
  }
}

export const getLatestRateUseCase = new GetLatestRateUseCase();
