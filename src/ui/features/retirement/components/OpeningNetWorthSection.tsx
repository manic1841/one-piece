import { useState } from 'react';

import { Pencil } from 'lucide-react';

import { NumberInput } from '@/ui/components/NumberInput';
import { PageSection } from '@/ui/components/PageSection';
import { SelectField } from '@/ui/components/form';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { Label } from '@/ui/components/ui/label';
import { RETIREMENT_YEAR_BOUNDS } from '@/ui/constants/retirement/bounds';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import { WORKSPACE_SECTION_LABELS } from '@/ui/constants/retirement/workspaceRailLabels';
import { type ProjectionWorkspaceStage } from '@/ui/features/retirement/types/workspaceTypes';
import { numberOptions } from '@/ui/features/retirement/viewmodels/numberOptions.vm';
import { type OpeningNetWorthVM } from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';
import { formatCurrency } from '@/ui/utils';

const OPENING_INPUT_ID = 'projection-opening-net-worth';
const START_YEAR_INPUT_ID = 'projection-start-year';
const OPENING_PREFIX = 'NT$';

interface OpeningNetWorthSectionProps {
  opening: OpeningNetWorthVM;
  stage: ProjectionWorkspaceStage;
  loading: boolean;
  error: unknown;
  validationError?: string;
  startYear: number;
  startYearError?: string;
  setStartYear: (value: string) => void;
  hasClosedPeriod: boolean;
  /** Whether a snapshot exists, i.e. whether USE SNAPSHOT has something to restore. */
  hasSnapshot: boolean;
  setAmount: (value: string) => void;
  /** Rewrites a typed decimal to whole NT dollars when the field loses focus. */
  commitAmount: () => void;
  resetToSnapshot: () => void;
  retry: () => void;
  /** Band state and the reason it is blocked; the field's own error stays inline. */
  status?: 'error';
  hint?: string;
}

/**
 * Opening net worth. The latest closed period seeds the field once as a default
 * value, so there is no mode to switch into: the input is always editable and
 * typing drops the anchor. USE SNAPSHOT puts the seeded value back.
 *
 * The amount is the decision this section exists for, so it is typeset as the
 * hero — bare digits at heading size, provenance hung directly beneath it. The
 * start year is only a parameter of that number and drops to a quiet row under
 * a rule. Both freeze into the config at calculate.
 */
