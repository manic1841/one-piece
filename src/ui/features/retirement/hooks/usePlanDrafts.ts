import { useCallback, useState } from 'react';

import { type RetirementAssumptions } from '@/domains/retirement/assumptions';
import { getRetirementAssumptionBounds } from '@/domains/retirement/bounds';
import { type LifeEvent } from '@/domains/retirement/lifeEvents';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import { useAssumptionDraft } from '@/ui/features/retirement/hooks/useAssumptionDraft';
import { useLifeEventDrafts } from '@/ui/features/retirement/hooks/useLifeEventDrafts';
import { useRuleDrafts } from '@/ui/features/retirement/hooks/useRuleDrafts';
import { useWorkspaceUndo } from '@/ui/features/retirement/hooks/useWorkspaceUndo';
import { type PlanFormPreviewVM } from '@/ui/features/retirement/viewmodels/planForm.vm';
import {
  currentAgeFor,
  retirementAgeRange,
  retirementYearFor,
} from '@/ui/features/retirement/viewmodels/railIndicators.vm';
import { type ReadinessBlocker } from '@/ui/features/retirement/viewmodels/workspaceReadiness.vm';
import { buildSectionState } from '@/ui/features/retirement/viewmodels/workspaceSectionState.vm';

/** What a whole-draft replacement carries. The opening and start year are not here. */
export interface PlanDraftPayload {
  assumptions: RetirementAssumptions;
  projectionRules: ProjectionRule[];
  lifeEvents: LifeEvent[];
}

interface UsePlanDraftsArgs {
  /** Called on every user edit, never on a replacement. The workspace marks its rail stale here. */
  onDirty?: () => void;
}

/**
 * The three draft groups as one draft. The gate over them is one pass so a single
 * CALCULATE reports everything at once; `revealed` is one switch so revealing a
 * failure does not have to rewrite rows in three groups.
 *
 * `replaceAll` is not an edit: seeding a stored plan leaves `dirty` alone and
 * hides whatever the last gate revealed.
 */
export function usePlanDrafts({ onDirty }: UsePlanDraftsArgs = {}) {
  const currentYear = new Date().getFullYear();
  const [dirty, setDirty] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const undo = useWorkspaceUndo();

  const onEdit = useCallback(() => {
    setDirty(true);
    onDirty?.();
  }, [onDirty, setDirty]);
  const assumptions = useAssumptionDraft({ revealed, onEdit, currentYear });
  const rules = useRuleDrafts({ revealed, onEdit });
  const events = useLifeEventDrafts({ revealed, onEdit });

  const { values } = assumptions;

  /** A timeline gesture pushes its restore callback once, before it writes. */
  const rememberEvents = () => {
    const snapshot = events.snapshot();
    undo.push(() => events.replaceDrafts(snapshot));
  };

  /**
   * The bands' state. Blockers come from the caller because readiness is derived
   * from the values this hook owns, so it cannot be an argument to construction;
   * the opening error rides along for the same reason.
   */
  const sectionState = useCallback(
    (blockers: ReadinessBlocker[], openingValidationError?: string) =>
      buildSectionState({
        blockers,
        openingValidationError,
        // A band only claims an error once one of its fields is visibly printing
        // one; revealing is what puts every failure on screen.
        assumptionsInvalid: Object.keys(assumptions.errors).length > 0,
        rulesInvalid: Object.keys(rules.errors).length > 0,
        eventsInvalid: Object.keys(events.errors).length > 0,
      }),
    [assumptions, events, rules],
  );

  const preview: PlanFormPreviewVM = {
    birthYear: Number(values.birthYear),
    lifeExpectancy: Number(values.lifeExpectancy),
    retirementYear: retirementYearFor(values.birthYear, values.retirementAge),
    ageRange: retirementAgeRange(
      currentAgeFor(values.birthYear, currentYear),
      Number(values.lifeExpectancy) || 90,
    ),
    assumptionBounds: getRetirementAssumptionBounds(currentYear),
    projectionStartYear: currentYear,
  };

  /**
   * One pass over every group without revealing anything. The rail reads the
   * per-group outcomes and decides which failures it can absorb.
   */
  const validate = useCallback(
    () => ({
      assumptions: assumptions.validate(),
      rules: rules.validate(),
      events: events.validate(),
    }),
    [assumptions, events, rules],
  );

  const revealAll = useCallback(() => setRevealed(true), [setRevealed]);

  /** A write that does not go through a group (the opening, the start year). */
  const markDirty = useCallback(() => setDirty(true), [setDirty]);

  /** The all-or-nothing gate: every group must parse, and a failure is revealed. */
  const takeValidated = useCallback((): PlanDraftPayload | null => {
    const result = validate();
    const { data: parsedAssumptions } = result.assumptions;
    const { data: parsedRules } = result.rules;
    const { data: parsedEvents } = result.events;

    if (
      !result.assumptions.ok ||
      !result.rules.ok ||
      !result.events.ok ||
      parsedAssumptions === undefined ||
      parsedRules === undefined ||
      parsedEvents === undefined
    ) {
      setRevealed(true);
      return null;
    }

    return {
      assumptions: parsedAssumptions,
      projectionRules: parsedRules,
      lifeEvents: parsedEvents,
    };
  }, [setRevealed, validate]);

  const replaceAll = useCallback(
    (draft: PlanDraftPayload) => {
      assumptions.resetFrom(draft.assumptions);
      rules.replaceAll(draft.projectionRules);
      events.replaceAll(draft.lifeEvents);
      setRevealed(false);
    },
    [assumptions, events, rules, setRevealed],
  );

  /** The draft has been written; the gesture history no longer applies. */
  const markSaved = useCallback(() => {
    undo.clear();
    setDirty(false);
  }, [undo, setDirty]);

  /** Back to the unsaved defaults, as if the form had just been opened. */
  const reset = useCallback(() => {
    assumptions.resetToBlank();
    rules.replaceAll([]);
    events.replaceAll([]);
    setRevealed(false);
    setDirty(false);
  }, [assumptions, events, rules, setDirty, setRevealed]);

  return {
    assumptions,
    rules,
    events,
    dirty,
    preview,
    sectionState,
    undo: { canUndo: undo.canUndo, run: undo.undo, clear: undo.clear },
    markDirty,
    markSaved,
    rememberEvents,
    validate,
    revealAll,
    takeValidated,
    replaceAll,
    reset,
  };
}
