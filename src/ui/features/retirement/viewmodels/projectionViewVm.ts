import { type ProjectionViewData } from '@/application/retirement/use_cases/getProjectionViewUseCase';
import { ENGINE_VERSION } from '@/domains/retirement/logic/projectionEngine';
import { type ProjectionSummary } from '@/domains/retirement/logic/projectionTypes';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';
import {
  PROJECTION_VIEW_LABELS,
  SAVE_AS_PLAN_LABELS,
} from '@/ui/constants/retirement/projectionLabels';
import { RULE_METHOD_LABELS } from '@/ui/constants/retirement/setupLabels';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/projectionDisplayVm';
import {
  endConditionText,
  mapProjectionPoint,
  mapYearlyDetail,
  parameterText,
  percentText,
} from '@/ui/features/retirement/viewmodels/projectionRows';
import { formatCurrency, formatDate } from '@/ui/utils';

export type { ProjectionViewData } from '@/application/retirement/use_cases/getProjectionViewUseCase';
export type { ProjectionSummary } from '@/domains/retirement/logic/projectionTypes';

export interface ProjectionSummaryVM {
  retirementNetWorthText: string;
  finalNetWorthText: string;
  minNetWorthText: string;
  minNetWorthYearText: string;
  bankruptcyYearText: string;
  isBankruptText: string;
  isBankrupt: boolean;
}

export interface DefinitionItemVM {
  label: string;
  value: string;
}

export interface DefinitionSectionVM {
  title: string;
  items: DefinitionItemVM[];
}

export interface ProjectionViewVM {
  id: string;
  name: string;
  createdAtText: string;
  periodText: string;
  isStale: boolean;
  summary: ProjectionSummaryVM;
  projection: RetirementProjectionVM;
  sourceSections: DefinitionSectionVM[];
  configSections: DefinitionSectionVM[];
}

const money = (value: number | null): string =>
  value === null ? PROJECTION_COMMON_LABELS.DASH : formatCurrency(value);

const year = (value: number | null): string =>
  value === null ? PROJECTION_COMMON_LABELS.DASH : String(value);

/** Summary numbers are formatted here, so rendering never touches a formatter. */
export const mapProjectionSummaryToVM = (summary: ProjectionSummary): ProjectionSummaryVM => ({
  retirementNetWorthText: money(summary.retirementNetWorth),
  finalNetWorthText: money(summary.finalNetWorth),
  minNetWorthText: money(summary.minNetWorth),
  minNetWorthYearText: year(summary.minNetWorthYear),
  bankruptcyYearText: year(summary.bankruptcyYear),
  isBankruptText: summary.isBankrupt ? PROJECTION_COMMON_LABELS.YES : PROJECTION_COMMON_LABELS.NO,
  isBankrupt: summary.isBankrupt,
});

const percent = percentText;

const sourceTypeLabel = (type: string): string => {
  switch (type) {
    case 'ledgerCode':
      return PROJECTION_VIEW_LABELS.LEDGER_CODE;
    case 'rule':
      return PROJECTION_VIEW_LABELS.RULE_SOURCE;
    case 'debtAccount':
      return PROJECTION_VIEW_LABELS.DEBT_ACCOUNT;
    default:
      return type;
  }
};

const emptyProjection = (retirementYear: number): RetirementProjectionVM => ({
  retirementYear,
  retirementSavingsText: PROJECTION_COMMON_LABELS.DASH,
  minYearText: PROJECTION_COMMON_LABELS.DASH,
  minSavingsText: PROJECTION_COMMON_LABELS.DASH,
  bankruptText: PROJECTION_COMMON_LABELS.DASH,
  bankruptTone: 'default',
  chartData: [],
  yearlyDetails: [],
});

