import { type PlannedIncomeCategory } from '@/domains/unifiedTransaction/plannedIncomeCategory';
import { type Project } from '@/schemas';
import { plannedIncomeService } from '@/services/plannedIncomeService';

export function usePlannedIncomeSnapshot() {
  const loadPreviousAllocations = async (
    householdId: string,
    category: PlannedIncomeCategory,
    projects: Project[],
  ) => {
    const prev = await plannedIncomeService.getLatestPlannedIncomeByCategory(householdId, category);

    if (!prev) {
      return projects.map((p) => ({ projectId: p.id, percentage: 0 }));
    }

    const base = prev.allocations ?? [];

    return projects.map((p) => {
      const found = base.find((a) => a.projectId === p.id);
      return {
        projectId: p.id,
        percentage: found?.percentage ?? 0,
      };
    });
  };

  return { loadPreviousAllocations };
}
