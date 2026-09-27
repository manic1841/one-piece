/**
 * Linked-year resolver for migrate-retirement-v1 (issue #132).
 *
 * Resolves income streams with startYearMode/endYearMode =
 * LINKED_TO_RETIREMENT into concrete years, mirroring the app engine's
 * resolveIncomeWindow / filterActiveIncomes so a migrated plan projects
 * identically after the mode fields are removed.
 *
 * Pure module (no Firestore): the migration script applies the returned
 * patches and reports resolvedCount.
 */

export const LINKED_TO_RETIREMENT = 'LINKED_TO_RETIREMENT' as const;

/** Minimal income doc shape the resolver reads; tolerant of extra fields. */
export interface LinkableIncomeDoc {
  id: string;
  startYearMode?: string;
  endYearMode?: string;
  startYear?: number;
  endYear?: number | null;
  lifelong?: boolean;
}

export interface LinkedYearPatch {
  id: string;
  startYear?: number;
  endYear?: number;
}

export interface LinkedYearResolution {
  patches: LinkedYearPatch[];
  /** Streams whose linked year modes were resolved into concrete years. */
  resolvedCount: number;
}

const isLinked = (mode: string | undefined): boolean => mode === LINKED_TO_RETIREMENT;

/**
 * Resolves LINKED_TO_RETIREMENT start/end years into the retirement year
 * (birthYear + retirementAge). A lifelong stream's end year stays unbounded:
 * writing endYear = retirementYear would truncate it at retirement.
 */
export const resolveLinkedIncomeYears = (
  incomes: LinkableIncomeDoc[],
  retirementYear: number,
): LinkedYearResolution => {
  const patches: LinkedYearPatch[] = [];
  for (const income of incomes) {
    const patch: LinkedYearPatch = { id: income.id };
    let changed = false;

    if (isLinked(income.startYearMode)) {
      patch.startYear = retirementYear;
      changed = true;
    }
    if (isLinked(income.endYearMode) && !income.lifelong) {
      patch.endYear = retirementYear;
      changed = true;
    }

    if (changed) patches.push(patch);
  }

  return { patches, resolvedCount: patches.length };
};
