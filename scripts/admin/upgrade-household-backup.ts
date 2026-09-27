/**
 * Pure transform: household backup JSON from the live v0 era to the current
 * (v1) era so the app's import path can restore it (issue: live backup
 * upgrade). The transform mutates nothing; it returns a new payload.
 *
 * Transform scope (grilled 2026-09-27):
 * - household: backfill memberUids from members keys (getHouseholdsByUser
 *   queries memberUids array-contains; the backup predates the field).
 * - portfolios: resolve accountIds[] into securitiesAccountId + bankAccountId
 *   via account category (same rule as migrate-portfolio-links.ts and
 *   portfolioConstraints.ts); accountIds is kept for v0 fidelity and is
 *   stripped on read.
 * - retirementPlans: replace the single v0 plan record with the hand-computed
 *   v1 plan below. The plan was computed by hand per the authoritative rules
 *   in migrate-retirement-v1.ts (DERIVED flattening, SALARY_PERCENTAGE
 *   flattening against the salary baseline at the retirement year, event
 *   phases, plan-doc field removal). Incomes omit calculatedFrom: the import
 *   path's reviveDates converts ISO strings to Date, which conflicts with the
 *   v1 schema's importedAt: string.
 *
 * Everything else passes through unchanged: the full-collection parse probe
 * against the real backup confirmed all other collections already match the
 * current schemas.
 *
 * Downgrade path: re-import the original backup JSON; no downgrade script
 * exists by design (verification is covered by unit tests, Q5).
 */
import { type HouseholdBackupPayload } from '../../src/application/household/use_cases/exportHouseholdBackupUseCase';
import {
  AccountCategory,
  type AccountCategory as AccountCategoryType,
} from '../../src/domains/account/types/categories';

type Unknowns = Record<string, unknown>;

const BANK_CATEGORIES: ReadonlySet<string> = new Set([AccountCategory.BANK, AccountCategory.CASH]);

/** Backfills memberUids from members keys (createHouseholdUseCase rule). */
export const backfillHouseholdMemberUids = (household: Unknowns): Unknowns => {
  if (Array.isArray(household.memberUids) && household.memberUids.length > 0) {
    return household;
  }
  return {
    ...household,
    memberUids: Object.keys(household.members ?? {}),
  };
};

/** Resolves portfolio accountIds[] into named link fields (bank|cash rule). */
export const resolvePortfolioLinks = (
  portfolio: Unknowns,
  categories: ReadonlyMap<string, AccountCategoryType>,
): Unknowns => {
  const accountIds = Array.isArray(portfolio.accountIds) ? (portfolio.accountIds as string[]) : [];

  const securities = accountIds.find((id) => categories.get(id) === AccountCategory.SECURITIES);
  const bank = accountIds.find((id) => BANK_CATEGORIES.has(categories.get(id) ?? ''));

  if (!securities || !bank) {
    throw new Error(`cannot resolve portfolio links from accountIds=[${accountIds.join(', ')}]`);
  }

  return {
    ...portfolio,
    securitiesAccountId: securities,
    bankAccountId: bank,
  };
};

/**
 * The live v0 retirement plan "偉大的航道" (id lGcR485GBAfcl8AWqJyN), recomputed
 * into the v1 flat shape. Amounts come from the migrate-retirement-v1 rules
 * applied to the 2026-09-12 backup:
 * - currentYear 2025, retirement year 2040 (birthYear 1995 + age 45).
 * - Salary baselines projected to 2040 with 3% growth: 妹妹薪資 1,171,172.4,
 *   哥哥薪資 1,463,941.0, all-salary 3,689,158.7.
 * - DERIVED incomes: round(base x 0.4); non-pension streams keep their level
 *   after retirement (retirementAnnual = currentAnnual).
 * - SALARY_PERCENTAGE expenses: round(linked-or-all baseline x percentage);
 *   retirementMultiplier stays (v1 keeps it).
 * - Events keep their FIXED amounts; phases already carry amounts.
 * - Plan doc drops currentSavings / salaryGrowthRate / retirementTransition /
 *   summary (summary used savingsAtRetirement; Recalculate re-derives it).
 */
