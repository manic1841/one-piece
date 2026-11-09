import { type FinancialPeriod } from '@/domains/financial_period/schemas';

export const buildFinancialPeriod = (
  yearMonth: string,
  status: FinancialPeriod['status'],
): FinancialPeriod => ({
  id: yearMonth,
  yearMonth,
  status,
  stages: {},
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
});
