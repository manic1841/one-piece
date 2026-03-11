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
      const isDev = import.meta.env.DEV;
      const baseUrl = isDev ? '/rter-api' : 'https://tw.rter.info';
      const response = await fetch(`${baseUrl}/capi.php`);

      if (!response.ok) {
        throw new Error(`rter.info API HTTP error: ${response.status}`);
      }

      const data = await response.json();

      const getUsdRate = (currency: string): number => {
        if (currency === 'USD') return 1;
        const pair = `USD${currency}`;
        const rate = data[pair]?.Exrate;
        if (typeof rate !== 'number') {
          throw new Error(`Rate not found for ${currency}`);
        }
        return rate;
      };

      const fromUsdRate = getUsdRate(fromCurrency);
      const toUsdRate = getUsdRate(toCurrency);

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

export const exchangeRateService = new ExchangeRateService();
