import { NumberInput } from '@/ui/components/NumberInput';
import { PageSection } from '@/ui/components/PageSection';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { Label } from '@/ui/components/ui/label';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement-redesign/workspaceLabels';
import {
  type OpeningNetWorthVM,
  type ProjectionWorkspaceStage,
} from '@/ui/features/retirement-redesign/hooks/useProjectionWorkspace';

const OPENING_INPUT_ID = 'projection-opening-net-worth';

interface OpeningNetWorthSectionProps {
  opening: OpeningNetWorthVM;
  stage: ProjectionWorkspaceStage;
  loading: boolean;
  error: unknown;
  hasClosedPeriod: boolean;
  canUseReportValue: boolean;
  setAmount: (value: string) => void;
  enterManual: () => void;
  useManualValue: () => void;
  useReportValue: () => void;
  retry: () => void;
}

/**
 * Opening net worth with its two paths: `derived` (read-only, anchored to the
 * latest CLOSED period) and `manual` (integer, no anchor). A workspace with no
 * closed period starts empty and offers ENTER MANUALLY.
 */
export function OpeningNetWorthSection({
  opening,
  stage,
  loading,
  error,
  hasClosedPeriod,
  canUseReportValue,
  setAmount,
  enterManual,
  useManualValue,
  useReportValue,
  retry,
}: OpeningNetWorthSectionProps) {
  const isPreview = stage === 'preview';
  const isManual = opening.source === 'manual';
  const showEmptyState = !loading && !error && !hasClosedPeriod && !isManual;
  const showManualButton = !isPreview && !isManual;
  const showReportButton = !isPreview && isManual && canUseReportValue;

  return (
    <PageSection title={PROJECTION_WORKSPACE_LABELS.OPENING_SECTION}>
      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

      {!!error && !loading && (
        <Alert variant="warning">
          <AlertDescription>{PROJECTION_WORKSPACE_LABELS.OPENING_LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={retry}>
            {PROJECTION_WORKSPACE_LABELS.RETRY}
          </Button>
        </Alert>
      )}

      {!loading && (
        <div className="grid max-w-sm gap-2">
          <Label htmlFor={OPENING_INPUT_ID}>{PROJECTION_WORKSPACE_LABELS.OPENING_FIELD}</Label>
          <NumberInput
            id={OPENING_INPUT_ID}
            value={opening.amountText}
            onChange={setAmount}
            readOnly={isPreview || !isManual}
            prefix="NT$"
          />
          <p className="text-xs text-muted-foreground" data-testid="opening-net-worth-note">
            {isManual
              ? PROJECTION_WORKSPACE_LABELS.OPENING_MANUAL_NOTE
              : opening.anchorYearMonth
                ? `${PROJECTION_WORKSPACE_LABELS.OPENING_DERIVED_NOTE} ${PROJECTION_WORKSPACE_LABELS.OPENING_ANCHOR_PREFIX} ${opening.anchorYearMonth}`
                : ''}
          </p>

          {showEmptyState && (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-muted-foreground">
                {PROJECTION_WORKSPACE_LABELS.OPENING_EMPTY}
              </p>
              <Button variant="outline" size="sm" onClick={enterManual}>
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
