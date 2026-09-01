import type { RetirementIncomeSource } from '@/domains/retirement/types';

export type ImportedIncomeSyncTarget = RetirementIncomeSource & {
  calculatedFrom: NonNullable<RetirementIncomeSource['calculatedFrom']> & {
    ledgerCode: string;
    sampleYear: number;
  };
};

export const getLastFullYear = (today: Date): number => today.getFullYear() - 1;

export const isImportedIncomeSyncTarget = (
  income: RetirementIncomeSource,
): income is ImportedIncomeSyncTarget => {
  return (
    income.importedFrom === 'transactionEntries' &&
    income.incomeCalculationMode === 'IMPORTED' &&
    income.autoUpdate === true &&
    !!income.calculatedFrom?.ledgerCode &&
    typeof income.calculatedFrom?.sampleYear === 'number'
  );
};

export const getFullYearWindow = (year: number): { startDate: Date; endDateExclusive: Date } => ({
  startDate: new Date(year, 0, 1),
  endDateExclusive: new Date(year + 1, 0, 1),
});
