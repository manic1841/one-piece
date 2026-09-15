import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GetLatestRateUseCase } from './getLatestRateUseCase';

vi.mock('@/infra/external/exchangeRateApiClient', () => ({
  exchangeRateApiClient: {
    fetchUsdRates: vi.fn(),
  },
}));

describe('GetLatestRateUseCase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('computes cross rate to TWD from USD-based rates', async () => {
    const { exchangeRateApiClient } = await import('@/infra/external/exchangeRateApiClient');

    vi.mocked(exchangeRateApiClient.fetchUsdRates).mockResolvedValue({
      rates: { TWD: 31.5, EUR: 0.9 },
    });

    const useCase = new GetLatestRateUseCase();
    const rate = await useCase.execute({ from: 'EUR', to: 'TWD' });

    // 31.5 / 0.9 = 35 TWD per EUR
    expect(rate).toBe(35);
  });

  it('returns 1 when from equals to', async () => {
    const { exchangeRateApiClient } = await import('@/infra/external/exchangeRateApiClient');

    vi.mocked(exchangeRateApiClient.fetchUsdRates).mockResolvedValue({ rates: {} });

    const useCase = new GetLatestRateUseCase();
    const rate = await useCase.execute({ from: 'TWD', to: 'TWD' });

    expect(rate).toBe(1);
    expect(exchangeRateApiClient.fetchUsdRates).not.toHaveBeenCalled();
  });

  it('serves repeated conversions from cache without refetching', async () => {
    const { exchangeRateApiClient } = await import('@/infra/external/exchangeRateApiClient');

    vi.mocked(exchangeRateApiClient.fetchUsdRates).mockResolvedValue({
      rates: { TWD: 31.5 },
    });

    const useCase = new GetLatestRateUseCase();
    await useCase.execute({ from: 'USD', to: 'TWD' });
    const second = await useCase.execute({ from: 'USD', to: 'TWD' });

    expect(second).toBe(31.5);
    expect(exchangeRateApiClient.fetchUsdRates).toHaveBeenCalledTimes(1);
  });

  it('throws a named error when a rate is missing', async () => {
    const { exchangeRateApiClient } = await import('@/infra/external/exchangeRateApiClient');

    vi.mocked(exchangeRateApiClient.fetchUsdRates).mockResolvedValue({ rates: {} });

    const useCase = new GetLatestRateUseCase();

    await expect(useCase.execute({ from: 'EUR', to: 'TWD' })).rejects.toThrow(
      'Rate not found for EUR',
    );
  });
});
