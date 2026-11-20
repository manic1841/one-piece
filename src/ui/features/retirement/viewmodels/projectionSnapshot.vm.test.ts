import { type ProjectionConfig } from '@/application/retirement/use_cases/getProjectionViewUseCase';
import { type ProjectionDocument } from '@/domains/retirement/schemas';

import { mapProjectionSnapshotToVM } from './projectionSnapshot.vm';

const PROJECTION = { id: 'p1', createdAt: new Date('2026-03-02T00:00:00Z') };

const config = (events: ProjectionConfig['lifeEvents']): ProjectionConfig =>
  ({
    startYear: 2026,
    openingNetWorth: { amount: 100_000, source: 'manual' },
    assumptions: {
      birthYear: 1990,
      retirementAge: 40,
      lifeExpectancy: 45,
      inflationRate: 0.02,
      annualReturnRate: 0.05,
    },
    projectionRules: [],
    lifeEvents: events,
  }) as unknown as ProjectionConfig;

const event = (phases: { startYear: number; endYear: number }[]) => ({
  id: 'e1',
  name: 'After',
  type: 'expense' as const,
  enabled: true,
  phases: phases.map((phase) => ({ ...phase, amount: 1 })),
});

describe('mapProjectionSnapshotToVM event spans', () => {
  it('clamps an event that sits wholly after the period onto the right edge', () => {
    const vm = mapProjectionSnapshotToVM(
      PROJECTION as ProjectionDocument,
      config([event([{ startYear: 2040, endYear: 2041 }])]),
      null,
      2035,
    );

    const [phase] = vm.events[0].phases;
    expect(phase.clippedStartYear).toBe(2035);
    expect(phase.clippedEndYear).toBe(2035);
    expect(vm.events[0].rangeText).toBe('2040–2041');
    expect(vm.events[0].isOutside).toBe(true);
  });

  it('clamps an event that sits wholly before the period onto the left edge', () => {
    const vm = mapProjectionSnapshotToVM(
      PROJECTION as ProjectionDocument,
      config([event([{ startYear: 2020, endYear: 2021 }])]),
      null,
      2035,
    );

    const [phase] = vm.events[0].phases;
    expect(phase.clippedStartYear).toBe(2026);
    expect(phase.clippedEndYear).toBe(2026);
  });
});

describe('mapProjectionSnapshotToVM keeps pace', () => {
  const rule = (id: string, method: string, keepsPaceWithInflation: boolean) => ({
    id,
    name: id,
    ruleType: 'expense' as const,
    enabled: true,
    method,
    parameters: method === 'fixedAmount' ? { amount: 1 } : {},
    endCondition: { type: 'lifelong' as const },
    keepsPaceWithInflation,
  });

  const withRules = (rules: unknown[]): ProjectionConfig =>
    ({ ...config([]), projectionRules: rules }) as unknown as ProjectionConfig;

  it('marks an enabled rule and dashes the rest', () => {
    const vm = mapProjectionSnapshotToVM(
      PROJECTION as ProjectionDocument,
      withRules([rule('a', 'fixedAmount', true), rule('b', 'fixedAmount', false)]),
      null,
      2035,
    );

    const rows = vm.ruleGroups.flatMap((group) => group.rows);
    expect(rows.map((row) => row.keepsPaceText)).toEqual(['✓', '—']);
  });

  it('still shows the column for methods the workspace cannot toggle', () => {
    const vm = mapProjectionSnapshotToVM(
      PROJECTION as ProjectionDocument,
      withRules([rule('a', 'inflation', true), rule('b', 'debtAmortization', false)]),
      null,
      2035,
    );

    const rows = vm.ruleGroups.flatMap((group) => group.rows);
    expect(rows.map((row) => row.keepsPaceText)).toEqual(['✓', '—']);
  });
});
