import { useEffect, useState } from 'react';

import { listProjectSnapshotsUseCase } from '@/application/project/use_cases/listProjectSnapshotsUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

import { type ProjectSettlementEvidenceRow } from '../viewmodels/monthlyClose.vm';

/**
 * PROJECT_SETTLEMENT stage evidence: every active project with its settlement
 * state for the selected month. A stored snapshot means settled and carries
 * the confirmed income/expense/closing balance; no snapshot means unsettled.
 */
export const useProjectSettlementEvidence = (
  householdId: string,
  selectedYearMonth: string,
): ProjectSettlementEvidenceRow[] => {
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
  }, [auth, householdId, selectedYearMonth]);

  return settlements;
};
