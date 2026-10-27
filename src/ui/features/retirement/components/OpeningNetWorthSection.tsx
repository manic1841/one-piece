import { NumberInput } from '@/ui/components/NumberInput';
import { PageSection } from '@/ui/components/PageSection';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { Label } from '@/ui/components/ui/label';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import { WORKSPACE_SECTION_LABELS } from '@/ui/constants/retirement/workspaceRailLabels';
import { type ProjectionWorkspaceStage } from '@/ui/features/retirement/hooks/useProjectionWorkspace';
import { type OpeningNetWorthVM } from '@/ui/features/retirement/viewmodels/workspaceDraft.vm';

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
}

/**
 * Opening net worth. The latest closed period seeds the field once as a default
 * value, so there is no mode to switch into: the input is always editable and
 * typing drops the anchor. USE SNAPSHOT puts the seeded value back. The start
 * year shares the row — both are the same one-off baseline decision and are
 * frozen into the config at calculate. The year only needs four digits, so it
 * takes a narrow column and the amount takes the rest: the width follows the
 * content instead of splitting the row evenly.
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
}: OpeningNetWorthSectionProps) {
  const isPreview = stage === 'preview';
  const canReset = hasSnapshot && opening.source === 'manual' && !isPreview;

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
    >
      {!!error && !loading && (
        <Alert variant="warning">
          <AlertDescription>{PROJECTION_WORKSPACE_LABELS.OPENING_LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={retry}>
            {PROJECTION_WORKSPACE_LABELS.RETRY}
          </Button>
        </Alert>
      )}

      <div className="grid max-w-md gap-4 sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:items-start">
        <div className="grid gap-2">
          <div className="flex items-center sm:h-5">
            <Label htmlFor={START_YEAR_INPUT_ID}>
              {PROJECTION_WORKSPACE_LABELS.START_YEAR_FIELD}
            </Label>
          </div>
          <NumberInput
            id={START_YEAR_INPUT_ID}
            value={String(startYear)}
            onChange={setStartYear}
            readOnly={isPreview}
            step={1}
            error={startYearError !== undefined}
            aria-invalid={startYearError !== undefined}
          />
          {startYearError !== undefined && (
            <p className="text-destructive text-xs" data-testid="start-year-validation-error">
              {startYearError}
            </p>
          )}
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3 sm:h-5">
            <Label htmlFor={OPENING_INPUT_ID}>{PROJECTION_WORKSPACE_LABELS.OPENING_FIELD}</Label>
            {canReset && (
              <Button
                variant="text"
                size="sm"
                className="h-auto shrink-0 px-0 py-0 text-xs"
                onClick={resetToSnapshot}
              >
                {PROJECTION_WORKSPACE_LABELS.USE_SNAPSHOT}
              </Button>
            )}
          </div>
          <NumberInput
            id={OPENING_INPUT_ID}
            value={opening.amountText}
            onChange={setAmount}
            onBlur={commitAmount}
            readOnly={isPreview}
            error={validationError !== undefined}
            aria-invalid={validationError !== undefined}
            prefix={OPENING_PREFIX}
            data-testid="opening-net-worth-value"
          />
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
        </div>
      </div>
    </PageSection>
  );
}
