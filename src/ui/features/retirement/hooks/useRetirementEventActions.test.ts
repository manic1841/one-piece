import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type RetirementPlan } from '@/domains/retirement/types';
import { RetirementEventsLabels } from '@/ui/constants/retirement/retirementWorkspaceLabels';

import { useRetirementEventActions } from './useRetirementEventActions';

const { offerMock } = vi.hoisted(() => ({ offerMock: vi.fn() }));

vi.mock('@/ui/hooks/useUndo', () => ({ useUndo: () => ({ offer: offerMock }) }));

function createPlan(): RetirementPlan {
  return {
    id: 'plan-1',
    householdId: 'household-1',
    name: 'Plan',
    isActive: true,
    autoUpdate: false,
    createdBy: 'u1',
    updatedBy: 'u1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    currentYear: 2026,
    birthYear: 1985,
    retirementAge: 60,
    lifeExpectancy: 85,
    inflationRate: 2,
    investmentReturnRate: 5,
    incomes: [],
    expenses: [],
    events: [
      {
        id: 'ev1',
        name: 'Car',
        type: 'expense',
        phases: [{ name: '', startYear: 2030, endYear: 2030, amount: 150000 }],
      },
      {
        id: 'ev2',
        name: 'Rent',
        type: 'income',
        phases: [{ name: '', startYear: 2028, endYear: 2030, amount: 12000 }],
      },
    ],
  } as RetirementPlan;
}

function setup(plan: RetirementPlan = createPlan()) {
  const handleUpdatePlan = vi.fn().mockResolvedValue(undefined);
  const hook = renderHook(() =>
    useRetirementEventActions({ id: 'plan-1', plan, handleUpdatePlan }),
  );
  return { ...hook, handleUpdatePlan };
}

describe('useRetirementEventActions', () => {
  beforeEach(() => offerMock.mockReset());

  it('deletes an event with a toast + Undo (no confirm modal)', async () => {
    const { result, handleUpdatePlan } = setup();

    await act(() => result.current.handleDeleteEvent('ev1'));

    expect(handleUpdatePlan).toHaveBeenCalledWith({
      events: [expect.objectContaining({ id: 'ev2' })],
    });
    expect(offerMock).toHaveBeenCalledTimes(1);
    expect(offerMock.mock.calls[0][0]).toMatchObject({
      message: RetirementEventsLabels.deletedEventToast,
    });

    const restored = createPlan();
    offerMock.mock.calls[0][0].undo();
    expect(handleUpdatePlan).toHaveBeenLastCalledWith({ events: restored.events });
  });

  it('appends a phase to one event only', async () => {
    const { result, handleUpdatePlan } = setup();

    await act(() =>
      result.current.handleAddPhase('ev1', { name: '', startYear: 2031, endYear: 2031, amount: 5 }),
    );

    const arg = handleUpdatePlan.mock.calls[0][0] as { events: RetirementPlan['events'] };
    expect(arg.events.find((event) => event.id === 'ev1')?.phases).toHaveLength(2);
    expect(arg.events.find((event) => event.id === 'ev2')?.phases).toHaveLength(1);
  });

  it('updates a phase by index', async () => {
    const { result, handleUpdatePlan } = setup();

    await act(() =>
      result.current.handleUpdatePhase('ev1', 0, {
        name: 'New',
        startYear: 2032,
        endYear: 2032,
        amount: 9,
      }),
    );

    const arg = handleUpdatePlan.mock.calls[0][0] as { events: RetirementPlan['events'] };
    expect(arg.events.find((event) => event.id === 'ev1')?.phases[0]).toMatchObject({
      name: 'New',
      amount: 9,
    });
  });

  it('deletes a phase by index with a toast + Undo', async () => {
    const plan = createPlan();
    plan.events[0]!.phases = [
      { name: 'a', startYear: 2030, endYear: 2030, amount: 1 },
      { name: 'b', startYear: 2031, endYear: 2031, amount: 2 },
    ];
    const { result, handleUpdatePlan } = setup(plan);

    await act(() => result.current.handleDeletePhase('ev1', 0));

    const arg = handleUpdatePlan.mock.calls[0][0] as { events: RetirementPlan['events'] };
    expect(arg.events.find((event) => event.id === 'ev1')?.phases).toEqual([
      expect.objectContaining({ name: 'b' }),
    ]);
    expect(offerMock.mock.calls[0][0]).toMatchObject({
      message: RetirementEventsLabels.deletedPhaseToast,
    });
  });

  it('updates a phase span without changing its event', async () => {
    const { result, handleUpdatePlan } = setup();

    await act(() =>
      result.current.handleTimelineUpdatePhase('ev1', 0, { startYear: 2033, endYear: 2035 }),
    );

    const arg = handleUpdatePlan.mock.calls[0][0] as { events: RetirementPlan['events'] };
    expect(arg.events.find((event) => event.id === 'ev1')?.phases[0]).toMatchObject({
      startYear: 2033,
      endYear: 2035,
    });
    expect(offerMock.mock.calls[0][0]).toMatchObject({
      message: RetirementEventsLabels.updatedPhaseToast,
    });
  });

  it('reassigns a phase to another event (undoable)', async () => {
    const { result, handleUpdatePlan } = setup();

    await act(() =>
      result.current.handleTimelineUpdatePhase('ev1', 0, {
        startYear: 2030,
        endYear: 2030,
        targetEventId: 'ev2',
      }),
    );

    const arg = handleUpdatePlan.mock.calls[0][0] as { events: RetirementPlan['events'] };
    expect(arg.events.find((event) => event.id === 'ev1')?.phases).toHaveLength(0);
    expect(arg.events.find((event) => event.id === 'ev2')?.phases).toHaveLength(2);

    const restored = createPlan();
    offerMock.mock.calls[0][0].undo();
    expect(handleUpdatePlan).toHaveBeenLastCalledWith({ events: restored.events });
  });
});
