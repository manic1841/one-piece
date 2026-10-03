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

/**
 * 把「看得見的列」的新順序放回完整序列：被篩掉的列（例如停用專案）保留原本的
 * 位置，可見列依新順序佔回它們原本佔的欄位。
 */
export const mergeReorderedIds = (
  allIds: readonly string[],
  reorderedVisibleIds: readonly string[],
): string[] => {
  const visible = new Set(reorderedVisibleIds);
  let cursor = 0;
  return allIds.map((id) => (visible.has(id) ? reorderedVisibleIds[cursor++] : id));
};
