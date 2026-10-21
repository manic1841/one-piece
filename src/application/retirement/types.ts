import { type AuthContext } from '@/application/types';
import { type RetirementAssumptions } from '@/domains/retirement/assumptions';
import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import {
  type ProjectionConfig,
  type ProjectionSource,
} from '@/domains/retirement/logic/projectionDocuments';
import {
  type ProjectionInput,
  type ProjectionResolveError,
  type ProjectionResult,
} from '@/domains/retirement/logic/projectionTypes';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';

export type ProjectionOpeningSource = 'derived' | 'manual';

export interface ProjectionOpening {
  source: ProjectionOpeningSource;
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
  startYear: number;
}

export interface PlanDraft {
  name: string;
  assumptions: RetirementAssumptions;
  projectionRules: ProjectionRule[];
  lifeEvents: LifeEvent[];
}
