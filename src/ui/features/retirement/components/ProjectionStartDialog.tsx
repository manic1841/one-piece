import { ChevronRight } from 'lucide-react';

import { Skeleton } from '@/ui/components/Skeleton';
import { eyebrowClass } from '@/ui/components/eyebrow';
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
import { START_PROJECTION_LABELS } from '@/ui/constants/retirement/startProjectionLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useIsDesktop } from '@/ui/features/app/layout/useIsDesktop';
import { usePlanLibrary } from '@/ui/features/retirement/hooks/usePlanLibrary';
import { type PlanSummary } from '@/ui/features/retirement/hooks/usePlanLibrary';
import { formatDate, formatPercentage } from '@/ui/utils';

const ASSUMPTION_KEYS = [
  'retirementAge',
  'lifeExpectancy',
  'inflationRate',
  'annualReturnRate',
] as const;

/** Concise assumption line: enough to recognise a scenario, not a second list. */
const assumptionLine = (plan: PlanSummary): string => {
  const [retirementAge, lifeExpectancy, inflationRate, annualReturnRate] = ASSUMPTION_KEYS.map(
    (key) => plan[key],
  );

  return [
    `${START_PROJECTION_LABELS.RETIREMENT_AGE_PREFIX} ${retirementAge}`,
    `${START_PROJECTION_LABELS.LIFE_EXPECTANCY_PREFIX} ${lifeExpectancy}`,
    `${START_PROJECTION_LABELS.INFLATION_PREFIX} ${formatPercentage(inflationRate * 100)}`,
    `${START_PROJECTION_LABELS.RETURN_PREFIX} ${formatPercentage(annualReturnRate * 100)}`,
  ].join(` ${START_PROJECTION_LABELS.SEPARATOR} `);
};

interface ProjectionStartDialogProps {
  onSelectBlank: () => void;
  onSelectPlan: (planId: string) => void;
  onCancel: () => void;
}

/**
 * Projection start picker, opened from the projection list and from the
 * workspace's CHANGE PLAN. It is presentation state only — the host owns what
 * happens after a pick (navigation, and the leave confirm when dirty). The plan
 * library is read while the dialog is mounted, so START BLANK never waits for
 * it. Desktop centres a dialog, mobile docks a sheet, matching the rule editor.
 */
export function ProjectionStartDialog({
  onSelectBlank,
  onSelectPlan,
  onCancel,
}: ProjectionStartDialogProps) {
  const isDesktop = useIsDesktop();
  const { userProfile } = useAuthState();
  const library = usePlanLibrary(userProfile?.householdId);
  const showPlans = !library.loading && library.error === null;
  const showEmpty = showPlans && library.plans.length === 0;

  const body = (
    <div className="grid gap-6">
      {!showEmpty && (
        <section className="grid gap-2">
          <h2 className={eyebrowClass}>{START_PROJECTION_LABELS.PLAN_SECTION}</h2>

          {library.loading && (
            <div role="status" className="grid gap-2" data-testid="plan-options-loading">
              <span className="sr-only">{START_PROJECTION_LABELS.LOADING}</span>
              {[0, 1, 2].map((row) => (
                <Skeleton key={row} className="h-14" />
              ))}
            </div>
          )}

          {!library.loading && library.error !== null && (
            <Alert variant="warning">
              <AlertDescription>{START_PROJECTION_LABELS.LOAD_ERROR}</AlertDescription>
              <Button
                variant="text"
                className="ml-auto shrink-0"
                onClick={() => void library.refresh()}
              >
                {START_PROJECTION_LABELS.RETRY}
              </Button>
            </Alert>
          )}

          {showPlans && (
            <ul className="-mx-2" data-testid="plan-options">
              {library.plans.map((plan) => (
                <li key={plan.id} className="border-b border-border last:border-b-0">
                  <StartOption
                    testId={`plan-option-${plan.id}`}
                    title={plan.name}
                    detail={assumptionLine(plan)}
                    meta={`${START_PROJECTION_LABELS.UPDATED_PREFIX} ${formatDate(plan.updatedAt)}`}
                    onSelect={() => onSelectPlan(plan.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {showEmpty ? (
        <section className="grid justify-items-start gap-4">
          <p className="text-sm text-muted-foreground">{START_PROJECTION_LABELS.EMPTY}</p>
          <Button onClick={onSelectBlank}>{START_PROJECTION_LABELS.START_BLANK}</Button>
        </section>
      ) : (
        <div className="-mx-2 border-t border-border pt-2">
          <StartOption
            testId="start-blank"
            title={START_PROJECTION_LABELS.START_BLANK}
            detail={START_PROJECTION_LABELS.START_BLANK_HINT}
            onSelect={onSelectBlank}
          />
        </div>
      )}
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open onOpenChange={(next) => !next && onCancel()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{START_PROJECTION_LABELS.TITLE}</DialogTitle>
            <DialogDescription>{START_PROJECTION_LABELS.DESCRIPTION}</DialogDescription>
          </DialogHeader>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open onOpenChange={(next) => !next && onCancel()}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{START_PROJECTION_LABELS.TITLE}</SheetTitle>
          <SheetDescription>{START_PROJECTION_LABELS.DESCRIPTION}</SheetDescription>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  );
}

interface StartOptionProps {
  testId: string;
  title: string;
  detail: string;
  meta?: string;
  onSelect: () => void;
}

/** One starting point: the whole row is the action; the chevron says it moves on. */
function StartOption({ testId, title, detail, meta, onSelect }: StartOptionProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onSelect}
      className="flex w-full items-center gap-4 px-2 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-1 md:flex-row md:items-baseline md:justify-between md:gap-6">
        <span className="grid min-w-0 gap-1">
          <span className="truncate text-sm font-medium text-foreground">{title}</span>
          <span className="text-xs text-muted-foreground">{detail}</span>
        </span>
        {meta && (
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{meta}</span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}
