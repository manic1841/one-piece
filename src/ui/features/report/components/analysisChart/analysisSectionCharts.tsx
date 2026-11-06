import { type ReactNode } from 'react';

import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';

import { AssetCompositionChart } from '../AssetCompositionChart';
import { DebtLeverageChart } from '../DebtLeverageChart';
import { type ReportAnalysisVM } from '../../viewmodels/reportAnalysis.vm';
import { AnalysisChart, type ChartLayer } from './AnalysisChart';
import { type ChartContext, type SectionVmKey } from './analysisChartSpecs';

type RenderChart = (vm: ReportAnalysisVM, context: ChartContext) => ReactNode;

const netWorth: RenderChart = (vm, context) => (
  <AnalysisChart
    points={vm.netWorth.points}
    initialActive={['netWorth', ...context.initialSeries]}
    selectedPeriod={context.selectedPeriod}
    onPointSelect={context.onPointSelect}
    showUnclosedLabels={context.showUnclosedLabels}
    height={{ mobile: 200, desktop: 320, shortDesktop: 240 }}
    layers={(points, isVisible) => {
      const layers: ChartLayer[] = [];
      if (isVisible('netWorth')) {
        layers.push({
          kind: 'line',
          seriesKey: 'netWorth',
          tone: 'primary',
          area: true,
          values: points.map((point) => point.netWorth),
        });
      }
      if (isVisible('assets')) {
        layers.push({
          kind: 'line',
          seriesKey: 'assets',
          tone: 'neutral',
          axis: 'right',
          dashed: true,
          values: points.map((point) => point.assets),
        });
      }
      if (isVisible('liabilities')) {
        layers.push({
          kind: 'line',
          seriesKey: 'liabilities',
          tone: 'negative',
          axis: 'right',
          dashed: true,
          values: points.map((point) => point.liabilities),
        });
      }
      return layers;
    }}
    tooltip={(point, isVisible) => ({
      // A hidden hero leaves its slot empty rather than lifting a peer.
      primary: isVisible('netWorth')
        ? {
            id: 'netWorth',
            label: REPORT_ANALYSIS_LABELS.NET_WORTH,
            value: point.netWorthText,
          }
        : undefined,
      secondary: [
        point.changeText === null ? null : { id: 'change', value: point.changeText },
        isVisible('assets')
          ? {
              id: 'assets',
              seriesKey: 'assets',
              label: REPORT_ANALYSIS_LABELS.TOTAL_ASSETS,
              value: point.assetsText,
            }
          : null,
        isVisible('liabilities')
          ? {
              id: 'liabilities',
              seriesKey: 'liabilities',
              label: REPORT_ANALYSIS_LABELS.TOTAL_LIABILITIES,
              value: point.liabilitiesText,
            }
          : null,
      ],
    })}
    legend={{
      items: [
        { key: 'netWorth', label: REPORT_ANALYSIS_LABELS.NET_WORTH, tone: 'primary' },
        { key: 'assets', label: REPORT_ANALYSIS_LABELS.TOTAL_ASSETS, tone: 'neutral' },
        { key: 'liabilities', label: REPORT_ANALYSIS_LABELS.TOTAL_LIABILITIES, tone: 'negative' },
      ],
    }}
    ariaLabel={(visible) => REPORT_ANALYSIS_LABELS.NET_WORTH_ARIA(visible.join('、'))}
  />
);

const investmentPerformance: RenderChart = (vm, context) => (
  <AnalysisChart
    points={vm.investmentPerformance.points}
    selectedPeriod={context.selectedPeriod}
    onPointSelect={context.onPointSelect}
    height={{ mobile: 160, desktop: 240, shortDesktop: 160 }}
    layers={(points, isVisible) =>
      isVisible('gain')
        ? [
            {
              kind: 'bar',
              seriesKey: 'gain',
              tone: 'positive',
              toneBySign: true,
              values: points.map((point) => point.gain),
            },
          ]
        : []
    }
    tooltip={(point, isVisible) => ({
      primary: isVisible('gain')
        ? { id: 'gain', label: REPORT_ANALYSIS_LABELS.GAIN, value: point.gainText }
        : undefined,
      secondary: [
        isVisible('returnRate')
          ? {
              id: 'returnRate',
              seriesKey: 'returnRate',
              label: REPORT_ANALYSIS_LABELS.RETURN_RATE,
              value: point.returnRateText,
            }
          : null,
        // The opening value stays even when the rate line is hidden; it is the rate's scale.
        {
          id: 'openingValue',
          label: REPORT_ANALYSIS_LABELS.OPENING_VALUE,
          value: point.openingValueText,
        },
      ],
    })}
    secondary={(points) => [
      {
        seriesKey: 'returnRate',
        unit: REPORT_ANALYSIS_LABELS.RETURN_RATE_UNIT,
        tone: 'investment',
        values: points.map((point) => point.returnRate),
        includeZero: true,
        yTicks: 3,
        yDecimals: 1,
        yUnit: '%',
      },
    ]}
    legend={{
      items: [
        { key: 'gain', label: REPORT_ANALYSIS_LABELS.GAIN, tone: 'positive' },
        { key: 'returnRate', label: REPORT_ANALYSIS_LABELS.RETURN_RATE, tone: 'investment' },
      ],
    }}
    ariaLabel={(visible) => REPORT_ANALYSIS_LABELS.INVESTMENT_PERFORMANCE_ARIA(visible.join('、'))}
  />
);