export function OpeningNetWorthSection({
  opening,
  stage,
  loading,
  error,
  validationError,
  startYear,
  startYearError,
  setStartYear,
  hasClosedPeriod,
  hasSnapshot,
  setAmount,
  commitAmount,
  resetToSnapshot,
  retry,
  status,
  hint,
}: OpeningNetWorthSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const isPreview = stage === 'preview';
  const canReset = hasSnapshot && opening.source === 'manual' && !isPreview;
  const amount = Number(opening.amountText);
  const amountSummary =
    opening.amountText.trim() !== '' && Number.isFinite(amount)
      ? formatCurrency(amount)
      : PROJECTION_COMMON_LABELS.DASH;

  const note = loading
    ? PROJECTION_WORKSPACE_LABELS.LOADING
    : !hasClosedPeriod
      ? PROJECTION_WORKSPACE_LABELS.OPENING_EMPTY
      : opening.source === 'derived' && opening.anchorYearMonth !== null
        ? `${PROJECTION_WORKSPACE_LABELS.OPENING_DERIVED_NOTE} ${PROJECTION_WORKSPACE_LABELS.OPENING_ANCHOR_PREFIX} ${opening.anchorYearMonth}`
        : '';

  return (
    <PageSection
      number={WORKSPACE_SECTION_LABELS.NUMBER_BASELINE}
      title={WORKSPACE_SECTION_LABELS.BASELINE}
      status={status}
      hint={hint}
      testId="section-baseline"
      spacing="compact"
    >
      {!!error && !loading && (
        <Alert variant="warning">
          <AlertDescription>{PROJECTION_WORKSPACE_LABELS.OPENING_LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={retry}>
            {PROJECTION_WORKSPACE_LABELS.RETRY}
          </Button>
        </Alert>
      )}

      {!expanded && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-xs text-muted-foreground">
            {PROJECTION_WORKSPACE_LABELS.OPENING_FIELD}
          </span>
          <span className="font-mono text-lg tabular-nums text-foreground">{amountSummary}</span>
          {note !== '' && <span className="text-xs text-muted-foreground">{note}</span>}
          <span className="text-xs text-muted-foreground">
            {PROJECTION_WORKSPACE_LABELS.BASELINE_SUMMARY_START}
          </span>
          <span className="font-mono text-lg tabular-nums text-foreground">{startYear}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            aria-label={PROJECTION_WORKSPACE_LABELS.EDIT_BASELINE}
            aria-expanded={false}
            onClick={() => setExpanded(true)}
          >
            <Pencil size={14} aria-hidden="true" />
          </Button>
        </div>
      )}
      {!expanded && validationError !== undefined && (
        <p className="text-xs text-destructive">{validationError}</p>
      )}
      {!expanded && startYearError !== undefined && (
        <p className="text-xs text-destructive">{startYearError}</p>
      )}

      {expanded && (
        <div className="grid max-w-xl gap-2">
          <div className="flex items-center justify-between gap-3">
            <Label
              htmlFor={OPENING_INPUT_ID}
              className="text-muted-foreground text-xs tracking-[0.08em] uppercase"
            >
              {PROJECTION_WORKSPACE_LABELS.OPENING_FIELD}
            </Label>
            <span className="flex shrink-0 items-center gap-4">
              {canReset && (
                <Button
                  variant="text"
                  size="sm"
                  className="h-auto px-0 py-0 text-xs"
                  onClick={resetToSnapshot}
                >
                  {PROJECTION_WORKSPACE_LABELS.USE_SNAPSHOT}
                </Button>
              )}
              <Button
                type="button"
                variant="text"
                size="sm"
                className="h-auto px-0 py-0 text-xs"
                aria-expanded
                onClick={() => setExpanded(false)}
              >
                {PROJECTION_WORKSPACE_LABELS.CLOSE_BASELINE}
              </Button>
            </span>
          </div>

          {/* The amount is the decision this section is about, so it carries the
            hierarchy: no chrome of its own, the digits are the form. */}
          <div className="flex items-baseline gap-2">
            <span className="text-muted-foreground text-lg md:text-xl" aria-hidden="true">
              {OPENING_PREFIX}
            </span>
            <NumberInput
              id={OPENING_INPUT_ID}
              value={opening.amountText}
              onChange={setAmount}
              onBlur={commitAmount}
              readOnly={isPreview}
              error={validationError !== undefined}
              aria-invalid={validationError !== undefined}
              className="h-auto min-w-0 flex-1 border-0 bg-transparent px-0 text-left text-2xl font-semibold md:text-3xl"
              data-testid="opening-net-worth-value"
            />
          </div>

          {validationError !== undefined && (
            <p className="text-destructive text-xs" data-testid="opening-validation-error">
              {validationError}
            </p>
          )}
          {note !== '' && (
            <p className="text-[13px] text-muted-foreground" data-testid="opening-net-worth-note">
              {note}
            </p>
          )}

          {/* The year is a parameter of the amount, so it sits below the rule. */}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-3">
            <Label
              htmlFor={START_YEAR_INPUT_ID}
              className="text-muted-foreground text-[11px] tracking-[0.08em] uppercase"
            >
              {PROJECTION_WORKSPACE_LABELS.START_YEAR_FIELD}
            </Label>
            <SelectField
              id={START_YEAR_INPUT_ID}
              value={String(startYear)}
              onChange={setStartYear}
              options={numberOptions(RETIREMENT_YEAR_BOUNDS.min, RETIREMENT_YEAR_BOUNDS.max)}
              disabled={isPreview}
              error={startYearError !== undefined}
              className="h-8 w-24"
            />
            {startYearError !== undefined && (
              <p className="text-destructive text-xs" data-testid="start-year-validation-error">
                {startYearError}
              </p>
            )}
          </div>
        </div>
      )}
    </PageSection>
  );
}
