import type { RetirementOneTimeEvent, RetirementPlan } from '@/domains/retirement/types';

interface AddRetirementEventRequest {
  plan: RetirementPlan;
  eventData: Omit<RetirementOneTimeEvent, 'id'>;
  id: string;
}

interface UpdateRetirementEventRequest {
  plan: RetirementPlan;
  eventId: string;
  updates: Omit<RetirementOneTimeEvent, 'id'>;
}

interface RemoveRetirementEventRequest {
  plan: RetirementPlan;
  eventId: string;
}

class ManageRetirementEventsUseCase {
  add(request: AddRetirementEventRequest): RetirementOneTimeEvent[] {
    const { plan, eventData, id } = request;
    return [...plan.events, { ...eventData, id }];
  }

  update(request: UpdateRetirementEventRequest): RetirementOneTimeEvent[] {
    const { plan, eventId, updates } = request;
    return plan.events.map((event) =>
      event.id === eventId ? { ...updates, id: event.id } : event,
    );
  }

  remove(request: RemoveRetirementEventRequest): RetirementOneTimeEvent[] {
    const { plan, eventId } = request;
    return plan.events.filter((event) => event.id !== eventId);
  }
}

export const manageRetirementEventsUseCase = new ManageRetirementEventsUseCase();
