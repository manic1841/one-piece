import { z } from 'zod';

import { DOCUMENT_MAX_BYTES } from '@/shared/documentSize';
import { TimestampSchema } from '@/shared/schemas/date';

import {
  type RetirementAssumptions,
  RetirementAssumptionsSchema,
  createAssumptionsSchema,
} from '../assumptions';
import { RetirementSchemaErrorCode } from '../errorCodes';
import { type LifeEvent, LifeEventsSchema } from '../lifeEvents';
import { addIssue } from '../numeric';
import { type ProjectionRule, ProjectionRulesSchema, RuleSourceType } from '../projectionRules';
import { type ProjectionYearResult, type RuleSourceSnapshot } from './projectionTypes';

export const PROJECTION_DOCUMENT_MAX_BYTES = DOCUMENT_MAX_BYTES;

export type ProjectionDocumentName = 'main' | 'config' | 'source' | 'annual';

export type ProjectionWriteResult =
  | { ok: true; id: string }
  | { ok: false; code: 'PROJECTION_TOO_LARGE'; document: ProjectionDocumentName };

export interface ProjectionSummaryFields {
  retirementNetWorth: number | null;
  finalNetWorth: number;
  minNetWorth: number;
  minNetWorthYear: number | null;
  bankruptcyYear: number | null;
  isBankrupt: boolean;
}

export interface ProjectionDocument extends ProjectionSummaryFields {
  id: string;
  name: string;
  engineVersion: number;
  createdAt: Date;
  createdBy: string;
}

export interface ProjectionConfig {
  startYear: number;
  openingNetWorth: {
    amount: number;
    source: 'derived' | 'manual';
    anchorYearMonth?: string;
  };
  assumptions: RetirementAssumptions;
  projectionRules: ProjectionRule[];
  lifeEvents: LifeEvent[];
}

export interface ProjectionSource {
  ruleSources: RuleSourceSnapshot[];
}

export interface ProjectionAnnual {
  years: ProjectionYearResult[];
}

export interface CreateProjectionAtomicallyInput {
  householdId: string;
  projection: Omit<ProjectionDocument, 'id'>;
  config: ProjectionConfig;
  source: ProjectionSource;
  results: ProjectionAnnual;
}

export const ProjectionYearResultSchema = z.object({
  year: z.number(),
  age: z.number(),
  isRetired: z.boolean(),
  opening: z.number(),
  return: z.number(),
  inflows: z.number(),
  outflows: z.number(),
  closing: z.number(),
});

export const ProjectionSummarySchema = z.object({
  retirementNetWorth: z.number().nullable(),
  finalNetWorth: z.number(),
  minNetWorth: z.number(),
  minNetWorthYear: z.number().nullable(),
  bankruptcyYear: z.number().nullable(),
  isBankrupt: z.boolean(),
});

export const ProjectionDocumentSchema = ProjectionSummarySchema.extend({
  name: z.string().trim().min(1),
  engineVersion: z.number(),
  createdAt: TimestampSchema,
  createdBy: z.string(),
});

export const ProjectionSourceSchema = z.object({
  ruleSources: z.array(
    z.object({
      ruleId: z.string(),
      sourceType: RuleSourceType,
      sourceId: z.string(),
      baselineYear: z.number(),
      baselineAmount: z.number(),
    }),
  ),
});

export const ProjectionAnnualSchema = z.object({
  years: z.array(ProjectionYearResultSchema),
});

/**
 * The config snapshot is the only place `specificYear <= startYear - 1` can be
 * checked: the rule schema has no clock and plans do not carry `startYear`.
 * The clock only enters through the assumptions shape, so the structural
 * variant (used to read) and the validated variant (used by the use case that
 * owns the clock) share everything else.
 */
function projectionConfigSchema<TSchema extends z.ZodType>(assumptions: TSchema) {
  return z
    .object({
      startYear: z.number().int(),
      openingNetWorth: z.object({
        amount: z.number(),
        source: z.enum(['derived', 'manual']),
        anchorYearMonth: z.string().optional(),
      }),
      assumptions,
      projectionRules: ProjectionRulesSchema,
      lifeEvents: LifeEventsSchema,
    })
    .superRefine((value, ctx) => {
      const hasAnchor = value.openingNetWorth.anchorYearMonth !== undefined;
      const isDerived = value.openingNetWorth.source === 'derived';

      if (isDerived && !hasAnchor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['openingNetWorth', 'anchorYearMonth'],
          message: 'ANCHOR_REQUIRED',
        });
      }
      if (!isDerived && hasAnchor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['openingNetWorth', 'anchorYearMonth'],
          message: 'ANCHOR_FORBIDDEN',
        });
      }

      for (const [index, rule] of value.projectionRules.entries()) {
        if (rule.baselinePolicy !== 'specificYear') continue;
        const baselineYear = rule.baselineYear;
        if (typeof baselineYear !== 'number') continue;
        if (baselineYear > value.startYear - 1) {
          addIssue(
            ctx,
            RetirementSchemaErrorCode.BASELINE_YEAR_AFTER_START,
            [index, 'baselineYear'],
            { baselineYear, startYear: value.startYear },
          );
        }
      }
    });
}

/** Clock-free shape; repositories parse reads with this. */
export const ProjectionConfigSchema = projectionConfigSchema(RetirementAssumptionsSchema);

/** Adds the current-year bound and cross-field timing checks. */
export function createProjectionConfigSchema(currentYear: number) {
  return projectionConfigSchema(createAssumptionsSchema(currentYear));
}

export type ProjectionConfigInput = z.infer<ReturnType<typeof createProjectionConfigSchema>>;
