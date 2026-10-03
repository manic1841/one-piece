import { type Project } from '@/domains/project/schemas';

export interface ProjectSnapshotTotals {
  income: number;
  expense: number;
}

export interface ProjectRowVM {
  id: string;
  name: string;
  isActive: boolean;
  income: number;
  expense: number;
  net: number;
}

export const toProjectSnapshotTotals = (
  snapshots: readonly { income: number; expense: number }[],
): ProjectSnapshotTotals => ({
  income: snapshots.reduce((sum, snapshot) => sum + snapshot.income, 0),
  expense: snapshots.reduce((sum, snapshot) => sum + snapshot.expense, 0),
});

export const toProjectRows = (
  projects: readonly Project[],
  totalsByProject: ReadonlyMap<string, ProjectSnapshotTotals>,
): ProjectRowVM[] =>
  projects.map((project) => {
    const totals = totalsByProject.get(project.id) ?? { income: 0, expense: 0 };
    return {
      id: project.id,
      name: project.name,
      isActive: project.isActive,
      income: totals.income,
      expense: totals.expense,
      net: totals.income - totals.expense,
    };
  });
