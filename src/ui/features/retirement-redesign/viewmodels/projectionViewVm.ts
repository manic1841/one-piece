import { type ProjectionViewData } from '@/application/retirement/use_cases/getProjectionViewUseCase';
import { ENGINE_VERSION } from '@/domains/retirement/logic/projectionEngine';
import { type ProjectionRule } from '@/domains/retirement/projectionRules';
import {
  PROJECTION_VIEW_LABELS,
  SAVE_AS_PLAN_LABELS,
} from '@/ui/constants/retirement-redesign/projectionLabels';
import {
  BASELINE_POLICY_LABELS,
  END_CONDITION_LABELS,
  RULE_METHOD_LABELS,
} from '@/ui/constants/retirement-redesign/setupLabels';
import { type RetirementProjectionVM } from '@/ui/features/retirement/viewmodels/retirementDisplay.vm';
import { formatCurrency, formatDate } from '@/ui/utils';

export type { ProjectionViewData } from '@/application/retirement/use_cases/getProjectionViewUseCase';

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

const money = (value: number | null): string => (value === null ? '—' : formatCurrency(value));

const year = (value: number | null): string => (value === null ? '—' : String(value));

const percent = (value: number): string => `${Number((value * 100).toFixed(4))}%`;

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

const parameterText = (rule: ProjectionRule): string => {
  if ('rate' in rule.parameters) return `Rate ${percent(rule.parameters.rate)}`;
  if ('ratio' in rule.parameters) return `Ratio ${percent(rule.parameters.ratio)}`;
  if ('amount' in rule.parameters) return formatCurrency(rule.parameters.amount);
  return '—';
};

const endConditionText = (rule: ProjectionRule): string => {
  if (rule.endCondition === undefined) return '—';
  switch (rule.endCondition.type) {
    case 'retirementYearExclusive':
      return END_CONDITION_LABELS.retirementYearExclusive;
    case 'specificAge':
      return `${END_CONDITION_LABELS.specificAge} ${rule.endCondition.age}`;
    case 'specificYear':
      return `${END_CONDITION_LABELS.specificYear} ${rule.endCondition.year}`;
    case 'lifelong':
      return END_CONDITION_LABELS.lifelong;
  }
};

const emptyProjection = (retirementYear: number): RetirementProjectionVM => ({
  retirementYear,
  retirementSavingsText: '—',
  minYearText: '—',
  minSavingsText: '—',
  bankruptText: '—',
  bankruptTone: 'default',
  chartData: [],
  yearlyDetails: [],
  expenseBreakdownChartData: null,
  risks: [],
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
          retirementSavingsText:
            projection.retirementNetWorth === null
              ? '—'
              : formatCurrency(projection.retirementNetWorth),
          minYearText:
            projection.minNetWorthYear === null ? '—' : String(projection.minNetWorthYear),
          minSavingsText: formatCurrency(projection.minNetWorth),
          bankruptText:
            projection.bankruptcyYear === null ? 'No' : `Yes (${projection.bankruptcyYear})`,
          bankruptTone: projection.isBankrupt ? 'negative' : 'positive',
          chartData: years.map((entry) => ({
            year: entry.year,
            age: entry.age,
            income: entry.inflows,
            expense: entry.outflows,
            investmentIncome: entry.return,
            netCashFlow: entry.inflows - entry.outflows,
            savings: entry.closing,
            incomeText: formatCurrency(entry.inflows),
            expenseText: formatCurrency(entry.outflows),
            investmentIncomeText: formatCurrency(entry.return),
            netCashFlowText: formatCurrency(entry.inflows - entry.outflows),
            savingsText: formatCurrency(entry.closing),
            isBankruptYear: projection.bankruptcyYear === entry.year,
            isRetired: entry.isRetired,
          })),
          yearlyDetails: years.map((entry) => ({
            year: entry.year,
            age: entry.age,
            isRetired: entry.isRetired,
            statusText: entry.isRetired ? 'Retired' : 'Working',
            incomeText: formatCurrency(entry.inflows),
            expenseText: formatCurrency(entry.outflows),
            investmentReturnText: formatCurrency(entry.return),
            netCashFlowText: formatCurrency(entry.inflows - entry.outflows),
            savingsText: formatCurrency(entry.closing),
            incomeItems: [],
            expenseItems: [],
          })),
          expenseBreakdownChartData: null,
          risks: [],
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
                            `${PROJECTION_VIEW_LABELS.SOURCE_TYPE}: ${
                              BASELINE_POLICY_LABELS[
                                rule.baselinePolicy as keyof typeof BASELINE_POLICY_LABELS
                              ]
                            }`,
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
    periodText: config === null ? '—' : `${config.startYear}–${planEndYear}`,
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
