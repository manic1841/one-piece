import { mapCategoryToRetirementIncomeType } from '@/domains/retirement/mappers/retirementMapper';
import { type RetirementIncomeSource } from '@/domains/retirement/types';

export type PlannedIncome = {
  ledgerCode: string;
  amount: number;
  date: Date;
};

const toIncomeStreamName = (ledgerCode: string): string => {
  const segments = ledgerCode.split(':').slice(1);
  if (segments.length === 0) return ledgerCode;
  return segments.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
};

/**
 * Pure logic to group and calculate income stream suggestions from income ledger entries.
 */
export function calculateIncomeSourceSuggestions(
  plannedIncomes: PlannedIncome[],
  sampleYear: number,
): RetirementIncomeSource[] {
  const incomeMap = new Map<
    string,
    {
      total: number;
      count: number;
      type: string;
      allDates: Date[];
    }
  >();

  plannedIncomes.forEach((pi) => {
    const key = pi.ledgerCode;
    const date = pi.date;
    const current = incomeMap.get(key) || {
      total: 0,
      count: 0,
      type: pi.ledgerCode,
      allDates: [] as Date[],
    };

    current.total += pi.amount;
    current.count += 1;
    current.allDates.push(date);
    incomeMap.set(key, current);
  });

  const incomeSources: RetirementIncomeSource[] = [];
  const currentYear = new Date().getFullYear();

  incomeMap.forEach((value, key) => {
    const annualAmount = value.total;

    incomeSources.push({
      id: crypto.randomUUID(),
      name: toIncomeStreamName(key),
      incomeCategory: key,
      type: mapCategoryToRetirementIncomeType(key),
      lifelong: false,
      calculatedFrom: {
        ledgerCode: key,
        sampleYear,
        totalAmount: value.total,
        monthlyAverage: value.total / 12,
        sampleCount: value.count,
        importedAt: new Date().toISOString(),
      },
      startYear: currentYear,
      endYear: currentYear + 20,
      currentAnnual: Math.round(annualAmount),
      note: `Based on ${sampleYear} full-year income entries (${value.count} samples)`,
    });
  });

  return incomeSources;
}
