import { useEffect, useState } from 'react';

import { listProjectSnapshotsUseCase } from '@/application/project/use_cases/listProjectSnapshotsUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useNoOpStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { type ProjectSettlementEvidenceRow } from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

interface UseProjectSettlementStageArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
  /** Bumped after a relevant confirm so the settlement evidence re-fetches (staleness fix). */
  refreshKey?: number;
}

/**
 * Stage controller for PROJECT_SETTLEMENT: loads every active project with its
 * settlement state for the selected month (absorbed from
 * useProjectSettlementEvidence). A stored snapshot means settled and carries
 * the confirmed income/expense/closing balance; no snapshot means unsettled.
 * No draft: the stage confirms with the stage ID alone.
 */
export const useProjectSettlementStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
  refreshKey = 0,
}: UseProjectSettlementStageArgs): CloseStageControl & {
  settlements: ProjectSettlementEvidenceRow[];
} => {
  const auth = useAuthIdentity();
  const [settlements, setSettlements] = useState<ProjectSettlementEvidenceRow[]>([]);

  useEffect(() => {
    if (!householdId || !selectedYearMonth) return;
    let cancelled = false;

    const loadSettlements = async () => {
      const projects = await listProjectsUseCase.execute({ householdId });
      const activeProjects = projects.filter((project) => project.isActive);

      const rows = await Promise.all(
        activeProjects.map(async (project) => {
          const snapshots = await listProjectSnapshotsUseCase.execute({
            householdId,
            projectId: project.id,
            yearMonth: selectedYearMonth,
          });
          const snapshot = snapshots[0] ?? null;
          return {
            projectId: project.id,
            projectName: project.name,
            settled: snapshot !== null,
            income: snapshot?.income ?? null,
            expense: snapshot?.expense ?? null,
            closingBalance: snapshot?.closingBalance ?? null,
          };
        }),
      );

      if (!cancelled) setSettlements(rows);
    };

    void loadSettlements();
    return () => {
      cancelled = true;
    };
  }, [auth, householdId, selectedYearMonth, refreshKey]);

  const control = useNoOpStageControl('PROJECT_SETTLEMENT', confirmingStageId);

  return { ...control, settlements };
};
