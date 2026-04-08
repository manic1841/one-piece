import { CalculationMode, type RetirementOneTimeEvent } from '@/domains/retirement/types';

export interface NormalizedRetirementEventPhase {
  name: string;
  startYear: number;
  endYear: number;
  mode: (typeof CalculationMode)[keyof typeof CalculationMode];
  amount?: number;
  growthRate?: number;
  percentage?: number;
  linkedIncomeId?: string;
}

export const normalizeRetirementEventPhases = (
  event: RetirementOneTimeEvent,
): NormalizedRetirementEventPhase[] => {
  if (event.phases && event.phases.length > 0) {
    return event.phases.map((phase) => ({
      name: phase.name,
      startYear: phase.startYear,
      endYear: phase.endYear,
      mode: phase.mode,
      amount: phase.amount,
      growthRate: phase.growthRate ?? 0,
      percentage: phase.percentage,
      linkedIncomeId: phase.linkedIncomeId,
    }));
  }

  if (typeof event.year === 'number' && typeof event.amount === 'number') {
    return [
      {
        name: event.name,
        startYear: event.year,
        endYear: event.year,
        mode: CalculationMode.FIXED,
        amount: event.amount,
        growthRate: 0,
      },
    ];
  }

  return [];
};

export const calculateRetirementEventPhaseAmount = (
  phase: NormalizedRetirementEventPhase,
  year: number,
  yearlyIncomeMap: Map<string, number>,
  totalSalary: number,
): number => {
  if (year < phase.startYear || year > phase.endYear) {
    return 0;
  }

  if (phase.mode === CalculationMode.SALARY_PERCENTAGE) {
    const baseSalary = phase.linkedIncomeId
      ? (yearlyIncomeMap.get(phase.linkedIncomeId) ?? 0)
      : totalSalary;
    return baseSalary * (phase.percentage ?? 0);
  }

  const yearsGrowth = year - phase.startYear;
  return (phase.amount ?? 0) * Math.pow(1 + (phase.growthRate ?? 0) / 100, yearsGrowth);
};
