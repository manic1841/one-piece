import { EmptyState } from '@/ui/components/EmptyState';
import { Skeleton } from '@/ui/components/Skeleton';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/ui/components/ui/sheet';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';
import { useOpeningPeriods } from '@/ui/features/retirement/hooks/useOpeningPeriods';
import { type OpeningPeriodVM } from '@/ui/features/retirement/viewmodels/openingPeriods.vm';

interface OpeningPeriodDialogProps {
  householdId: string | undefined;
  /** The anchor currently in the field; pinned when it falls outside the list. */
  currentAnchor: string | null;
  /** A pick applies the month's amount and anchor at once. */
  onSelect: (period: OpeningPeriodVM) => void;
  onClose: () => void;
}

/**
 * Closed-period picker for the opening balance. Only the value matters, so a
 * row is the month plus its net worth and clicking it applies both at once.
 * The current anchor stays reachable even when it is older than the window.
 * Desktop centres a dialog, mobile docks a sheet, matching the plan picker.
 */
export function OpeningPeriodDialog({
  householdId,
  currentAnchor,
  onSelect,
  onClose,
}: OpeningPeriodDialogProps) {
  const isDesktop = useIsDesktop();
  const { periods, pinned, loading, error, retry } = useOpeningPeriods(householdId, currentAnchor);

  const hasRows = periods.length > 0 || pinned !== null;

  const body = (
    <div className="grid gap-2">
      {loading && (
        <div role="status" className="grid gap-2" data-testid="opening-periods-loading">
          <span className="sr-only">{PROJECTION_WORKSPACE_LABELS.LOADING}</span>
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-12" />
          ))}
        </div>
      )}

      {!loading && error !== null && (
        <Alert variant="warning">
          <AlertDescription>{PROJECTION_WORKSPACE_LABELS.USE_CLOSED_LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={retry}>
            {PROJECTION_WORKSPACE_LABELS.RETRY}
          </Button>
        </Alert>
      )}

      {!loading && error === null && !hasRows && (
        <EmptyState
          title={PROJECTION_WORKSPACE_LABELS.USE_CLOSED_EMPTY_TITLE}
          description={PROJECTION_WORKSPACE_LABELS.USE_CLOSED_EMPTY}
          action={
            <Button variant="text" onClick={onClose}>
              {PROJECTION_WORKSPACE_LABELS.USE_CLOSED_EMPTY_ACTION}
            </Button>
          }
        />
      )}

      {!loading && error === null && hasRows && (
        <ul className="-mx-2" data-testid="opening-period-options">
          {pinned !== null && (
            <li className="border-b border-border">
              <PeriodOption period={pinned} current onSelect={() => onSelect(pinned)} />
            </li>
          )}
          {periods.map((period) => (
            <li key={period.anchorYearMonth} className="border-b border-border last:border-b-0">
              <PeriodOption period={period} onSelect={() => onSelect(period)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{PROJECTION_WORKSPACE_LABELS.USE_CLOSED_TITLE}</DialogTitle>
            <DialogDescription>
              {PROJECTION_WORKSPACE_LABELS.USE_CLOSED_DESCRIPTION}
            </DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open onOpenChange={(next) => !next && onClose()}>
      <SheetContent side="bottom" className="max-h-[92vh]">
        <SheetHeader>
          <SheetTitle>{PROJECTION_WORKSPACE_LABELS.USE_CLOSED_TITLE}</SheetTitle>
          <SheetDescription>{PROJECTION_WORKSPACE_LABELS.USE_CLOSED_DESCRIPTION}</SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  );
}

interface PeriodOptionProps {
  period: OpeningPeriodVM;
  /** The anchor already in the field. */
  current?: boolean;
  onSelect: () => void;
}

/** One month: the whole row is the action. */
function PeriodOption({ period, current = false, onSelect }: PeriodOptionProps) {
  return (
    <button
      type="button"
      data-testid={`opening-period-${period.anchorYearMonth}`}
      aria-current={current ? 'true' : undefined}
      onClick={onSelect}
      className="flex min-h-11 w-full items-baseline justify-between gap-6 px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="font-mono text-sm font-medium tabular-nums text-foreground">
        {period.anchorYearMonth}
      </span>
      <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
        {period.amountDisplay}
      </span>
    </button>
  );
}
