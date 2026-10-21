import { type AuthContext } from '@/application/types';
import { type RetirementAssumptions } from '@/domains/retirement/assumptions';
import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import {
  type ProjectionInput,
  type ProjectionResolveError,
  type ProjectionResult,
} from '@/domains/retirement/projectionTypes';
import {
  type ProjectionConfig,
  type ProjectionOpeningSourceKind,
  type ProjectionSource,
} from '@/domains/retirement/schemas';

export interface ProjectionOpening {
  source: ProjectionOpeningSourceKind;
  /** Required for manual openings. */
  amount?: number;
}

export interface CalculateProjectionRequest {
  householdId: string;
  auth: AuthContext;
  startYear: number;
  opening: ProjectionOpening;
  assumptions: RetirementAssumptions;
  rules: ProjectionRule[];
  lifeEvents: LifeEvent[];
}

/** Everything PERSIST needs; calculated once and never recomputed. */
export interface ProjectionCalculation {
  input: ProjectionInput;
  result: ProjectionResult;
  warnings: ProjectionResolveError[];
  config: ProjectionConfig;
  source: ProjectionSource;
}

export interface PlanDraft {
  name: string;
  assumptions: RetirementAssumptions;
  projectionRules: ProjectionRule[];
  lifeEvents: LifeEvent[];
}
