import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { PageHeader } from '@/ui/components/PageHeader';
import { Skeleton } from '@/ui/components/Skeleton';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { START_PROJECTION_LABELS } from '@/ui/constants/retirement/startProjectionLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { usePlanLibrary } from '@/ui/features/retirement/hooks/usePlanLibrary';
import { type PlanSummary } from '@/ui/features/retirement/hooks/usePlanLibrary';
import { formatDate, formatPercentage } from '@/ui/utils';

import ProjectionWorkspacePage from './ProjectionWorkspacePage';

const ASSUMPTION_KEYS = [
  'retirementAge',
  'lifeExpectancy',
  'inflationRate',
  'annualReturnRate',
] as const;

/** Concise assumption line: enough to recognise a scenario, not a second list page. */
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

/**
 * Route gate for `/retirement/new`. With no query it is the projection start
 * surface: pick blank or a saved plan. Any of `plan`, `from`, `start` or the
 * post-apply marker `applied` means the choice is already made, so it renders
 * the workspace directly and the gate is never replayed. The applied-plan block
 * reopens the surface with `?pick`. START BLANK never depends on the plan read,
 * so a slow or failed plan load cannot block the blank path.
 */
export default function ProjectionStartPage() {
  const [searchParams] = useSearchParams();
  const inWorkspace =
    ['plan', 'from', 'start', 'applied'].some((key) => searchParams.has(key)) &&
    !searchParams.has('pick');

  return inWorkspace ? <ProjectionWorkspacePage /> : <StartSurface />;
}

function StartSurface() {
  const navigate = useNavigate();
  const { userProfile } = useAuthState();
  const library = usePlanLibrary(userProfile?.householdId);
  const showPlans = !library.loading && library.error === null;
  const showEmpty = showPlans && library.plans.length === 0;

  const leave = () => (window.history.length > 1 ? navigate(-1) : navigate('/retirement'));
  const startBlank = () => navigate('/retirement/new?start=blank');
  const startFromPlan = (planId: string) => navigate(`/retirement/new?plan=${planId}`);

  return (
    <div className="space-y-8">
      <PageHeader
        title={START_PROJECTION_LABELS.TITLE}
        description={START_PROJECTION_LABELS.DESCRIPTION}
      />

      <div className="mx-auto grid max-w-md gap-6">
        <Button onClick={startBlank}>{START_PROJECTION_LABELS.START_BLANK}</Button>

        {!showEmpty && (
          <section className="grid gap-2">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {START_PROJECTION_LABELS.PLAN_SECTION}
            </h2>

            {library.loading && (
              <div role="status" className="grid gap-2" data-testid="plan-options-loading">
                <span className="sr-only">{START_PROJECTION_LABELS.LOADING}</span>
                {[0, 1, 2].map((row) => (
                  <Skeleton key={row} className="h-11" />
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

            {showPlans && library.plans.length > 0 && (
              <ul className="max-h-[50vh] overflow-y-auto" data-testid="plan-options">
                {library.plans.map((plan) => (
                  <li key={plan.id} className="border-b border-border last:border-b-0">
                    <button
                      type="button"
                      data-testid={`plan-option-${plan.id}`}
                      onClick={() => startFromPlan(plan.id)}
                      className="grid w-full gap-1 px-2 py-2 text-left hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <span className="truncate text-sm font-medium text-foreground">
                        {plan.name}
                      </span>
                      <span className="text-xs text-muted-foreground">{assumptionLine(plan)}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {formatDate(plan.updatedAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {showEmpty && (
          <section className="grid gap-2">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {START_PROJECTION_LABELS.PLAN_SECTION}
            </h2>
            <p className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{START_PROJECTION_LABELS.EMPTY}</span>
              <Link
                to="/retirement/plans"
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                {START_PROJECTION_LABELS.BROWSE_PLANS}
              </Link>
            </p>
          </section>
        )}

        <Button variant="text" className="justify-self-center" onClick={leave}>
          {START_PROJECTION_LABELS.CANCEL}
        </Button>
      </div>
    </div>
  );
}
