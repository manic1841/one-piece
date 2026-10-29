import { type RetirementAssumptionBounds } from '@/domains/retirement/bounds';
import { type useAssumptionDraft } from '@/ui/features/retirement/hooks/useAssumptionDraft';
import { type useLifeEventDrafts } from '@/ui/features/retirement/hooks/useLifeEventDrafts';
import { type useRuleDrafts } from '@/ui/features/retirement/hooks/useRuleDrafts';

/** Range a numeric field may take, in the field's own unit. */
export interface ValueRange {
  min: number;
  max: number;
}

/**
 * The three draft groups, as the form's contract. Declared here (type-only) so a
 * draft hook changing shape surfaces in one file instead of in every surface
 * that renders the form.
 */
export type PlanAssumptionsDraft = ReturnType<typeof useAssumptionDraft>;
export type PlanRulesDraft = ReturnType<typeof useRuleDrafts>;
export type PlanEventsDraft = ReturnType<typeof useLifeEventDrafts>;

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