export const upgradedRetirementPlan: Unknowns = {
  id: 'lGcR485GBAfcl8AWqJyN',
  createdBy: 'manic35153@gmail.com',
  createdAt: '2026-06-05T09:40:49.813Z',
  updatedBy: 'manic35153@gmail.com',
  updatedAt: '2026-06-05T09:40:49.813Z',
  name: '偉大的航道',
  isActive: true,
  autoUpdate: true,
  currentYear: 2025,
  birthYear: 1995,
  retirementAge: 45,
  lifeExpectancy: 100,
  inflationRate: 2,
  investmentReturnRate: 6,
  incomes: [
    {
      id: 'baae3a4e-2d12-4700-9482-f3bcd2d2ac60',
      name: '妹妹薪資',
      incomeCategory: 'income:salary:celine',
      type: 'salary',
      lifelong: false,
      startYear: 2025,
      endYear: 2045,
      currentAnnual: 751731,
      retirementAnnual: 751731,
      growthRate: 3,
    },
    {
      id: '753eb48e-939d-4472-b124-bced2c4a4a1a',
      name: '妹妹獎金',
      type: 'salary',
      lifelong: false,
      startYear: 2025,
      endYear: 2045,
      currentAnnual: 300692,
      retirementAnnual: 300692,
      growthRate: 3,
    },
    {
      id: 'd3e0f9ce-cfdf-497d-90b0-93f2d2f5e2d0',
      name: '哥哥薪資',
      incomeCategory: 'income:salary:charles',
      type: 'salary',
      lifelong: false,
      startYear: 2025,
      endYear: 2045,
      currentAnnual: 939648,
      retirementAnnual: 939648,
      growthRate: 3,
    },
    {
      id: 'eb00c067-c537-464a-85ed-1a66a63c86ac',
      name: '哥哥獎金',
      type: 'salary',
      lifelong: false,
      startYear: 2025,
      endYear: 2045,
      currentAnnual: 375859,
      retirementAnnual: 375859,
      growthRate: 3,
    },
  ],
  expenses: [
    {
      id: '38073b6f-dc3a-4110-8700-680ffd3291d0',
      name: '汽車-妹妹',
      type: 'general',
      includesPrincipal: false,
      interestOnly: false,
      currentAnnual: 58559,
      growthRate: 2,
      retirementMultiplier: 0.7,
      startYear: 2025,
    },
    {
      id: '6c1c0845-a2d5-4ae6-bf46-c55413b5be57',
      name: '生活費',
      type: 'general',
      includesPrincipal: false,
      interestOnly: false,
      currentAnnual: 1106748,
      growthRate: 2,
      retirementMultiplier: 0.7,
      startYear: 2025,
    },
    {
      id: '93e8a8d0-e0be-4242-84b4-2b55f0f43bd7',
      name: '居住-妹妹',
      type: 'general',
      includesPrincipal: false,
      interestOnly: false,
      currentAnnual: 234234,
      growthRate: 2,
      retirementMultiplier: 0.7,
      startYear: 2025,
    },
    {
      id: '959f819f-3849-407c-8cbc-bd0b4300cd44',
      name: '汽車-哥哥',
      type: 'general',
      includesPrincipal: false,
      interestOnly: false,
      currentAnnual: 73197,
      growthRate: 2,
      retirementMultiplier: 0.7,
      startYear: 2025,
    },
    {
      id: 'b6a02a07-dd20-41a5-b7f9-23f67dc0d0d0',
      name: '保險-妹妹',
      type: 'general',
      includesPrincipal: false,
      interestOnly: false,
      currentAnnual: 35135,
      growthRate: 2,
      retirementMultiplier: 0.7,
      startYear: 2025,
    },
    {
      id: 'f1faa6fb-f128-46db-a0ef-bd515992d4b9',
      name: '居住-哥哥',
      type: 'general',
      includesPrincipal: false,
      interestOnly: false,
      currentAnnual: 292788,
      growthRate: 2,
      retirementMultiplier: 0.7,
      startYear: 2025,
    },
    {
      id: 'f4561fcc-e787-47cd-9163-d7745f0d9eed',
      name: '保險-哥哥',
      type: 'general',
      includesPrincipal: false,
      interestOnly: false,
      currentAnnual: 43918,
      growthRate: 2,
      retirementMultiplier: 0.7,
      startYear: 2025,
    },
  ],
  events: [
    {
      id: 'e9249f41-59c9-48d6-abd9-88e2ae375bc0',
      type: 'expense',
      name: '房屋裝修',
      // v1 keeps the ADR-0035 legacy one-time path (year/amount), but the
      // phases array is schema-required; the engine normalizes it back to a
      // single phase from year/amount.
      phases: [],
      year: 2026,
      amount: 500000,
    },
    {
      id: '09baa6e3-c53f-4ffd-b0cd-b8f03aa304a3',
      type: 'expense',
      name: '小孩',
      phases: [
        { name: '出生', startYear: 2027, endYear: 2027, amount: 350000, growthRate: 0 },
        { name: '學齡前', startYear: 2028, endYear: 2030, amount: 714000, growthRate: 2 },
        { name: '幼兒園', startYear: 2031, endYear: 2033, amount: 525000, growthRate: 2 },
        { name: '小學', startYear: 2034, endYear: 2039, amount: 595000, growthRate: 2 },
        { name: '國中', startYear: 2040, endYear: 2042, amount: 595000, growthRate: 2 },
        { name: '高中', startYear: 2043, endYear: 2045, amount: 595000, growthRate: 2 },
        { name: '大學', startYear: 2046, endYear: 2051, amount: 686000, growthRate: 2 },
      ],
      note: '2人',
    },
  ],
};

/** Replaces the single v0 plan record with the hardcoded v1 plan. */
export const replaceRetirementPlans = (plans: unknown[]): unknown[] => {
  if (plans.length !== 1) {
    throw new Error(`expected exactly 1 retirement plan, found ${plans.length}`);
  }
  return [upgradedRetirementPlan];
};

/**
 * Upgrades a v0-era household backup payload to the current era.
 * The input is treated as read-only; a new payload object is returned.
 */
export const upgradeHouseholdBackup = (payload: HouseholdBackupPayload): HouseholdBackupPayload => {
  const accounts = payload.collections.accounts;
  const categories = new Map<string, AccountCategoryType>();
  accounts.forEach(({ account }) => {
    const doc = account as Unknowns;
    if (typeof doc.id === 'string' && typeof doc.category === 'string') {
      categories.set(doc.id, doc.category as AccountCategoryType);
    }
  });

  return {
    ...payload,
    household: backfillHouseholdMemberUids(payload.household as Unknowns),
    collections: {
      ...payload.collections,
      portfolios: payload.collections.portfolios.map(({ portfolio, snapshots }) => ({
        portfolio: resolvePortfolioLinks(portfolio as Unknowns, categories),
        snapshots,
      })),
      retirementPlans: replaceRetirementPlans(payload.collections.retirementPlans),
    },
  };
};
