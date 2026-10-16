import { useCallback } from 'react';

import { appendById, removeById, upsertById } from '@/domains/retirement/planMutations';
import type {
  RetirementOneTimeEvent,
  RetirementPlan,
  RetirementPlanCreate,
} from '@/domains/retirement/types';
import { newId } from '@/shared/id';
import { RetirementEventsLabels } from '@/ui/constants/retirement/retirementWorkspaceLabels';
import { useUndo } from '@/ui/hooks/useUndo';

type RetirementEventPhase = RetirementOneTimeEvent['phases'][number];

interface UseRetirementEventActionsParams {
  id: string | undefined;
  plan: RetirementPlan | null;
  handleUpdatePlan: (updates: Partial<RetirementPlanCreate>) => Promise<void>;
}

/**
 * 事件的建立／更新以整批替換寫入（ADR-0030）。刪除事件與 phase 為**可 Undo**的
 * 操作：改以 toast＋Undo 補償性還原（spec #301 §2.4），**不使用 confirm 模態**。
 */
export const useRetirementEventActions = ({
  id,
  plan,
  handleUpdatePlan,
}: UseRetirementEventActionsParams) => {
  const { offer } = useUndo();

  const handleAddEvent = useCallback(
    async (eventData: Omit<RetirementOneTimeEvent, 'id'>) => {
      if (!id || !plan) return;
      await handleUpdatePlan({
        events: appendById(plan.events, { ...eventData, id: newId() }),
      });
    },
    [id, plan, handleUpdatePlan],
  );

  const handleUpdateEvent = useCallback(
    async (eventId: string, updates: Omit<RetirementOneTimeEvent, 'id'>) => {
      if (!id || !plan) return;
      await handleUpdatePlan({
        events: upsertById(plan.events, eventId, updates),
      });
    },
    [id, plan, handleUpdatePlan],
  );

  const handleDeleteEvent = useCallback(
    async (eventId: string) => {
      if (!id || !plan) return;
      const previous = plan.events;
      await handleUpdatePlan({ events: removeById(previous, eventId) });
      offer({
        message: RetirementEventsLabels.deletedEventToast,
        actionLabel: RetirementEventsLabels.undoAction,
        undo: () => handleUpdatePlan({ events: previous }),
      });
    },
    [id, plan, handleUpdatePlan, offer],
  );

  const handleAddPhase = useCallback(
    async (eventId: string, phase: RetirementEventPhase) => {
      if (!id || !plan) return;
      const nextEvents = plan.events.map((event) =>
        event.id === eventId ? { ...event, phases: [...event.phases, phase] } : event,
      );
      await handleUpdatePlan({ events: nextEvents });
    },
    [id, plan, handleUpdatePlan],
  );

  const handleUpdatePhase = useCallback(
    async (eventId: string, phaseIndex: number, phase: RetirementEventPhase) => {
      if (!id || !plan) return;
      const nextEvents = plan.events.map((event) =>
        event.id === eventId
          ? {
              ...event,
              phases: event.phases.map((current, index) =>
                index === phaseIndex ? phase : current,
              ),
            }
          : event,
      );
      await handleUpdatePlan({ events: nextEvents });
    },
    [id, plan, handleUpdatePlan],
  );

  const handleDeletePhase = useCallback(
    async (eventId: string, phaseIndex: number) => {
      if (!id || !plan) return;
      const previous = plan.events;
      const nextEvents = previous.map((event) =>
        event.id === eventId
          ? { ...event, phases: event.phases.filter((_, index) => index !== phaseIndex) }
          : event,
      );
      await handleUpdatePlan({ events: nextEvents });
      offer({
        message: RetirementEventsLabels.deletedPhaseToast,
        actionLabel: RetirementEventsLabels.undoAction,
        undo: () => handleUpdatePlan({ events: previous }),
      });
    },
    [id, plan, handleUpdatePlan, offer],
  );

  return {
    handleAddEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleAddPhase,
    handleUpdatePhase,
    handleDeletePhase,
  };
};
