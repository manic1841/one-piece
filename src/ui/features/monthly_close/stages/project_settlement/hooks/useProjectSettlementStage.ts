import { useCallback } from 'react';

import { listProjectSnapshotsUseCase } from '@/application/project/use_cases/listProjectSnapshotsUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { previewProjectSettlementsUseCase } from '@/application/settlement/use_cases/previewProjectSettlementsUseCase';
import { type AuthContext } from '@/application/types';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useNoOpStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { useStageLoader } from '@/ui/features/monthly_close/hooks/useStageLoader';
import { type ProjectSettlementEvidenceRow } from '@/ui/features/monthly_close/viewmodels/closeEvidence.vm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';
import { logger } from '@/utils/logger';

interface UseProjectSettlementStageArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
}

const LOAD_ERROR = '無法載入專案結算狀態，請稍後再試。';

/**
 * Loads every active project with its live settlement preview, plus whether the
 * month snapshot is already persisted. A read failure throws the canned message
 * so the surface shows copy the consumer owns instead of an empty list that
 * reads as "no projects".
 */
const fetchSettlements = async ({
  householdId,
  selectedYearMonth,
  auth,
}: {
  householdId: string;
  selectedYearMonth: string;
  auth: AuthContext;
}): Promise<ProjectSettlementEvidenceRow[]> => {
  const year = Number(selectedYearMonth.slice(0, 4));
  const month = Number(selectedYearMonth.slice(5, 7));
  try {
    const projects = await listProjectsUseCase.execute({ householdId });
    const activeProjects = projects.filter((project) => project.isActive);
    if (activeProjects.length === 0) return [];

    const [previews, settledFlags] = await Promise.all([
      previewProjectSettlementsUseCase.execute({
        householdId,
        projects: activeProjects.map((project) => ({ id: project.id, name: project.name })),
        year,
        month,
        auth,
      }),
      Promise.all(
        activeProjects.map(async (project) => {
          const snapshots = await listProjectSnapshotsUseCase.execute({
            householdId,
            projectId: project.id,
            yearMonth: selectedYearMonth,
          });
          return snapshots.length > 0;
        }),
      ),
    ]);

    return previews.map((preview, index) => ({
      projectId: preview.projectId,
      projectName: preview.projectName,
      settled: settledFlags[index] ?? false,
      openingBalance: preview.openingBalance,
      income: preview.income,
      expense: preview.expense,
      closingBalance: preview.closingBalance,
    }));
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
  const auth = useAuthIdentity();

  const load = useCallback(
    () => fetchSettlements({ householdId, selectedYearMonth, auth }),
    [auth, householdId, selectedYearMonth],
  );
  const { data, errorMessage, refresh } = useStageLoader<ProjectSettlementEvidenceRow[]>({
    enabled: householdId !== '' && selectedYearMonth !== '',
    load,
  });

  const control = useNoOpStageControl('PROJECT_SETTLEMENT', confirmingStageId);

  return { ...control, settlements: data ?? [], errorMessage, refresh };
};
