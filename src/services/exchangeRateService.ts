export class ExchangeRateService {
  private cache: Map<string, { rate: number; timestamp: number }> = new Map();
  private CACHE_DURATION_MS = 1000 * 60 * 60; // 1 hour cache

  async getLatestRate(fromCurrency: string, toCurrency: string = 'TWD'): Promise<number> {
    if (!fromCurrency || fromCurrency === toCurrency) return 1;

    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.CACHE_DURATION_MS) {
      return cached.rate;
    }

    try {
      const response = await fetch(
        `https://api.frankfurter.app/latest?from=${fromCurrency}&to=${toCurrency}`,
      );

      if (!response.ok) {
        throw new Error(`Frankfurter API HTTP error: ${response.status}`);
      }

      const data = await response.json();
      const rate = data.rates[toCurrency];

      if (typeof rate !== 'number') {
        throw new Error(`Invalid rate received for ${toCurrency}`);
      }

      this.cache.set(cacheKey, { rate, timestamp: now });
      return rate;
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
      throw error;
    }
  }
}

export const exchangeRateService = new ExchangeRateService();
