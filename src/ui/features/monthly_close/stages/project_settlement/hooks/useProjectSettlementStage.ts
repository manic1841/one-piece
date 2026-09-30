import { useCallback, useEffect, useRef, useState } from 'react';

import { listProjectSnapshotsUseCase } from '@/application/project/use_cases/listProjectSnapshotsUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import type { CloseStageControl } from '@/ui/features/monthly_close/hooks/closeStageControl';
import { useNoOpStageControl } from '@/ui/features/monthly_close/hooks/useConfirmStageControl';
import { type ProjectSettlementEvidenceRow } from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';
import { useLoadingTask } from '@/ui/hooks/useLoadingTask';
import { logger } from '@/utils/logger';

interface UseProjectSettlementStageArgs {
  householdId: string;
  selectedYearMonth: string;
  confirmingStageId: string | null;
  enabled?: boolean;
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

/**
 * Stage controller for PROJECT_SETTLEMENT: loads every active project with its
 * settlement state for the selected month (absorbed from
 * useProjectSettlementEvidence). A stored snapshot means settled and carries
 * the confirmed income/expense/closing balance; no snapshot means unsettled.
 * No draft: the stage confirms with the stage ID alone. A load failure surfaces
 * the canned message without blocking confirm.
 */
export const useProjectSettlementStage = ({
  householdId,
  selectedYearMonth,
  confirmingStageId,
  enabled = true,
}: UseProjectSettlementStageArgs): CloseStageControl & {
  settlements: ProjectSettlementEvidenceRow[];
  errorMessage: string | null;
} => {
  const [settlements, setSettlements] = useState<ProjectSettlementEvidenceRow[]>([]);
  const { errorMessage, run } = useLoadingTask();
  // A slow load for a month the user already left must not land last and win.
  const inFlightRef = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    if (!householdId || !selectedYearMonth) return;
    inFlightRef.current?.abort();
    const controller = new AbortController();
    inFlightRef.current = controller;

    await run(() => fetchSettlements({ householdId, selectedYearMonth }), {
      signal: controller.signal,
      writeBack: (result) => {
        if (!result.ok) return;
        setSettlements(result.value);
      },
    });
  }, [householdId, run, selectedYearMonth]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  const control = useNoOpStageControl('PROJECT_SETTLEMENT', confirmingStageId);

  return { ...control, settlements, errorMessage, refresh: load };
};
