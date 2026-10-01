import { useEffect, useState } from 'react';

import { GetFinancialPeriodUseCase } from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { type FinancialPeriod } from '@/domains/financial_period/schemas';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';

import { parseYearMonthParam } from '../viewmodels/yearMonthParam';

export type ClosePeriodRouteState =
  | { status: 'invalid' }
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; errorMessage: string }
  | { status: 'ready'; yearMonth: string; period: FinancialPeriod };

/** The workspace route's unit of truth: the param plus its period record, or why we show none. */
export const useClosePeriodRoute = (
  householdId: string,
  rawYearMonth: string | undefined,
): ClosePeriodRouteState => {
  const yearMonth = parseYearMonthParam(rawYearMonth);
  const requestKey = `${householdId}\u0000${yearMonth ?? ''}`;
  const [result, setResult] = useState<{ key: string; state: ClosePeriodRouteState } | null>(null);

  useEffect(() => {
    if (yearMonth === null || !householdId) return;
    let active = true;
    void new GetFinancialPeriodUseCase()
      .execute({ householdId, yearMonth })
      .then((period) => {
        if (!active) return;
        setResult({
          key: requestKey,
          state: period ? { status: 'ready', yearMonth, period } : { status: 'not-found' },
        });
      })
      .catch(() => {
        if (!active) return;
        setResult({
          key: requestKey,
          state: { status: 'error', errorMessage: MONTHLY_CLOSE_LABELS.LOAD_ERROR },
        });
      });
    return () => {
      active = false;
    };
  }, [householdId, yearMonth, requestKey]);

  if (yearMonth === null) return { status: 'invalid' };
  if (result && result.key === requestKey) return result.state;
  return { status: 'loading' };
};
