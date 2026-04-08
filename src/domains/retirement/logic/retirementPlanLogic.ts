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
  referenceMonths: number,
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
    const annualAmount = (value.total / referenceMonths) * 12;
    const minDate = new Date(Math.min(...value.allDates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...value.allDates.map((d) => d.getTime())));

    incomeSources.push({
      id: crypto.randomUUID(),
      name: toIncomeStreamName(key),
      importedFrom: 'transactionEntries',
      incomeCalculationMode: 'IMPORTED',
      incomeCategory: key,
      type: mapCategoryToRetirementIncomeType(key),
      calculatedFrom: {
        ledgerCode: key,
        startDate: minDate.toISOString().split('T')[0],
        endDate: maxDate.toISOString().split('T')[0],
        totalAmount: value.total,
        monthlyAverage: value.total / referenceMonths,
        sampleCount: value.count,
        importedAt: new Date().toISOString(),
      },
      startYear: currentYear,
      endYear: currentYear + 20,
      baseAmount: Math.round(annualAmount),
      growthRate: 3,
      note: `Based on last ${referenceMonths} months income entries (${value.count} samples)`,
    });
  });

  return incomeSources;
}

/**
 * Pure logic to calculate metadata for a specific income import.
 */
export function calculateIncomeImportMetadata(
  validIncomes: PlannedIncome[],
): RetirementIncomeSource['calculatedFrom'] | null {
  if (validIncomes.length === 0) return null;

  const totalAmount = validIncomes.reduce((sum, pi) => sum + pi.amount, 0);
  const dates = validIncomes.map((pi) => pi.date);
  const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

  const monthlyAverage = totalAmount / validIncomes.length;

  return {
    startDate: minDate.toISOString().split('T')[0],
    endDate: maxDate.toISOString().split('T')[0],
    totalAmount,
    monthlyAverage,
    sampleCount: validIncomes.length,
    importedAt: new Date().toISOString(),
  };
}
