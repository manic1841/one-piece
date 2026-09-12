/**
 * Pure mutations for retirement plan child collections (incomes, expenses,
 * events). These derive the next array for a whole-batch replacement; they
 * never touch persistence — plan writes go through updateRetirementPlanUseCase.
 */

interface WithId {
  id: string;
}

export function appendById<T extends WithId>(items: T[], next: T): T[] {
  return [...items, next];
}

export function upsertById<T extends WithId>(items: T[], id: string, next: Omit<T, 'id'>): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...next, id: item.id } : item));
}

export function removeById<T extends WithId>(items: T[], id: string): T[] {
  return items.filter((item) => item.id !== id);
}
