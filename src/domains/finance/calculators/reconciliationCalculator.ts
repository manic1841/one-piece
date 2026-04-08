import { type ReconciliationReport } from '../../../services/reconciliationService';
import { type Project, type ProjectSnapshot } from '../../../schemas';

export type ProjectSnapshotWithId = ProjectSnapshot & { projectId: string };

export interface ReconciliationInput {
  year: number;
  month: number;
  previousTotalBalance: number;
  currentTotalBalance: number;
  projects: Project[];
  projectSnapshots: ProjectSnapshotWithId[];
}

/**
 * Pure function to calculate the reconciliation report.
 */
export function calculateReconciliationReport(
  input: ReconciliationInput
): ReconciliationReport {
  const {
    year,
    month,
    previousTotalBalance,
    currentTotalBalance,
    projects,
    projectSnapshots,
  } = input;

  // Calculate actual change
  const actualChange = currentTotalBalance - previousTotalBalance;

  // Filter projects to only include those with reconciliation enabled
  const reconciliationProjects = projects.filter(
    (project) => project.includeInReconciliation !== false
  );
  const reconciliationProjectIds = new Set(reconciliationProjects.map((p) => p.id));

  // Calculate expected change from project snapshots
  const incomeByProject: Record<string, number> = {};
  const expenseByProject: Record<string, number> = {};
  let totalIncome = 0;
  let totalExpense = 0;

  for (const snapshot of projectSnapshots) {
    // Only consider snapshots for projects that are included in reconciliation
    if (!reconciliationProjectIds.has(snapshot.projectId)) {
      continue;
    }

    if (snapshot.income > 0) {
      incomeByProject[snapshot.projectId] = snapshot.income;
      totalIncome += snapshot.income;
    }

    if (snapshot.expense > 0) {
      expenseByProject[snapshot.projectId] = snapshot.expense;
      totalExpense += snapshot.expense;
    }
  }

  const expectedChange = totalIncome - totalExpense;

  // Calculate discrepancy
  const discrepancy = actualChange - expectedChange;
  const discrepancyPercentage =
    previousTotalBalance > 0 ? (discrepancy / previousTotalBalance) * 100 : 0;

  // Determine previous month/year for display
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = year - 1;
  }

  return {
    year,
    month,
    previousMonth: {
      year: prevYear,
      month: prevMonth,
      totalBalance: previousTotalBalance,
    },
    currentMonth: {
      year,
      month,
      totalBalance: currentTotalBalance,
    },
    actualChange,
    expected: {
      totalIncome,
      totalExpense,
      incomeByProject,
      expenseByProject,
    },
    expectedChange,
    discrepancy,
    discrepancyPercentage,
    hasDiscrepancy: Math.abs(discrepancy) > 0.01,
  };
}
