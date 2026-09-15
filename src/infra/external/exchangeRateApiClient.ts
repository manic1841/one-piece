export interface ExchangeRateResponse {
  rates: Record<string, number>;
}

const API_URL =
  'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json';

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

export class ExchangeRateApiClient {
  async fetchUsdRates(): Promise<ExchangeRateResponse> {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Exchange rate API HTTP error: ${response.status}`);
    }

    const data = (await response.json()) as { usd?: Record<string, unknown> };
    const usdRates = data.usd;
    if (!usdRates || typeof usdRates !== 'object') {
      throw new Error('Exchange rate API returned an unexpected response');
    }

    const rates: Record<string, number> = {};
    for (const [currency, rate] of Object.entries(usdRates)) {
      const code = currency.toUpperCase();
      if (typeof rate === 'number' && CURRENCY_CODE_PATTERN.test(code)) {
        rates[code] = rate;
      }
    }

    return { rates };
  }
}

export const exchangeRateApiClient = new ExchangeRateApiClient();
