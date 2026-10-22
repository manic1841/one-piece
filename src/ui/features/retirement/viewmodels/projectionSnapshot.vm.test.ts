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