/** Maps the frozen documents into display-only shapes; no relation to a plan. */
export const mapProjectionViewToVM = (data: ProjectionViewData): ProjectionViewVM => {
  const { projection, config, source, annual } = data;
  const retirementYear =
    config === null ? 0 : config.assumptions.birthYear + config.assumptions.retirementAge;
  const planEndYear =
    config === null ? 0 : config.assumptions.birthYear + config.assumptions.lifeExpectancy;
  const years = annual?.years ?? [];

  const projectionVm: RetirementProjectionVM =
    config === null
      ? emptyProjection(retirementYear)
      : {
          retirementYear,
          retirementSavingsText: money(projection.retirementNetWorth),
          minYearText: year(projection.minNetWorthYear),
          minSavingsText: formatCurrency(projection.minNetWorth),
          bankruptText:
            projection.bankruptcyYear === null
              ? PROJECTION_COMMON_LABELS.NO
              : `${PROJECTION_COMMON_LABELS.YES} (${projection.bankruptcyYear})`,
          bankruptTone: projection.isBankrupt ? 'negative' : 'positive',
          chartData: years.map((entry) =>
            mapProjectionPoint(entry, entry.inflows, entry.outflows, projection.bankruptcyYear),
          ),
          yearlyDetails: years.map(mapYearlyDetail),
        };

  const sourceSections =
    source === null
      ? []
      : [
          {
            title: PROJECTION_VIEW_LABELS.RULE_SOURCES_SECTION,
            items: source.ruleSources.map((entry) => ({
              label: PROJECTION_VIEW_LABELS.RULE,
              value:
                [
                  `${PROJECTION_VIEW_LABELS.SOURCE_TYPE}: ${sourceTypeLabel(entry.sourceType)}`,
                  `${PROJECTION_VIEW_LABELS.SOURCE_ID}: ${entry.sourceId}`,
                  `${PROJECTION_VIEW_LABELS.BASELINE_YEAR}: ${entry.baselineYear}`,
                  `${PROJECTION_VIEW_LABELS.BASELINE_AMOUNT}: ${formatCurrency(entry.baselineAmount)}`,
                ].join(' · ') + ` (${entry.ruleId})`,
            })),
          },
        ];

  const configSections: DefinitionSectionVM[] =
    config === null
      ? []
      : [
          {
            title: PROJECTION_VIEW_LABELS.CONFIG_SECTION,
            items: [
              { label: PROJECTION_VIEW_LABELS.START_YEAR, value: String(config.startYear) },
              {
                label: PROJECTION_VIEW_LABELS.OPENING_AMOUNT,
                value: formatCurrency(config.openingNetWorth.amount),
              },
              {
                label: PROJECTION_VIEW_LABELS.OPENING_SOURCE,
                value:
                  config.openingNetWorth.source === 'derived'
                    ? PROJECTION_VIEW_LABELS.DERIVED
                    : PROJECTION_VIEW_LABELS.MANUAL,
              },
              ...(config.openingNetWorth.anchorYearMonth === undefined
                ? []
                : [
                    {
                      label: PROJECTION_VIEW_LABELS.OPENING_ANCHOR,
                      value: config.openingNetWorth.anchorYearMonth,
                    },
                  ]),
            ],
          },
          {
            title: PROJECTION_VIEW_LABELS.ASSUMPTIONS_SECTION,
            items: [
              {
                label: PROJECTION_VIEW_LABELS.BIRTH_YEAR,
                value: String(config.assumptions.birthYear),
              },
              {
                label: PROJECTION_VIEW_LABELS.RETIREMENT_AGE,
                value: String(config.assumptions.retirementAge),
              },
              {
                label: PROJECTION_VIEW_LABELS.LIFE_EXPECTANCY,
                value: String(config.assumptions.lifeExpectancy),
              },
              {
                label: PROJECTION_VIEW_LABELS.INFLATION_RATE,
                value: percent(config.assumptions.inflationRate),
              },
              {
                label: PROJECTION_VIEW_LABELS.ANNUAL_RETURN_RATE,
                value: percent(config.assumptions.annualReturnRate),
              },
            ],
          },
          {
            title: PROJECTION_VIEW_LABELS.RULES_SECTION,
            items:
              config.projectionRules.length === 0
                ? [
                    {
                      label: PROJECTION_VIEW_LABELS.RULES_SECTION,
                      value: PROJECTION_VIEW_LABELS.NO_RULES,
                    },
                  ]
                : config.projectionRules.map((rule) => ({
                    label: PROJECTION_VIEW_LABELS.RULE_NAME,
                    value: [
                      rule.name,
                      `${PROJECTION_VIEW_LABELS.METHOD}: ${RULE_METHOD_LABELS[rule.method]}`,
                      `${PROJECTION_VIEW_LABELS.PARAMETERS}: ${parameterText(rule)}`,
                      `${PROJECTION_VIEW_LABELS.END_CONDITION}: ${endConditionText(rule)}`,
                      ...(rule.baselinePolicy === undefined
                        ? []
                        : [
                            `${PROJECTION_VIEW_LABELS.BASELINE_POLICY}: ${rule.baselinePolicy}`,
                            ...(rule.baselineYear === undefined
                              ? []
                              : [`${PROJECTION_VIEW_LABELS.BASELINE_YEAR}: ${rule.baselineYear}`]),
                          ]),
                      `${PROJECTION_VIEW_LABELS.ENABLED}: ${
                        rule.enabled ? PROJECTION_VIEW_LABELS.YES : PROJECTION_VIEW_LABELS.NO
                      }`,
                    ].join(' · '),
                  })),
          },
          {
            title: PROJECTION_VIEW_LABELS.EVENTS_SECTION,
            items:
              config.lifeEvents.length === 0
                ? [
                    {
                      label: PROJECTION_VIEW_LABELS.EVENTS_SECTION,
                      value: PROJECTION_VIEW_LABELS.NO_EVENTS,
                    },
                  ]
                : config.lifeEvents.map((event) => ({
                    label: PROJECTION_VIEW_LABELS.EVENT_NAME,
                    value: [
                      event.name,
                      `${PROJECTION_VIEW_LABELS.EVENT_TYPE}: ${event.type}`,
                      ...event.phases.map(
                        (phase) =>
                          `${PROJECTION_VIEW_LABELS.PHASE_RANGE}: ${phase.startYear}–${phase.endYear} · ${PROJECTION_VIEW_LABELS.AMOUNT}: ${formatCurrency(phase.amount)}${
                            phase.growthRate === undefined
                              ? ''
                              : ` · ${PROJECTION_VIEW_LABELS.GROWTH_RATE}: ${percent(phase.growthRate)}`
                          }`,
                      ),
                    ].join(' · '),
                  })),
          },
        ];

  return {
    id: projection.id,
    name: projection.name,
    createdAtText: formatDate(projection.createdAt),
    periodText:
      config === null ? PROJECTION_COMMON_LABELS.DASH : `${config.startYear}–${planEndYear}`,
    isStale: projection.engineVersion < ENGINE_VERSION,
    summary: {
      retirementNetWorthText: money(projection.retirementNetWorth),
      finalNetWorthText: formatCurrency(projection.finalNetWorth),
      minNetWorthText: formatCurrency(projection.minNetWorth),
      minNetWorthYearText: year(projection.minNetWorthYear),
      bankruptcyYearText: year(projection.bankruptcyYear),
      isBankruptText: projection.isBankrupt
        ? PROJECTION_VIEW_LABELS.YES
        : PROJECTION_VIEW_LABELS.NO,
      isBankrupt: projection.isBankrupt,
    },
    projection: projectionVm,
    sourceSections,
    configSections,
  };
};

export { SAVE_AS_PLAN_LABELS };
