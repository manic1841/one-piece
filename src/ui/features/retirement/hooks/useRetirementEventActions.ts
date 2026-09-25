import { useCallback } from 'react';

import { appendById, removeById, upsertById } from '@/domains/retirement/planMutations';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';
import type {
  RetirementOneTimeEvent,
  RetirementPlan,
  RetirementPlanCreate,
} from '@/domains/retirement/types';

interface UseRetirementEventActionsParams {
  id: string | undefined;
  plan: RetirementPlan | null;
  handleUpdatePlan: (updates: Partial<RetirementPlanCreate>) => Promise<void>;
}

export const useRetirementEventActions = ({
  id,
  plan,
  handleUpdatePlan,
}: UseRetirementEventActionsParams) => {
  const { confirm } = useConfirm();
  const handleAddEvent = useCallback(
    async (eventData: Omit<RetirementOneTimeEvent, 'id'>) => {
      if (!id || !plan) return;
      await handleUpdatePlan({
        events: appendById(plan.events, { ...eventData, id: crypto.randomUUID() }),
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
      const confirmed = await confirm('Are you sure you want to delete this event?');
      if (!confirmed) return;
      await handleUpdatePlan({
        events: removeById(plan.events, eventId),
      });
    },
    [id, plan, confirm, handleUpdatePlan],
  );

  return {
    handleAddEvent,
    handleUpdateEvent,
    handleDeleteEvent,
  };
};
