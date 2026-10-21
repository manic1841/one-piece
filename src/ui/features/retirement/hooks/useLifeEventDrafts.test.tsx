import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type LifeEvent } from '@/domains/retirement/lifeEvents';

import { useLifeEventDrafts } from './useLifeEventDrafts';

let latest: ReturnType<typeof useLifeEventDrafts>;
const markDirty = vi.fn();

function Harness() {
  // eslint-disable-next-line react-hooks/globals
  latest = useLifeEventDrafts(markDirty);
  return <div />;
}

function addEvent(name = 'Car') {
  act(() => latest.add());
  const event = latest.events[latest.events.length - 1];
  act(() => latest.update(event.id, { name }));
  return event;
}

function fillPhase(
  eventId: string,
  phaseId: string,
  phase: Partial<{
    startYearText: string;
    endYearText: string;
    amountText: string;
    growthRateText: string;
    name: string;
  }>,
) {
  act(() => latest.updatePhase(eventId, phaseId, phase));
}

describe('useLifeEventDrafts', () => {
  beforeEach(() => {
    markDirty.mockClear();
    render(<Harness />);
  });

  it('adds an event with one blank phase and marks dirty', () => {
    act(() => latest.add());
    expect(latest.events).toHaveLength(1);
    expect(latest.events[0].phases).toHaveLength(1);
    expect(latest.events[0].type).toBe('income');
    expect(latest.events[0].enabled).toBe(true);
    expect(markDirty).toHaveBeenCalled();
  });

  it('deletes an event and toggles it', () => {
    const event = addEvent();
    act(() => latest.toggle(event.id));
    expect(latest.events[0].enabled).toBe(false);

    act(() => latest.remove(event.id));
    expect(latest.events).toHaveLength(0);
  });

  it('sets the event type', () => {
    const event = addEvent();
    act(() => latest.setType(event.id, 'expense'));
    expect(latest.events[0].type).toBe('expense');
  });

  it('sorts phases ascending by start year after an edit', () => {
    const event = addEvent();
    act(() => latest.addPhase(event.id));
    act(() => latest.addPhase(event.id));
    const [first, second, third] = latest.events[0].phases;

    fillPhase(event.id, first.id, { startYearText: '2040' });
    fillPhase(event.id, second.id, { startYearText: '2030' });
    fillPhase(event.id, third.id, { startYearText: '2035' });

    expect(latest.events[0].phases.map((phase) => phase.startYearText)).toEqual([
      '2030',
      '2035',
      '2040',
    ]);
  });

  it('reports overlap on the offending phase and asks to focus its start year', () => {
    const event = addEvent();
    act(() => latest.addPhase(event.id));
    const [first, second] = latest.events[0].phases;
    fillPhase(event.id, first.id, { startYearText: '2020', endYearText: '2030' });
    fillPhase(event.id, second.id, { startYearText: '2035', endYearText: '2040' });

    fillPhase(event.id, second.id, { startYearText: '2025' });

    const result = latest.validate();
    expect(result.ok).toBe(false);
    expect(result.errors[event.id].phaseErrors?.[second.id].startYear).toBe('階段不可重疊');
    expect(latest.focusRequest).toMatchObject({
      eventId: event.id,
      phaseId: second.id,
      field: 'startYear',
    });
  });

  it('blocks an end year before the start and focuses the end field', () => {
    const event = addEvent();
    const [phase] = latest.events[0].phases;
    fillPhase(event.id, phase.id, { startYearText: '2050', endYearText: '2040' });

    const result = latest.validate();
    expect(result.ok).toBe(false);
    expect(result.errors[event.id].phaseErrors?.[phase.id].endYear).toBe(
      '結束年度不得早於開始年度',
    );
    expect(latest.focusRequest).toMatchObject({ phaseId: phase.id, field: 'endYear' });
  });

  it('validates amount and growth rate from schema codes', () => {
    const event = addEvent();
    const [phase] = latest.events[0].phases;
    fillPhase(event.id, phase.id, {
      startYearText: '2040',
      endYearText: '2041',
      amountText: '-1',
      growthRateText: '25',
    });

    const result = latest.validate();
    expect(result.errors[event.id].phaseErrors?.[phase.id]).toEqual({
      amount: '金額不得為負',
      growthRate: '成長率必須介於 -10% 到 20%',
    });
  });

  it('accepts a blank optional phase name and omits growth when blank', () => {
    const event = addEvent();
    const [phase] = latest.events[0].phases;
    fillPhase(event.id, phase.id, {
      startYearText: '2040',
      endYearText: '2041',
      amountText: '500',
    });

    const result = latest.validate();
    expect(result.ok).toBe(true);
    expect(result.data?.[0].phases[0]).toEqual({
      startYear: 2040,
      endYear: 2041,
      amount: 500,
    });
  });

  it('requires an event name and at least one phase', () => {
    const event = addEvent('');
    const [phase] = latest.events[0].phases;
    fillPhase(event.id, phase.id, {
      startYearText: '2040',
      endYearText: '2041',
      amountText: '500',
    });

    expect(latest.validate().errors[event.id].name).toBe('事件名稱必填');

    act(() => latest.removePhase(event.id, phase.id));
    expect(latest.validate().errors[event.id].phases).toBe('事件至少需要一個階段');
  });

  it('replaces every event from domain data without dirtying', () => {
    markDirty.mockClear();
    const domain: LifeEvent[] = [
      {
        id: 'event-1',
        name: 'Travel',
        type: 'expense',
        enabled: false,
        phases: [{ startYear: 2040, endYear: 2042, amount: 1000, growthRate: 0.02 }],
      },
    ];

    act(() => latest.replaceAll(domain));

    expect(latest.events).toHaveLength(1);
    expect(latest.events[0]).toMatchObject({ name: 'Travel', enabled: false });
    expect(latest.events[0].phases[0].growthRateText).toBe('2');
    expect(markDirty).not.toHaveBeenCalled();
  });
});
