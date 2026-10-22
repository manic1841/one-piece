import { Button } from '@/ui/components/ui/button';
import { PROJECTION_VIEW_LABELS } from '@/ui/constants/retirement/projectionLabels';
import { AnnualYearPanel } from '@/ui/features/retirement/components/AnnualYearPanel';
import { ProjectionTrajectory } from '@/ui/features/retirement/components/ProjectionTrajectory';
import { YearlyDetails } from '@/ui/features/retirement/components/YearlyDetails';
import { type ProjectionViewVM } from '@/ui/features/retirement/viewmodels/projectionView.vm';

interface ProjectionTrendTabProps {
  view: ProjectionViewVM;
  selectedYear: number | null;
  onSelectYear: (year: number) => void;
}

interface KeyYear {
  key: string;
  label: string;
  year: number;
}

const keyYearButtons = (view: ProjectionViewVM): KeyYear[] => {
  const keys: KeyYear[] = [];
  const { summary } = view;

  keys.push({
    key: 'retirement',
    label: `${PROJECTION_VIEW_LABELS.KEY_RETIREMENT} · ${view.retirementYear}`,
    year: view.retirementYear,
  });
  if (summary.minNetWorthYear !== null) {
    keys.push({
      key: 'minimum',
      label: `${PROJECTION_VIEW_LABELS.KEY_MINIMUM} · ${summary.minNetWorthYear}`,
      year: summary.minNetWorthYear,
    });
  }
  keys.push({
    key: 'planEnd',
    label: `${PROJECTION_VIEW_LABELS.KEY_PLAN_END} · ${view.planEndYear}`,
    year: view.planEndYear,
  });
  if (summary.bankruptcyYear !== null) {
    keys.push({
      key: 'negative',
      label: `${PROJECTION_VIEW_LABELS.KEY_NEGATIVE} · ${summary.bankruptcyYear}`,
      year: summary.bankruptcyYear,
    });
  }
  return keys;
};

/**
 * Projection tab: selectable trajectory, key-year jumps, the selected year's
 * panel and the full collapsible year table.
 */
export function ProjectionTrendTab({ view, selectedYear, onSelectYear }: ProjectionTrendTabProps) {
  const { projection, birthYear } = view;
  const selectedRow =
    selectedYear === null
      ? undefined
      : projection.yearlyDetails.find((row) => row.year === selectedYear);

  return (
    <div className="space-y-6" data-testid="projection-projection-tab">
      <ProjectionTrajectory
        projection={projection}
        selectedYear={selectedYear}
        onSelectYear={onSelectYear}
      />

      <div className="flex flex-wrap gap-2">
        {keyYearButtons(view).map((entry) => (
          <Button
            key={entry.key}
            variant="outline"
            size="sm"
            aria-pressed={selectedYear === entry.year}
            onClick={() => onSelectYear(entry.year)}
          >
            {entry.label}
          </Button>
        ))}
      </div>

      {selectedRow === undefined ? (
        <p className="text-sm text-muted-foreground">
          {PROJECTION_VIEW_LABELS.PROJECTION_SELECT_HINT}
        </p>
      ) : (
        <AnnualYearPanel row={selectedRow} birthYear={birthYear} />
      )}

      <YearlyDetails
        projection={projection}
        selectedYear={selectedYear}
        onSelectYear={onSelectYear}
        title={PROJECTION_VIEW_LABELS.ALL_YEARS}
      />
    </div>
  );
}
