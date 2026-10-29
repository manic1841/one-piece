import { type RetirementAssumptionBounds } from '@/domains/retirement/bounds';
import { type usePlanDrafts } from '@/ui/features/retirement/hooks/usePlanDrafts';

/** Range a numeric field may take, in the field's own unit. */
export interface ValueRange {
  min: number;
  max: number;
}

/**
 * What every draft group takes: the form's reveal switch and its edit hook. The
 * group never owns either — one gate and one dirty flag sit above all three.
 */
export interface PlanDraftGroupArgs {
  /** Read-only; revealing is the module's decision, not the group's. */
  revealed: boolean;
  /** Every user edit, never a replacement. */
  onEdit: () => void;
}

/**
 * The three draft groups, as the form's contract. Declared here (type-only) so a
 * draft hook changing shape surfaces in one file instead of in every surface
 * that renders the form.
 */
export type PlanAssumptionsDraft = ReturnType<typeof usePlanDrafts>['assumptions'];
export type PlanRulesDraft = ReturnType<typeof usePlanDrafts>['rules'];
export type PlanEventsDraft = ReturnType<typeof usePlanDrafts>['events'];

/**
 * Values the plan form previews while the user types. Derived, never stored:
 * the drafts stay the single source of what will be submitted.
 */
export interface PlanFormPreviewVM {
  birthYear: number;
  lifeExpectancy: number;
  retirementYear: number | null;
  ageRange: ValueRange;
  assumptionBounds: RetirementAssumptionBounds;
  projectionStartYear: number;
}
