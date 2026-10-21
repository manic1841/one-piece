import { NumberInput } from '@/ui/components/NumberInput';
import { PageSection } from '@/ui/components/PageSection';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { Label } from '@/ui/components/ui/label';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement-redesign/workspaceLabels';
import { type ProjectionWorkspaceStage } from '@/ui/features/retirement-redesign/hooks/useProjectionWorkspace';
import { type OpeningNetWorthVM } from '@/ui/features/retirement-redesign/viewmodels/workspaceDraft.vm';

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
  setAmount: (value: string) => void;
  useManualValue: () => void;
  useReportValue: () => void;
  retry: () => void;
}

/**
 * Opening net worth with its two paths: `derived` (read-only, anchored to the
 * latest CLOSED period) and `manual` (integer, no anchor). A workspace with no
 * closed period starts empty and offers ENTER MANUALLY. The start year is
 * frozen into the config at calculate.
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
  setAmount,
  useManualValue,
  useReportValue,
  retry,
}: OpeningNetWorthSectionProps) {
  const isPreview = stage === 'preview';
  const isManual = opening.source === 'manual';
  const showEmptyState = !loading && !error && !hasClosedPeriod && !isManual;
  const showManualButton = !isPreview && !isManual;
  const showReportButton = !isPreview && isManual && hasClosedPeriod;

  return (
    <PageSection title={PROJECTION_WORKSPACE_LABELS.OPENING_SECTION}>
      {loading && (
        <p className="text-sm text-muted-foreground">{PROJECTION_WORKSPACE_LABELS.LOADING}</p>
      )}

      {!!error && !loading && (
        <Alert variant="warning">
          <AlertDescription>{PROJECTION_WORKSPACE_LABELS.OPENING_LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={retry}>
            {PROJECTION_WORKSPACE_LABELS.RETRY}
          </Button>
        </Alert>
      )}

      {!loading && (
        <div className="grid max-w-sm gap-4">
          <div className="grid gap-2">
            <Label htmlFor={START_YEAR_INPUT_ID}>
              {PROJECTION_WORKSPACE_LABELS.START_YEAR_FIELD}
            </Label>
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
            <Label htmlFor={OPENING_INPUT_ID}>{PROJECTION_WORKSPACE_LABELS.OPENING_FIELD}</Label>
            <NumberInput
              id={OPENING_INPUT_ID}
              value={opening.amountText}
              onChange={setAmount}
              readOnly={isPreview || !isManual}
              error={validationError !== undefined}
              aria-invalid={validationError !== undefined}
              prefix={OPENING_PREFIX}
            />
            {validationError !== undefined && (
              <p className="text-destructive text-xs" data-testid="opening-validation-error">
                {validationError}
              </p>
            )}
            <p className="text-xs text-muted-foreground" data-testid="opening-net-worth-note">
              {isManual
                ? PROJECTION_WORKSPACE_LABELS.OPENING_MANUAL_NOTE
                : opening.anchorYearMonth
                  ? `${PROJECTION_WORKSPACE_LABELS.OPENING_DERIVED_NOTE} ${PROJECTION_WORKSPACE_LABELS.OPENING_ANCHOR_PREFIX} ${opening.anchorYearMonth}`
                  : ''}
            </p>
          </div>

          {showEmptyState && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {PROJECTION_WORKSPACE_LABELS.OPENING_EMPTY}
              </p>
              <Button variant="outline" size="sm" onClick={useManualValue}>
                {PROJECTION_WORKSPACE_LABELS.ENTER_MANUALLY}
              </Button>
            </div>
          )}

          {!showEmptyState && (showManualButton || showReportButton) && (
            <div className="flex flex-wrap gap-2">
              {showManualButton && (
                <Button variant="outline" size="sm" onClick={useManualValue}>
                  {PROJECTION_WORKSPACE_LABELS.USE_MANUAL_VALUE}
                </Button>
              )}
              {showReportButton && (
                <Button variant="text" size="sm" onClick={useReportValue}>
                  {PROJECTION_WORKSPACE_LABELS.USE_REPORT_VALUE}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </PageSection>
  );
}
