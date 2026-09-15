import { afterEach, describe, expect, it, vi } from 'vitest';

import { ExchangeRateApiClient } from './exchangeRateApiClient';

describe('ExchangeRateApiClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('normalizes USD rates to uppercase currency codes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            date: '2026-09-14',
            usd: { twd: 31.77544, eur: 0.919, jpy: 155.2 },
          }),
      }),
    );

    const client = new ExchangeRateApiClient();
    const { rates } = await client.fetchUsdRates();

    expect(rates).toEqual({ TWD: 31.77544, EUR: 0.919, JPY: 155.2 });
  });

  it('filters non-numeric rate entries', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            date: '2026-09-14',
            usd: { twd: 31.77544, '2sats': 12236.78739231 },
          }),
      }),
    );

    const client = new ExchangeRateApiClient();
    const { rates } = await client.fetchUsdRates();

    expect(rates).toEqual({ TWD: 31.77544 });
  });

  it('throws on HTTP error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: () => Promise.resolve({}),
      }),
    );

    const client = new ExchangeRateApiClient();

    await expect(client.fetchUsdRates()).rejects.toThrow('Exchange rate API HTTP error: 503');
  });

  it('throws when the response has no USD rate map', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ date: '2026-09-14' }),
      }),
    );

    const client = new ExchangeRateApiClient();

    await expect(client.fetchUsdRates()).rejects.toThrow(
      'Exchange rate API returned an unexpected response',
    );
  });
});
