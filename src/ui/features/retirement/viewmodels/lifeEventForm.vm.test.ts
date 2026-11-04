import { describe, expect, it } from 'vitest';

import {
  LifeEventFormSchema,
  blankEvent,
  blankPhase,
  collectEventErrors,
  focusTargetFor,
  isCompleteYear,
  mapEventDraftVMToDomain,
  mapEventToVM,
  sortEvents,
  sortPhases,
} from './lifeEventForm.vm';

const phase = (startYearText: string, endYearText: string, amountText = '100') => ({
  ...blankPhase(),
  startYearText,
  endYearText,
  amountText,
});

describe('lifeEventForm.vm', () => {
  it('sorts phases by start year, sinking blank starts', () => {
    const blank = blankPhase();
    const sorted = sortPhases([phase('2050', '2051'), blank, phase('2030', '2031')]);

    expect(sorted.map((item) => item.startYearText)).toEqual(['2030', '2050', '']);
  });

  it('treats only a four-digit year as settled', () => {
    expect(['1', '19', '190'].every((text) => isCompleteYear(text))).toBe(false);
    expect(isCompleteYear('1998')).toBe(true);
    expect(isCompleteYear(undefined)).toBe(false);
  });

  it('sorts events by their earliest settled start, sinking year-less ones', () => {
    const late = { ...blankEvent(), phases: [phase('2060', '2060')] };
    const early = { ...blankEvent(), phases: [phase('2030', '2030'), phase('2010', '2010')] };
    const empty = blankEvent();

    const sorted = sortEvents([late, empty, early]);

    expect(sorted.map((event) => event.id)).toEqual([early.id, late.id, empty.id]);
  });

  it('omits blank optional fields from the domain payload', () => {
    const event = { ...blankEvent(), name: 'Travel', phases: [phase('2040', '2041')] };

    expect(mapEventDraftVMToDomain(event)).toEqual({
      id: event.id,
      name: 'Travel',
      type: 'income',
      enabled: true,
      phases: [{ startYear: 2040, endYear: 2041, amount: 100 }],
    });
  });

  it('maps a stored event to draft text', () => {
    const vm = mapEventToVM({
      id: 'event-1',
      name: 'Travel',
      type: 'expense',
      enabled: false,
      phases: [{ startYear: 2040, endYear: 2042, amount: 1000, growthRate: 0.02 }],
    });

    expect(vm.phases[0]).toMatchObject({ startYearText: '2040', growthRateText: '2' });
  });

  it('reports overlap on the offending phase start year', () => {
    const event = {
      ...blankEvent(),
      name: 'Car',
      phases: [phase('2020', '2030'), phase('2025', '2040')],
    };

    expect(collectEventErrors([event])[event.id].phaseErrors?.[event.phases[1].id]).toEqual({
      startYear: '階段不可重疊',
    });
  });

  it('focuses the offending field for a cross-phase failure', () => {
    const event = { ...blankEvent(), name: 'Car', phases: [phase('2050', '2040')] };

    expect(focusTargetFor(event)).toMatchObject({
      eventId: event.id,
      field: 'endYear',
    });
  });

  it('emits issues at the event index and phase path', () => {
    const event = { ...blankEvent(), name: '', phases: [phase('2050', '2040')] };
    const parsed = LifeEventFormSchema.safeParse({ events: [event] });

    expect(parsed.success).toBe(false);
    expect(parsed.error!.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: [0, 'name'], message: '事件名稱必填' }),
        expect.objectContaining({
          path: [0, 'phases', 0, 'endYear'],
          message: '結束年度不得早於開始年度',
        }),
      ]),
    );
  });
});
