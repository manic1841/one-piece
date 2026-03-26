import { calculateProjectSettlementSnapshot } from '@/domains/project/calculators/projectSettlementCalculator';
import { type ProjectSnapshotCreate } from '@/domains/project/schemas';
import { allocationRepository } from '@/infra/repositories/allocationRepository';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

export async function buildProjectSettlementSnapshot(
  householdId: string,
  projectId: string,
  yearMonth: string,
): Promise<ProjectSnapshotCreate> {
  const [year, month] = yearMonth.split('-').map(Number);
  const prevYearMonth = getPreviousYearMonth(year, month);
  const prevSnapshot = await projectRepository.getSnapshot(householdId, projectId, prevYearMonth);
  const openingBalance = prevSnapshot?.closingBalance ?? 0;

  const [allocations, transfers] = await Promise.all([
    allocationRepository.getAllocationsByMonth(householdId, yearMonth),
    transactionRepository.getProjectTransfers(householdId, yearMonth),
  ]);

  const projectTransactions = await transactionRepository.getTransactionsByProject(
    householdId,
    projectId,
    yearMonth,
  );

  return calculateProjectSettlementSnapshot({
    year,
    month,
    projectId,
    openingBalance,
    allocations,
    transfers,
    projectTransactions,
  });
}

function getPreviousYearMonth(year: number, month: number): string {
  let previousYear = year;
  let previousMonth = month - 1;
  if (previousMonth === 0) {
    previousMonth = 12;
    previousYear -= 1;
  }
  return `${previousYear}-${previousMonth.toString().padStart(2, '0')}`;
}
