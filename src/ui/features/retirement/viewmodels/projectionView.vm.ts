import { type ProjectionViewData } from '@/application/retirement/use_cases/getProjectionViewUseCase';
import { ENGINE_VERSION } from '@/domains/retirement/calculators';
import { type ProjectionSummary } from '@/domains/retirement/projectionTypes';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/projectionDisplay.vm';
import {
  mapProjectionPoint,
  mapYearlyDetail,
} from '@/ui/features/retirement/viewmodels/projectionRows.vm';
import {
  type ProjectionSnapshotVM,
  mapProjectionSnapshotToVM,
} from '@/ui/features/retirement/viewmodels/projectionSnapshot.vm';
import { formatCurrency, formatDate } from '@/ui/utils';

export type { ProjectionViewData } from '@/application/retirement/use_cases/getProjectionViewUseCase';
export type { ProjectionSummary } from '@/domains/retirement/projectionTypes';
export type {
  DefinitionItem,
  ProjectionSnapshotVM,
  SnapshotEventVM,
  SnapshotEventPhaseVM,
  SnapshotOpeningVM,
  SnapshotRuleGroupVM,
  SnapshotRuleRowVM,
  SnapshotSourceRowVM,
} from '@/ui/features/retirement/viewmodels/projectionSnapshot.vm';
export interface ProjectionSummaryVM {
  retirementNetWorthText: string | null;
  finalNetWorthText: string;
  minNetWorthText: string;
  minNetWorthYearText: string;
  bankruptcyYearText: string;
  isBankruptText: string;
  isBankrupt: boolean;
  /** Numeric counterparts of the text fields, for jump targets. */
  bankruptcyYear: number | null;
  minNetWorthYear: number | null;
}

export interface ProjectionViewVM {
  id: string;
  name: string;
  createdAtText: string;
  periodText: string;
  isStale: boolean;
  birthYear: number | null;
  retirementYear: number;
  planEndYear: number;
  summary: ProjectionSummaryVM;
  projection: RetirementProjectionVM;
  snapshot: ProjectionSnapshotVM;
}

const year = (value: number | null): string =>
  value === null ? PROJECTION_COMMON_LABELS.DASH : String(value);

/** Summary numbers are formatted here, so rendering never touches a formatter. */
export const mapProjectionSummaryToVM = (summary: ProjectionSummary): ProjectionSummaryVM => ({
  retirementNetWorthText:
    summary.retirementNetWorth === null ? null : formatCurrency(summary.retirementNetWorth),
  finalNetWorthText: formatCurrency(summary.finalNetWorth),
  minNetWorthText: formatCurrency(summary.minNetWorth),
  minNetWorthYearText: year(summary.minNetWorthYear),
  bankruptcyYearText: year(summary.bankruptcyYear),
  isBankruptText: summary.isBankrupt ? PROJECTION_COMMON_LABELS.YES : PROJECTION_COMMON_LABELS.NO,
  isBankrupt: summary.isBankrupt,
  bankruptcyYear: summary.bankruptcyYear,
  minNetWorthYear: summary.minNetWorthYear,
});

const emptyProjection = (retirementYear: number): RetirementProjectionVM => ({
  retirementYear,
  negativeYear: null,
  chartData: [],
  yearlyDetails: [],
});

/** Maps the frozen documents into display-only shapes; no relation to a plan. */
export const mapProjectionViewToVM = (data: ProjectionViewData): ProjectionViewVM => {
  const { projection, config, source, annual } = data;
  const birthYear = config?.assumptions.birthYear ?? null;
  const retirementAge = config?.assumptions.retirementAge ?? null;
  const retirementYear =
    birthYear === null || retirementAge === null ? 0 : birthYear + retirementAge;
  const planEndYear =
    config === null ? 0 : config.assumptions.birthYear + config.assumptions.lifeExpectancy;
  const years = annual?.years ?? [];

  const projectionVm: RetirementProjectionVM =
    config === null
      ? emptyProjection(retirementYear)
      : {
          retirementYear,
          negativeYear: projection.bankruptcyYear,
          chartData: years.map((entry) =>
            mapProjectionPoint(entry, entry.inflows, entry.outflows, projection.bankruptcyYear),
          ),
          yearlyDetails: years.map(mapYearlyDetail),
        };

  return {
    id: projection.id,
    name: projection.name,
    createdAtText: formatDate(projection.createdAt),
    periodText:
      config === null ? PROJECTION_COMMON_LABELS.DASH : `${config.startYear}–${planEndYear}`,
    isStale: projection.engineVersion < ENGINE_VERSION,
    birthYear,
    retirementYear,
    planEndYear,
    summary: mapProjectionSummaryToVM(projection),
    projection: projectionVm,
    snapshot: mapProjectionSnapshotToVM(projection, config, source, planEndYear),
  };
};
