import { type useOpeningDraft } from '@/ui/features/retirement/hooks/useOpeningDraft';
import { type usePlanDrafts } from '@/ui/features/retirement/hooks/usePlanDrafts';
import { type useProjectionCalculate } from '@/ui/features/retirement/hooks/useProjectionCalculate';
import { type useWorkspaceDerived } from '@/ui/features/retirement/hooks/useWorkspaceDerived';
import { type RetirementComparisonVM } from '@/ui/features/retirement/viewmodels/retirementComparison.vm';
import { type OpeningNetWorthVM } from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';

export type ProjectionWorkspaceStage = 'setup' | 'preview';

/**
 * The shapes the workspace shell hands to its bodies. They live here rather than
 * being `ReturnType<typeof useProjectionWorkspace>` at the call site, so a
 * component depends on the slice it reads and not on the whole controller.
 */
export type WorkspaceAssumptions = ReturnType<typeof usePlanDrafts>['assumptions'];
export type WorkspaceRules = ReturnType<typeof usePlanDrafts>['rules'];
export type WorkspaceEvents = ReturnType<typeof usePlanDrafts>['events'];
export type WorkspaceDerived = ReturnType<typeof useWorkspaceDerived>;

/** The opening net worth draft plus the load state around it. */
export interface WorkspaceOpening
  extends Pick<
    ReturnType<typeof useOpeningDraft>,
    'setOpeningAmount' | 'commitOpeningAmount' | 'resetToSnapshot'
  > {
  value: OpeningNetWorthVM;
  loading: boolean;
  error: unknown;
  validationError?: string;
  startYearError?: string;
  /** Reloads the opening from the latest closed period, without awaiting. */
  reload: () => void;
  hasClosedPeriod: boolean;
  /** Whether a snapshot exists, i.e. whether USE SNAPSHOT has something to restore. */
  hasSnapshot: boolean;
}

export interface WorkspaceUndo {
  canUndo: boolean;
  run: () => void;
  push: (restore: () => void) => void;
}

/** Calculation output, from the run itself to what the preview and errors show. */
export interface WorkspaceCalc {
  calculated: ReturnType<typeof useProjectionCalculate>['calculated'];
  calculating: boolean;
  calculate: ReturnType<typeof useProjectionCalculate>['calculate'];
  calculateError: string | null;
  errorLabels: string[];
  warningLabels: string[];
  retirementComparisons: RetirementComparisonVM[];
  applyRetirementAge: (age: number) => void;
}

/** Saved-state flags the setup body shows as notices. */
export interface WorkspaceSaveStatus {
  savedId: string | null;
  savedAsPlan: boolean;
}
