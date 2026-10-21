import { type z } from 'zod';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { type AuthContext } from '@/application/types';
import { type RetirementAssumptions } from '@/domains/retirement/assumptions';
import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import { ENGINE_VERSION, calculateProjection } from '@/domains/retirement/logic/projectionEngine';
import {
  type ProjectionResolveError,
  type ProjectionResult,
} from '@/domains/retirement/logic/projectionTypes';
import { resolveProjectionInput } from '@/domains/retirement/logic/resolveProjectionInput';
import { createRetirementPlanCreateSchema } from '@/domains/retirement/planSchemas';
import { type ProjectionRule, type RuleSourceType } from '@/domains/retirement/projectionRules';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { projectionRepository } from '@/infra/repositories/projectionRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { getStartingNetWorthUseCase } from './getStartingNetWorthUseCase';

export const ProjectionCommandErrorCode = {
  PROJECTION_VALIDATION_FAILED: 'PROJECTION_VALIDATION_FAILED',
  PROJECTION_RESOLVE_FAILED: 'PROJECTION_RESOLVE_FAILED',
  PROJECTION_TOO_LARGE: 'PROJECTION_TOO_LARGE',
  PROJECTION_WRITE_FAILED: 'PROJECTION_WRITE_FAILED',
} as const;

export type ProjectionCommandErrorCode =
  (typeof ProjectionCommandErrorCode)[keyof typeof ProjectionCommandErrorCode];

export type ProjectionOpeningSource = 'derived' | 'manual';

export interface CreateProjectionOpening {
  source: ProjectionOpeningSource;
  /** Required for manual openings. */
  amount?: number;
}

export interface CreateProjectionRequest {
  householdId: string;
  auth: AuthContext;
  name?: string;
  startYear: number;
  opening: CreateProjectionOpening;
  assumptions: RetirementAssumptions;
  rules: ProjectionRule[];
  lifeEvents: LifeEvent[];
  /** `false` runs the whole chain without touching Firestore (CALCULATE). */
  persist?: boolean;
}

interface ProjectionSuccess {
  ok: true;
  id: string | null;
  result: ProjectionResult;
  input: Parameters<typeof calculateProjection>[0];
  warnings: ProjectionResolveError[];
}

interface ProjectionFailure {
  ok: false;
  code: ProjectionCommandErrorCode;
  issues?: z.ZodIssue[];
  errors?: ProjectionResolveError[];
  warnings?: ProjectionResolveError[];
}

export type CreateProjectionOutcome = ProjectionSuccess | ProjectionFailure;

const currentYear = (): number => new Date().getFullYear();

function startOfYear(year: number): Date {
  return new Date(year, 0, 1);
}

function ruleSource(rule: ProjectionRule): { type: RuleSourceType; id: string } | undefined {
  return rule.source;
}

/**
 * Baseline net amounts for one ledger code. `specificYear` means "newest
 * available year", so it walks backwards from the previous complete year and
 * stops at the first year that has entries.
 */
async function loadLedgerNetByYear(input: {
  householdId: string;
  ledgerCodeId: string;
  startYear: number;
  specificYear: boolean;
}): Promise<Map<number, number>> {
  const { householdId, ledgerCodeId, startYear, specificYear } = input;

  const loadYear = async (year: number): Promise<Map<number, number>> => {
    const transactions = await transactionRepository.listByDateRange(
      householdId,
      startOfYear(year),
      startOfYear(year + 1),
    );

    let net = 0;
    let found = false;
    for (const transaction of transactions) {
      for (const entry of transaction.entries) {
        if (entry.ledgerCode !== ledgerCodeId) continue;
        net += (entry.credit || 0) - (entry.debit || 0);
        found = true;
      }
    }

    const map = new Map<number, number>();
    if (found) map.set(year, net);
    return map;
  };

  const previousCompleteYear = startYear - 1;
  if (!specificYear) return loadYear(previousCompleteYear);

  for (let year = previousCompleteYear; year >= 1900; year -= 1) {
    const map = await loadYear(year);
    if (map.size > 0) return map;
  }
  return new Map();
}

