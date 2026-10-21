import { z } from 'zod';

import { householdPermissionService } from '@/application/household/householdPermissionService';
import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { type AuthContext } from '@/application/types';
import { type RetirementAssumptions } from '@/domains/retirement/assumptions';
import { RetirementSchemaErrorCode } from '@/domains/retirement/errorCodes';
import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import {
  type CreateProjectionAtomicallyInput,
  type ProjectionAnnual,
  type ProjectionConfig,
  type ProjectionSource,
} from '@/domains/retirement/logic/projectionDocuments';
import { ENGINE_VERSION, calculateProjection } from '@/domains/retirement/logic/projectionEngine';
import {
  type ProjectionInput,
  type ProjectionResolveError,
  type ProjectionResult,
} from '@/domains/retirement/logic/projectionTypes';
import { resolveProjectionInput } from '@/domains/retirement/logic/resolveProjectionInput';
import { createRetirementPlanCreateSchema } from '@/domains/retirement/planSchemas';
import { type ProjectionRule, type RuleSourceType } from '@/domains/retirement/projectionRules';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { projectionRepository } from '@/infra/repositories/projectionRepository';
import { transactionRepository } from '@/infra/repositories/transactionRepository';

import { getProjectionOpeningUseCase } from './getProjectionOpeningUseCase';

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
}

/** Everything SAVE needs; calculated once and never recomputed. */
export interface ProjectionCalculation {
  input: ProjectionInput;
  result: ProjectionResult;
  warnings: ProjectionResolveError[];
  config: ProjectionConfig;
  source: ProjectionSource;
  startYear: number;
}

interface ProjectionFailure {
  ok: false;
  code: ProjectionCommandErrorCode;
  issues?: z.ZodIssue[];
  errors?: ProjectionResolveError[];
  warnings?: ProjectionResolveError[];
}

export type CalculateProjectionOutcome =
  | { ok: true; calculation: ProjectionCalculation }
  | ProjectionFailure;

export type PersistProjectionOutcome = { ok: true; id: string } | ProjectionFailure;

const currentYear = (): number => new Date().getFullYear();

const pad = (value: number): string => String(value).padStart(2, '0');

/** LOCAL time, matching the workspace dialog default. */
export function defaultProjectionName(now = new Date()): string {
  return `Projection ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(
    now.getHours(),
  )}:${pad(now.getMinutes())}`;
}

const nameSchema = z
  .string()
  .trim()
  .min(1, RetirementSchemaErrorCode.NAME_REQUIRED)
  .max(100, RetirementSchemaErrorCode.NAME_TOO_LONG);

function startOfYear(year: number): Date {
  return new Date(year, 0, 1);
}

/**
 * Net amount for one ledger code in one baseline year. The baseline year is
 * explicit now, so the cache key is rule + year rather than ledger code.
 */
async function loadLedgerNetForYear(
  householdId: string,
  ledgerCodeId: string,
  year: number,
): Promise<Map<number, number>> {
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
}

function baselineYearFor(rule: ProjectionRule, startYear: number): number {
  if (rule.baselinePolicy === 'specificYear' && typeof rule.baselineYear === 'number') {
    return rule.baselineYear;
  }
  return startYear - 1;
}

function ruleSource(rule: ProjectionRule): { type: RuleSourceType; id: string } | undefined {
  return rule.source;
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

      const year = baselineYearFor(rule, startYear);
      const key = `${rule.id}:${year}`;
      let pending = loaded.get(key);
      if (pending === undefined) {
        pending = loadLedgerNetForYear(householdId, source.id, year);
        loaded.set(key, pending);
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
 * Validate, resolve and calculate without writing. The returned calculation is
 * the frozen input SAVE reuses.
 */
export class CreateProjectionUseCase {
  async calculate(request: CreateProjectionRequest): Promise<CalculateProjectionOutcome> {
    const { householdId, auth, startYear, opening, assumptions, rules, lifeEvents } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const userEmail = auth.email ?? auth.uid;
    const now = new Date();

    const parsed = createRetirementPlanCreateSchema(currentYear()).safeParse({
      name: defaultProjectionName(now),
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
      const derived = await getProjectionOpeningUseCase.execute({ householdId, auth });
      if ('reason' in derived) {
        return {
          ok: false,
          code: ProjectionCommandErrorCode.PROJECTION_RESOLVE_FAILED,
          errors: [{ code: 'MISSING_BASELINE', params: { kind: 'opening' }, severity: 'error' }],
          warnings: [],
        };
      }
      openingAmount = derived.openingNetWorth;
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
    const config: ProjectionConfig = {
      startYear,
      openingNetWorth: {
        amount: resolved.input.openingNetWorth,
        source: opening.source,
        ...(anchorYearMonth === undefined ? {} : { anchorYearMonth }),
      },
      assumptions: parsed.data.assumptions,
      projectionRules: parsed.data.projectionRules,
      lifeEvents: parsed.data.lifeEvents,
    };

    return {
      ok: true,
      calculation: {
        input: resolved.input,
        result,
        warnings: resolved.warnings,
        config,
        source: { ruleSources: resolved.ruleSources },
        startYear,
      },
    };
  }

  /** Name-only write of the frozen calculation. */
  async persist(request: {
    householdId: string;
    auth: AuthContext;
    name: string;
    calculation: ProjectionCalculation;
  }): Promise<PersistProjectionOutcome> {
    const { householdId, auth, calculation } = request;

    await householdPermissionService.assertWritePermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );

    const parsedName = nameSchema.safeParse(request.name);
    if (!parsedName.success) {
      return {
        ok: false,
        code: ProjectionCommandErrorCode.PROJECTION_VALIDATION_FAILED,
        issues: parsedName.error.issues,
      };
    }

    const now = new Date();
    const userEmail = auth.email ?? auth.uid;
    const input: CreateProjectionAtomicallyInput = {
      householdId,
      projection: {
        name: parsedName.data,
        engineVersion: ENGINE_VERSION,
        createdAt: now,
        createdBy: userEmail,
        ...calculation.result.summary,
      },
      config: calculation.config,
      source: calculation.source,
      results: { years: calculation.result.years } satisfies ProjectionAnnual,
    };

    try {
      const written = await projectionRepository.createProjectionAtomically(input);
      if (!written.ok) {
        return { ok: false, code: ProjectionCommandErrorCode.PROJECTION_TOO_LARGE };
      }
      return { ok: true, id: written.id };
    } catch {
      return { ok: false, code: ProjectionCommandErrorCode.PROJECTION_WRITE_FAILED };
    }
  }
}

export const createProjectionUseCase = new CreateProjectionUseCase();