const income: RenderChart = (vm, context) => (
  <AnalysisChart
    points={vm.income.points}
    selectedPeriod={context.selectedPeriod}
    onPointSelect={context.onPointSelect}
    height={{ mobile: 160, desktop: 240, shortDesktop: 160 }}
    layers={(points, isVisible) => {
      const layers: ChartLayer[] = [];
      if (isVisible('income')) {
        layers.push({
          kind: 'bar',
          seriesKey: 'income',
          tone: 'positive',
          values: points.map((point) => point.income),
        });
      }
      if (isVisible('expense')) {
        layers.push({
          kind: 'bar',
          seriesKey: 'expense',
          tone: 'negative',
          values: points.map((point) => point.expense),
        });
      }
      return layers;
    }}
    tooltip={(point, isVisible) => ({
      primary: isVisible('income')
        ? { id: 'income', label: REPORT_ANALYSIS_LABELS.INCOME, value: point.incomeText }
        : undefined,
      secondary: [
        isVisible('expense')
          ? {
              id: 'expense',
              seriesKey: 'expense',
              label: REPORT_ANALYSIS_LABELS.EXPENSE,
              value: point.expenseText,
            }
          : null,
        isVisible('savingsRate')
          ? {
              id: 'savingsRate',
              seriesKey: 'savingsRate',
              label: REPORT_ANALYSIS_LABELS.SAVINGS_RATE,
              value: point.savingsRateText,
            }
          : null,
        point.changeText === null ? null : { id: 'change', value: point.changeText },
      ],
    })}
    secondary={(points) => [
      {
        seriesKey: 'savingsRate',
        unit: REPORT_ANALYSIS_LABELS.SAVINGS_RATE_UNIT,
        tone: 'asset',
        values: points.map((point) => point.savingsRate),
        yTicks: 3,
        yDecimals: 1,
      },
    ]}
    legend={{
      items: [
        { key: 'income', label: REPORT_ANALYSIS_LABELS.INCOME, tone: 'positive' },
        { key: 'expense', label: REPORT_ANALYSIS_LABELS.EXPENSE, tone: 'negative' },
        { key: 'savingsRate', label: REPORT_ANALYSIS_LABELS.SAVINGS_RATE, tone: 'asset' },
      ],
    }}
    ariaLabel={(visible) => REPORT_ANALYSIS_LABELS.INCOME_ARIA(visible.join('、'))}
  />
);

const cashFlow: RenderChart = (vm, context) => (
  <AnalysisChart
    points={vm.cashFlow.points}
    initialActive={['netCashFlow']}
    selectedPeriod={context.selectedPeriod}
    onPointSelect={context.onPointSelect}
    layers={(points, isVisible) =>
      isVisible('netCashFlow')
        ? [
            {
              kind: 'bar',
              seriesKey: 'netCashFlow',
              tone: 'positive',
              toneBySign: true,
              values: points.map((point) => point.netCashFlow),
            },
          ]
        : []
    }
    tooltip={(point, isVisible) => ({
      primary: isVisible('netCashFlow')
        ? {
            id: 'netCashFlow',
            label: REPORT_ANALYSIS_LABELS.NET_CASH_FLOW,
            value: point.netCashFlowText,
          }
        : undefined,
    })}
    legend={{
      items: [{ key: 'netCashFlow', label: REPORT_ANALYSIS_LABELS.NET_CASH_FLOW, tone: 'positive' }],
    }}
    ariaLabel={(visible) =>
      REPORT_ANALYSIS_LABELS.CASH_FLOW_ARIA(
        visible.length === 0 ? '' : REPORT_ANALYSIS_LABELS.NET_CASH_FLOW,
      )
    }
  />
);

const cashCoverage: RenderChart = (vm, context) => (
  <AnalysisChart
    points={vm.cashCoverage.points}
    selectedPeriod={context.selectedPeriod}
    onPointSelect={context.onPointSelect}
    showUnclosedLabels={context.showUnclosedLabels}
    height={{ mobile: 160, desktop: 240, shortDesktop: 240 }}
    includeZero
    yTicks={3}
    yDecimals={1}
    layers={(points) => [
      {
        kind: 'line',
        seriesKey: 'coverageMonths',
        tone: 'positive',
        values: points.map((point) => point.coverageMonths),
      },
    ]}
    tooltip={(point) => ({
      primary: {
        id: 'coverageMonths',
        label: REPORT_ANALYSIS_LABELS.COVERAGE_MONTHS,
        value: point.coverageMonthsText,
      },
      secondary: [
        { id: 'cash', label: REPORT_ANALYSIS_LABELS.COVERAGE_CASH, value: point.cashText },
        {
          id: 'expenseAverage',
          label: REPORT_ANALYSIS_LABELS.COVERAGE_EXPENSE_AVERAGE,
          value: point.expenseAverageText,
        },
      ],
    })}
    ariaLabel={() =>
      REPORT_ANALYSIS_LABELS.CASH_COVERAGE_ARIA(REPORT_ANALYSIS_LABELS.COVERAGE_MONTHS)
    }
  />
);

/** Chart renderers still on the old wrappers, migrated in the following steps. */
const assetComposition: RenderChart = (vm, context) => (
  <AssetCompositionChart
    points={vm.assetComposition.points}
    markerLabels={false}
    selectedPeriod={context.selectedPeriod}
    onPointSelect={context.onPointSelect}
  />
);

const debtLeverage: RenderChart = (vm, context) => (
  <DebtLeverageChart
    points={vm.debtLeverage.points}
    showLeverage={vm.debtLeverage.showLeverage}
    markerLabels={false}
    selectedPeriod={context.selectedPeriod}
    onPointSelect={context.onPointSelect}
  />
);

/** One renderer per section; the registry owns order and copy. */
export const SECTION_CHARTS: Record<SectionVmKey, RenderChart> = {
  netWorth,
  assetComposition,
  investmentPerformance,
  income,
  cashFlow,
  debtLeverage,
  cashCoverage,
};
