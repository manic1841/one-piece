import { useCallback } from 'react';

import { listProjectSnapshotsUseCase } from '@/application/project/use_cases/listProjectSnapshotsUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useNoOpStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useStageLoader } from '@/ui/features/monthly_close/hooks/useStageLoader';
import { type ProjectSettlementEvidenceRow } from '@/ui/features/monthly_close/viewmodels/closeEvidence.vm';
import { logger } from '@/utils/logger';

interface UseProjectSettlementStageArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
}

const LOAD_ERROR = '無法載入專案結算狀態，請稍後再試。';

/**
 * Loads every active project with its settlement state for the month. A read
 * failure throws the canned message so the surface shows copy the consumer
 * owns instead of an empty list that reads as "no projects".
 */
const fetchSettlements = async ({
  householdId,
  selectedYearMonth,
}: {
  householdId: string;
  selectedYearMonth: string;
}): Promise<ProjectSettlementEvidenceRow[]> => {
  try {
    const projects = await listProjectsUseCase.execute({ householdId });
    const activeProjects = projects.filter((project) => project.isActive);

    return await Promise.all(
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
  } catch (caught) {
    logger.warn('Failed to load project settlements', 'useProjectSettlementStage', { caught });
    throw new Error(LOAD_ERROR);
  }
};

/** Stage controller for PROJECT_SETTLEMENT: every active project with its settlement state. */
export const useProjectSettlementStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
}: UseProjectSettlementStageArgs): CloseStageControl<'PROJECT_SETTLEMENT'> & {
  settlements: ProjectSettlementEvidenceRow[];
  errorMessage: string | null;
} => {
  const load = useCallback(
    () => fetchSettlements({ householdId, selectedYearMonth }),
    [householdId, selectedYearMonth],
  );
  const { data, errorMessage, refresh } = useStageLoader<ProjectSettlementEvidenceRow[]>({
    enabled: householdId !== '' && selectedYearMonth !== '',
    load,
  });

  const control = useNoOpStageControl('PROJECT_SETTLEMENT', confirmingStageId);

  return { ...control, settlements: data ?? [], errorMessage, refresh };
};
