import { useCallback } from 'react';

import { getLatestRateUseCase } from '@/application/exchange_rate/use_cases/getLatestRateUseCase';
import { type CurrencyCode } from '@/domains/exchange_rate/types';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';

export function useExchangeRate() {
  const { loading, error, run } = useLoadingTask();

  const getRate = useCallback(
    async (from: CurrencyCode, to: CurrencyCode = 'TWD'): Promise<number> => {
      const result = await run(async () => {
        return getLatestRateUseCase.execute({ from, to });
      });
      return result || 1;
    },
    [run],
  );

  return {
    getRate,
    loading,
    error,
  };
}