async function gatherRuleSources(input: {
  householdId: string;
  auth: AuthContext;
  startYear: number;
  rules: ProjectionRule[];
}) {
  const { householdId, auth, startYear, rules } = input;
  const ledgerSources = new Map<string, { netByYear: Map<number, number> }>();
  const debtAccounts = new Map<string, { monthlyPayment: number; endDate: Date }>();

  const ledgerRules = rules.filter((rule) => ruleSource(rule)?.type === 'ledgerCode');
  const debtRules = rules.filter((rule) => ruleSource(rule)?.type === 'debtAccount');

  if (ledgerRules.length > 0) {
    const codes = await listAllLedgerCodesUseCase.execute({
      householdId,
      includeInactive: true,
      auth,
      labelResolver: (code) => code,
    });
    const existing = new Set(codes.map((code) => code.code));
    const loaded = new Map<string, Promise<Map<number, number>>>();

    for (const rule of ledgerRules) {
      const source = ruleSource(rule);
      if (source === undefined || !existing.has(source.id)) continue;

      let pending = loaded.get(source.id);
      if (pending === undefined) {
        pending = loadLedgerNetByYear({
          householdId,
          ledgerCodeId: source.id,
          startYear,
          specificYear: rule.baselinePolicy === 'specificYear',
        });
        loaded.set(source.id, pending);
      }
      ledgerSources.set(source.id, { netByYear: await pending });
    }
  }

  if (debtRules.length > 0) {
    const accounts = await debtAccountRepository.getDebtAccounts(householdId, true);
    const byId = new Map(accounts.map((account) => [account.id, account]));

    for (const rule of debtRules) {
      const source = ruleSource(rule);
      if (source === undefined) continue;
      const account = byId.get(source.id);
      if (account === undefined) continue;

      debtAccounts.set(source.id, {
        monthlyPayment: account.monthlyPayment,
        endDate: account.endDate,
      });
    }
  }

  return { ledgerSources, debtAccounts };
}

/**
 * Validate, resolve and calculate a projection. `persist` decides whether the
 * documents are written; a persisted projection is always four documents in
 * one batch with a fresh id per attempt.
 */
export class CreateProjectionUseCase {
  async execute(request: CreateProjectionRequest): Promise<CreateProjectionOutcome> {
    const {
      householdId,
      auth,
      name,
      startYear,
      opening,
      assumptions,
      rules,
      lifeEvents,
      persist = true,
    } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const userEmail = auth.email ?? auth.uid;
    const now = new Date();
    const projectionName = name ?? `Projection ${now.toISOString().slice(0, 16).replace('T', ' ')}`;

    const parsed = createRetirementPlanCreateSchema(currentYear()).safeParse({
      name: projectionName,
      assumptions,
      projectionRules: rules,
      lifeEvents,
      createdBy: userEmail,
      updatedBy: userEmail,
      createdAt: now,
      updatedAt: now,
    });

    if (!parsed.success) {
      return {
        ok: false,
        code: ProjectionCommandErrorCode.PROJECTION_VALIDATION_FAILED,
        issues: parsed.error.issues,
      };
    }

    let openingAmount = opening.amount;
    let anchorYearMonth: string | undefined;

    if (opening.source === 'derived') {
      const derived = await getStartingNetWorthUseCase.execute({ householdId, auth });
      if ('reason' in derived) {
        return {
          ok: false,
          code: ProjectionCommandErrorCode.PROJECTION_RESOLVE_FAILED,
          errors: [{ code: 'MISSING_BASELINE', params: { kind: 'opening' }, severity: 'error' }],
          warnings: [],
        };
      }
      openingAmount = derived.startingNetWorth;
      anchorYearMonth = derived.anchorYearMonth;
    }

    const { ledgerSources, debtAccounts } = await gatherRuleSources({
      householdId,
      auth,
      startYear,
      rules: parsed.data.projectionRules,
    });

    const resolved = resolveProjectionInput({
      assumptions: parsed.data.assumptions,
      rules: parsed.data.projectionRules,
      lifeEvents: parsed.data.lifeEvents,
      startYear,
      opening: { amount: openingAmount, source: opening.source, anchorYearMonth },
      ledgerSources,
      debtAccounts,
    });

    if (!resolved.ok) {
      return {
        ok: false,
        code: ProjectionCommandErrorCode.PROJECTION_RESOLVE_FAILED,
        errors: resolved.errors,
        warnings: resolved.warnings,
      };
    }

    const result = calculateProjection(resolved.input);

    if (!persist) {
      return {
        ok: true,
        id: null,
        result,
        input: resolved.input,
        warnings: resolved.warnings,
      };
    }

    try {
      const written = await projectionRepository.createProjectionAtomically({
        householdId,
        projection: {
          name: parsed.data.name,
          engineVersion: ENGINE_VERSION,
          createdAt: now,
          createdBy: userEmail,
          ...result.summary,
        },
        config: {
          startYear,
          openingNetWorth: {
            amount: resolved.input.openingNetWorth,
            source: opening.source,
            ...(anchorYearMonth === undefined ? {} : { anchorYearMonth }),
          },
          assumptions: parsed.data.assumptions,
          projectionRules: parsed.data.projectionRules,
          lifeEvents: parsed.data.lifeEvents,
        },
        source: { ruleSources: resolved.ruleSources },
        results: { years: result.years },
      });

      if (!written.ok) {
        return { ok: false, code: ProjectionCommandErrorCode.PROJECTION_TOO_LARGE };
      }

      return {
        ok: true,
        id: written.id,
        result,
        input: resolved.input,
        warnings: resolved.warnings,
      };
    } catch {
      return { ok: false, code: ProjectionCommandErrorCode.PROJECTION_WRITE_FAILED };
    }
  }
}

export const createProjectionUseCase = new CreateProjectionUseCase();
