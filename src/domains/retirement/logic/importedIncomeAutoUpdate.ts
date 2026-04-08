import type { RetirementIncomeSource } from '@/domains/retirement/types';

export type ImportedIncomeSyncTarget = RetirementIncomeSource & {
  calculatedFrom: NonNullable<RetirementIncomeSource['calculatedFrom']> & {
    ledgerCode: string;
    startDate: string;
    endDate: string;
  };
};

const toDate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

export const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const shiftYear = (date: Date, yearDelta: number): Date =>
  new Date(date.getFullYear() + yearDelta, date.getMonth(), date.getDate());

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const getInclusiveMonthCount = (startDate: Date, endDate: Date): number => {
  const months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth()) +
    1;
  return Math.max(1, months);
};

export const isImportedIncomeSyncTarget = (
  income: RetirementIncomeSource,
): income is ImportedIncomeSyncTarget => {
  return (
    income.importedFrom === 'transactionEntries' &&
    income.incomeCalculationMode === 'IMPORTED' &&
    !!income.calculatedFrom?.ledgerCode &&
    !!income.calculatedFrom?.startDate &&
    !!income.calculatedFrom?.endDate
  );
};

export const getShiftedWindow = (
  startDateIso: string,
  endDateIso: string,
  today: Date,
): { startDate: Date; endDate: Date } | null => {
  const originalStart = toDate(startDateIso);
  const originalEnd = toDate(endDateIso);

  const currentYearWindowEnd = new Date(
    today.getFullYear(),
    originalEnd.getMonth(),
    originalEnd.getDate(),
    23,
    59,
    59,
    999,
  );

  const targetEndYear =
    today >= currentYearWindowEnd ? today.getFullYear() : today.getFullYear() - 1;
  const yearDelta = targetEndYear - originalEnd.getFullYear();

  if (yearDelta <= 0) {
    return null;
  }

  return {
    startDate: shiftYear(originalStart, yearDelta),
    endDate: shiftYear(originalEnd, yearDelta),
  };
};
