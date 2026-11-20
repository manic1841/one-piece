import { type Project } from '@/domains/project/schemas';
import { formatCurrencyOrDash } from '@/ui/utils';

/** Live project balance plus the month it was last settled in. */
export interface ProjectBalanceVM {
  balance: number | null;
  /** `YYYY-MM` of the newest snapshot, null when the project was never settled. */
  lastSettledYearMonth: string | null;
}

export interface ProjectRowVM {
  id: string;
  name: string;
  isActive: boolean;
  /** Raw sign-bearing balance, for the amount tone. */
  balance: number | null;
  balanceText: string;
  lastSettledMonthText: string;
}

export const toProjectRows = (
  projects: readonly Project[],
  balances: ReadonlyMap<string, ProjectBalanceVM>,
  neverSettledLabel: string,
): ProjectRowVM[] =>
  projects.map((project) => {
    const entry = balances.get(project.id);
    return {
      id: project.id,
      name: project.name,
      isActive: project.isActive,
      balance: entry?.balance ?? null,
      balanceText: formatCurrencyOrDash(entry?.balance ?? null),
      lastSettledMonthText: entry?.lastSettledYearMonth ?? neverSettledLabel,
    };
  });
