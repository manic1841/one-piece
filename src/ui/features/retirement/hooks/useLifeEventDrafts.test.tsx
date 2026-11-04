import { act, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type LifeEvent } from '@/domains/retirement/lifeEvents';

import { useLifeEventDrafts } from './useLifeEventDrafts';

let latest: ReturnType<typeof useLifeEventDrafts>;
const markDirty = vi.fn();

function Harness() {
  // eslint-disable-next-line react-hooks/globals
  latest = useLifeEventDrafts({ revealed: false, onEdit: markDirty });
  return <div />;
}

function addEvent(name = 'Car') {
  act(() => latest.addEventWithPhase(2040, 2040));
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

  it('adds an event with one phase prefilled at the retirement year and marks dirty', () => {
    act(() => latest.addEventWithPhase(2060, 2060));
    expect(latest.events).toHaveLength(1);
    expect(latest.events[0].phases).toHaveLength(1);
    expect(latest.events[0].phases[0].startYearText).toBe('2060');
    expect(latest.events[0].phases[0].endYearText).toBe('2060');
    expect(latest.events[0].type).toBe('income');
    expect(latest.events[0].enabled).toBe(true);
    expect(markDirty).toHaveBeenCalled();
  });

  it('names new events and phases so a fresh row is not red', () => {
    act(() => latest.addEventWithPhase(2060, 2060));
    const first = latest.events[0];
    expect(first.name).toBe('Event 1');
    expect(first.phases[0].name).toBe('Phase 1');
    expect(first.touched).toBe(false);
    expect(first.phases[0].touched).toBe(false);

    act(() => latest.addPhase(first.id, 2070));
    expect(latest.events[0].phases.map((phase) => phase.name)).toEqual(['Phase 1', 'Phase 2']);

    // Numbering skips names already taken, so a delete never causes a collision.
    act(() => latest.addEventWithPhase(2070, 2070));
    expect(latest.events[latest.events.length - 1].name).toBe('Event 2');
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
    const event = addEvent('Car');
    act(() => latest.addPhase(event.id, 2050));
    act(() => latest.addPhase(event.id, 2060));
    const [prefilled, first, second] = latest.events[0].phases;

    fillPhase(event.id, first.id, { startYearText: '2040' });
    fillPhase(event.id, second.id, { startYearText: '2030' });
    fillPhase(event.id, prefilled.id, { startYearText: '2035' });

    expect(latest.events[0].phases.map((phase) => phase.startYearText)).toEqual([
      '2030',
      '2035',
      '2040',
    ]);
  });

  it('prefills a list-added phase with the given year', () => {
    const event = addEvent('Car');
    act(() => latest.addPhase(event.id, 2060));

    expect(latest.events[0].phases).toHaveLength(2);
    expect(latest.events[0].phases.map((phase) => phase.startYearText)).toEqual(['2040', '2060']);
  });

  it('holds the order while a year is half typed', () => {
    const event = addEvent('Car');
    act(() => latest.addPhase(event.id, 2050));
    const [, added] = latest.events[0].phases;

    fillPhase(event.id, added.id, { startYearText: '1' });
    expect(latest.events[0].phases.map((phase) => phase.startYearText)).toEqual(['2040', '1']);

    fillPhase(event.id, added.id, { startYearText: '1990' });
    expect(latest.events[0].phases.map((phase) => phase.startYearText)).toEqual(['1990', '2040']);
  });

  it('reorders events by their earliest year', () => {
    const later = addEvent('Later');
    const earlier = addEvent('Earlier');
    expect(latest.events.map((event) => event.name)).toEqual(['Later', 'Earlier']);

    const [phase] = latest.events[1].phases;
    fillPhase(earlier.id, phase.id, { startYearText: '2001' });

    expect(latest.events.map((event) => event.name)).toEqual(['Earlier', 'Later']);
    expect(latest.events[1].id).toBe(later.id);
  });

  it('reports overlap on the offending phase and asks to focus its start year', () => {
    const event = addEvent();
    act(() => latest.addPhase(event.id, 2050));
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
      name: '',
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

  it('requires an event name and blanks the phase left behind', () => {
    const event = addEvent('');
    const [phase] = latest.events[0].phases;
    fillPhase(event.id, phase.id, {
      startYearText: '2040',
      endYearText: '2041',
      amountText: '500',
    });

    expect(latest.validate().errors[event.id].name).toBe('事件名稱必填');

    act(() => latest.removePhase(event.id, phase.id));
    const errors = latest.validate().errors[event.id];
    expect(errors.phases).toBeUndefined();
    expect(errors.phaseErrors?.[latest.events[0].phases[0].id].amount).toBe('請輸入數字');
  });

  it('replaces the last phase with a blank one on the same years and focuses it', () => {
    const event = addEvent();
    const [phase] = latest.events[0].phases;
    fillPhase(event.id, phase.id, { amountText: '500', name: 'Down payment' });

    let replacement = '';
    act(() => {
      replacement = latest.removePhase(event.id, phase.id);
    });

    expect(replacement).not.toBe(phase.id);
    const [left] = latest.events[0].phases;
    expect(left.id).toBe(replacement);
    expect(left).toMatchObject({ amountText: '', startYearText: '2040' });
    expect(left.name).toBe('Phase 1');
    expect(latest.focusRequest).toMatchObject({
      eventId: event.id,
      phaseId: replacement,
      field: 'startYear',
    });
  });

  it('keeps the remaining phases and returns the removed id', () => {
    const event = addEvent();
    const [first] = latest.events[0].phases;
    act(() => latest.addPhase(event.id, 2045));

    let gone = '';
    act(() => {
      gone = latest.removePhase(event.id, first.id);
    });

    expect(gone).toBe(first.id);
    expect(latest.events[0].phases).toHaveLength(1);
    expect(latest.events[0].phases[0].startYearText).toBe('2045');
  });

  it('moves a phase to another event and blanks the row it left', () => {
    addEvent('Car');
    const [phase] = latest.events[0].phases;
    act(() => latest.addEventWithPhase(2070, 2070));
    const target = latest.events[1];

    act(() => latest.movePhase(phase.id, target.id, 2044, 2045));

    const [left] = latest.events[0].phases;
    expect(left.id).not.toBe(phase.id);
    expect(left.startYearText).toBe('2040');
    expect(latest.events[1].phases.map((one) => one.id)).toContain(phase.id);
    expect(latest.events[1].phases.find((one) => one.id === phase.id)).toMatchObject({
      startYearText: '2044',
      endYearText: '2045',
    });
  });

  it('keeps moving a phase that has already left its original row', () => {
    addEvent('Car');
    const [phase] = latest.events[0].phases;
    act(() => latest.addEventWithPhase(2070, 2070));
    const target = latest.events[1];

    // A drag commits once per pointer move, so later moves still name the row
    // the phase started in.
    act(() => latest.movePhase(phase.id, target.id, 2044, 2045));
    act(() => latest.movePhase(phase.id, target.id, 2048, 2049));

    const moved = latest.events.find((event) => event.phases.some((one) => one.id === phase.id));
    expect(moved?.id).toBe(target.id);
    expect(moved?.phases.find((one) => one.id === phase.id)?.startYearText).toBe('2048');
  });

  it('settles a range edit in place when the target row is the owner', () => {
    const event = addEvent('Car');
    const [phase] = latest.events[0].phases;

    act(() => latest.movePhase(phase.id, event.id, 2042, 2043));

    expect(latest.events[0].phases[0]).toMatchObject({
      startYearText: '2042',
      endYearText: '2043',
    });
  });

  it('still moves a phase dropped back on a row it has already left', () => {
    const source = addEvent('Car');
    const [phase] = latest.events[0].phases;
    act(() => latest.addEventWithPhase(2070, 2070));
    const target = latest.events[1];

    act(() => latest.movePhase(phase.id, target.id, 2044, 2045));
    // The pointer went back to the row it started in; the caller still holds the
    // origin id, so the owner has to be looked up by phase id.
    act(() => latest.movePhase(phase.id, source.id, 2046, 2047));

    const moved = latest.events.find((event) => event.phases.some((one) => one.id === phase.id));
    expect(moved?.id).toBe(source.id);
    expect(moved?.phases.find((one) => one.id === phase.id)?.startYearText).toBe('2046');
  });

  it('reparents from the inspector without changing the years', () => {
    addEvent('Car');
    const [phase] = latest.events[0].phases;
    act(() => latest.addEventWithPhase(2070, 2070));
    const target = latest.events[1];

    act(() => latest.reparentPhase(phase.id, target.id));

    expect(latest.events[0].phases[0].id).not.toBe(phase.id);
    expect(latest.events[1].phases.find((one) => one.id === phase.id)).toMatchObject({
      startYearText: '2040',
      endYearText: '2040',
    });
  });

  it('keeps a blank year blank when reparenting', () => {
    const source = addEvent('Car');
    const [phase] = latest.events[0].phases;
    fillPhase(source.id, phase.id, { endYearText: '' });
    act(() => latest.addEventWithPhase(2070, 2070));
    const target = latest.events[1];

    act(() => latest.reparentPhase(phase.id, target.id));

    expect(latest.events[1].phases.find((one) => one.id === phase.id)?.endYearText).toBe('');
  });

  it('renames a phase whose name is already taken in the target row', () => {
    addEvent('Car');
    const [phase] = latest.events[0].phases;
    act(() => latest.addEventWithPhase(2070, 2070));
    const target = latest.events[1];
    expect(target.phases[0].name).toBe('Phase 1');
    expect(phase.name).toBe('Phase 1');

    act(() => latest.movePhase(phase.id, target.id, 2044, 2044));

    expect(latest.events[1].phases.map((one) => one.name).sort()).toEqual(['Phase 1', 'Phase 2']);
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
