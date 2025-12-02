import { useMemo, useState } from 'react';
import type { PlannedIncomeAllocation, Project } from '../schemas';

export function useProjectAllocations(initial: PlannedIncomeAllocation[] = []) {
  const [allocations, setAllocations] = useState(initial);

  const setPercentage = (projectId: string, percentage: number) => {
    setAllocations((prev) =>
      prev.map((a) => (a.projectId === projectId ? { ...a, percentage } : a)),
    );
  };

  const total = useMemo(() => allocations.reduce((s, a) => s + a.percentage, 0), [allocations]);

  const reset = (projects: Project[]) =>
    setAllocations(projects.map((p) => ({ projectId: p.id, percentage: 0 })));

  return {
    allocations,
    setAllocations,
    setPercentage,
    reset,
    totalPercentage: total,
  };
}
