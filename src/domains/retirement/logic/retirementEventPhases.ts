import type { RetirementOneTimeEvent } from '@/domains/retirement/types';

import { resolveGrowthRate } from './resolveGrowthRate';

export interface NormalizedRetirementEventPhase {
  name: string;
  startYear: number;
  endYear: number;
  amount: number;
  growthRate?: number;
}

export const normalizeRetirementEventPhases = (
  event: RetirementOneTimeEvent,
): NormalizedRetirementEventPhase[] => {
  if (event.phases && event.phases.length > 0) {
    return event.phases.map((phase) => ({
      name: phase.name,
      startYear: phase.startYear,
      endYear: phase.endYear,
      amount: phase.amount,
      growthRate: phase.growthRate,
    }));
  }

  if (typeof event.year === 'number' && typeof event.amount === 'number') {
    return [
      {
        name: event.name,
        startYear: event.year,
        endYear: event.year,
        amount: event.amount,
      },
    ];
  }

  return [];
};

export const calculateRetirementEventPhaseAmount = (
  phase: NormalizedRetirementEventPhase,
  year: number,
  planInflationRate: number,
): number => {
  if (year < phase.startYear || year > phase.endYear) {
    return 0;
  }

  const growth = resolveGrowthRate(phase.growthRate, planInflationRate);
  return phase.amount * Math.pow(1 + growth / 100, year - phase.startYear);
};
