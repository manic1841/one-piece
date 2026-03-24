import { Timestamp } from 'firebase/firestore';

import type { ProjectSnapshot } from '@/domains/project/schemas';
import { type FinancialReport, ReportType } from '@/domains/report/schemas';
import { mapCategoryToRetirementIncomeType } from '@/domains/retirement/mappers/retirementMapper';
import {
  type RetirementExpenseCategory,
  type RetirementIncomeSource,
  type RetirementPlan,
} from '@/domains/retirement/types';
import { RetirementIncomeType } from '@/domains/retirement/types';

export type PlannedIncome = {
  category: string;
  amount: number;
  date: Date | Timestamp;
};

/**
 * Pure logic to calculate expense suggestion from project snapshots.
 */
export function calculateExpenseSuggestion(
  project: { id: string; name: string },
  snapshots: ProjectSnapshot[],
): RetirementExpenseCategory | null {
  if (snapshots.length === 0) return null;

  const totalExpense = snapshots.reduce((sum, s) => sum + s.expense, 0);
  const averageMonthly = totalExpense / snapshots.length;
  const annualized = averageMonthly * 12;

  if (annualized <= 0) return null;

  return {
    id: crypto.randomUUID(),
    name: project.name,
    sourceProjectId: project.id,
    baseAmount: Math.round(annualized),
    growthRate: 2,
    retirementMultiplier: 0.7,
    startYear: new Date().getFullYear(),
    endYear: null,
    note: `Based on ${snapshots.length} months average from ${project.name}`,
  };
}

/**
 * Pure logic to group and calculate income source suggestions from planned incomes.
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
    const key = pi.category;
    const date = pi.date instanceof Timestamp ? pi.date.toDate() : pi.date;
    const current = incomeMap.get(key) || {
      total: 0,
      count: 0,
      type: pi.category,
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
      name: key.charAt(0).toUpperCase() + key.slice(1),
      importedFrom: 'plannedIncome',
      incomeCategory: key,
      type: mapCategoryToRetirementIncomeType(key),
      calculatedFrom: {
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
      note: `Based on last ${referenceMonths} months records (${value.count} samples)`,
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
  const dates = validIncomes.map((pi) =>
    pi.date instanceof Timestamp ? pi.date.toDate() : pi.date,
  );
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

/**
 * Pure logic to process auto-update data from financial reports.
 */
export function processAutoUpdate(
  plan: RetirementPlan,
  reports: FinancialReport[],
  latestPeriod: { year: number; month: number },
): {
  currentYear: number;
  currentSavings: number;
  incomes: RetirementIncomeSource[];
} {
  // 1. Latest Savings
  const latestBS = reports.find(
    (r) =>
      r.type === ReportType.BALANCE_SHEET &&
      r.yearMonth === `${latestPeriod.year}-${String(latestPeriod.month).padStart(2, '0')}`,
  );
  let currentSavings = plan.currentSavings;
  if (latestBS && latestBS.data && 'assets' in latestBS.data) {
    currentSavings = latestBS.data.assets.total;
  }

  // 2. Salary Average
  const isReports = reports.filter((r) => r.type === ReportType.INCOME_STATEMENT);
  let totalSalary = 0;
  let sampleCount = 0;
  isReports.forEach((r) => {
    if (r.data && 'incomeItems' in r.data) {
      const salaryItem = r.data.incomeItems.find((item: { code: string }) =>
        item.code.toLowerCase().includes('salary'),
      );
      if (salaryItem) {
        totalSalary += salaryItem.amount;
        sampleCount += 1;
      }
    }
  });
  const monthlySalaryAvg = sampleCount > 0 ? totalSalary / sampleCount : 0;

  // 3. Update Incomes
  const updatedIncomes = plan.incomes.map((income) => {
    if (income.type === RetirementIncomeType.SALARY) {
      const dataPointCount = income.calculatedFrom?.sampleCount || 12;
      const annualBase = monthlySalaryAvg * dataPointCount;
      return {
        ...income,
        baseAmount: Math.round(annualBase),
        note: `${income.note || ''} (Auto-updated from 12m reports avg: ${Math.round(monthlySalaryAvg)})`.trim(),
      };
    }
    return income;
  });

  return {
    currentYear: latestPeriod.year,
    currentSavings: Math.round(currentSavings),
    incomes: updatedIncomes,
  };
}
