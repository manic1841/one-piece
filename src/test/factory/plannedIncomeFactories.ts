import type { PlannedIncome } from '@/schemas/plannedIncome';

// Factory: PlannedIncome
export function createPlannedIncome(overrides?: Partial<PlannedIncome>): PlannedIncome {
  return {
    id: 'pi-test-1',
    date: new Date(),
    amount: 50000,
    category: 'salary',
    description: 'Test Salary',
    createdBy: 'test-user',
    createdAt: new Date(),
    updatedBy: 'test-user',
    updatedAt: new Date(),
    allocations: [],
    ...overrides,
  };
}

// Batch Factory: Create multiple PlannedIncomes
export function createPlannedIncomes(
  count: number,
  overrides?: Partial<PlannedIncome>,
): PlannedIncome[] {
  return Array.from({ length: count }, (_, i) =>
    createPlannedIncome({
      id: `pi-test-${i + 1}`,
      ...overrides,
    }),
  );
}
