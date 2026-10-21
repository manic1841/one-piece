import { householdPermissionService } from '@/application/household/householdPermissionService';
import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import {
  ProjectionCommandErrorCode,
  type ProjectionFailure,
} from '@/application/retirement/errors';
import { loadLedgerNetForYear } from '@/application/retirement/ledgerBaseline';
import {
  type CalculateProjectionRequest,
  type ProjectionCalculation,
} from '@/application/retirement/types';
import { getProjectionOpeningUseCase } from '@/application/retirement/use_cases/getProjectionOpeningUseCase';
import { type AuthContext } from '@/application/types';
import { baselineYearFor } from '@/domains/retirement/calculators/ledgerBaseline';
import { calculateProjection } from '@/domains/retirement/calculators/projectionEngine';
import { type ProjectionRule, type RuleSourceType } from '@/domains/retirement/projectionRules';
import { resolveProjectionInput } from '@/domains/retirement/resolveProjectionInput';
import { type ProjectionConfig } from '@/domains/retirement/schemas/projectionSchemas';
import { createRetirementPlanCreateSchema } from '@/domains/retirement/schemas/retirementSchemas';
import { debtAccountRepository } from '@/infra/repositories/debtAccountRepository';
import { defaultProjectionName } from '@/shared/projectionName';

export type CalculateProjectionOutcome =
  | { ok: true; calculation: ProjectionCalculation }
  | ProjectionFailure;

const currentYear = (): number => new Date().getFullYear();

/** LOCAL time, matching the workspace dialog default. */
export { defaultProjectionName };

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

    // Rules may share a code with different baseline years; merge per code
    // instead of replacing the entry, so neither year is lost.
    const mergeYear = (sourceId: string, netByYear: Map<number, number>): void => {
      const entry = ledgerSources.get(sourceId);
      if (entry === undefined) {
        ledgerSources.set(sourceId, { netByYear: new Map(netByYear) });
        return;
      }
      for (const [year, net] of netByYear) entry.netByYear.set(year, net);
    };

    for (const rule of ledgerRules) {
      const source = ruleSource(rule);
      if (source === undefined || !existing.has(source.id)) continue;

      const year = baselineYearFor(rule, startYear);
      const key = `${source.id}:${year}`;
      let pending = loaded.get(key);
      if (pending === undefined) {
        pending = loadLedgerNetForYear(householdId, source.id, year);
        loaded.set(key, pending);
      }
      mergeYear(source.id, await pending);
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
 * Validate, resolve and calculate without writing. Sequences the opening
 * resolution, the rule-source reads and the domain resolve/engine, so it is a
 * workflow rather than a single-step use case. The returned calculation is the
 * frozen input PERSIST reuses.
 */
export class CalculateProjectionWorkflow {
  async execute(request: CalculateProjectionRequest): Promise<CalculateProjectionOutcome> {
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
      },
    };
  }
}

export const calculateProjectionWorkflow = new CalculateProjectionWorkflow();
