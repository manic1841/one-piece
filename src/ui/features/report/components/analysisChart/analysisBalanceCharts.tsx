import { type ReactNode } from 'react';

import { CHART_COLOR_TOKEN_COLOR, type ChartColorToken } from '@/ui/components/charts/chartTheme';
import { REPORT_ANALYSIS_LABELS } from '@/ui/constants/report/reportCenterLabels';

import {
  type AssetCompositionChartVM,
  type ReportAnalysisVM,
} from '../../viewmodels/reportAnalysis.vm';
import { AnalysisChart, type ChartSecondary } from './AnalysisChart';
import { type ChartContext } from './analysisChartSpecs';

type RenderChart = (vm: ReportAnalysisVM, context: ChartContext) => ReactNode;

/** 資產以什麼形式持有：三條固定類別的 100% 堆疊面積，分母固定總資產。 */
const ASSET_SERIES: {
  key: 'cash' | 'investment' | 'property';
  label: string;
  colorToken: ChartColorToken;
  value: (point: AssetCompositionChartVM) => number;
  amountText: (point: AssetCompositionChartVM) => string;
  shareText: (point: AssetCompositionChartVM) => string;
}[] = [
  {
    key: 'cash',
    label: REPORT_ANALYSIS_LABELS.CASH_GROUP,
    colorToken: 'chart-1',
    value: (point) => point.cashShare,
    amountText: (point) => point.cashText,
    shareText: (point) => point.cashShareText,
  },
  {
    key: 'investment',
    label: REPORT_ANALYSIS_LABELS.INVESTMENT_GROUP,
    colorToken: 'chart-4',
    value: (point) => point.investmentShare,
    amountText: (point) => point.investmentText,
    shareText: (point) => point.investmentShareText,
  },
  {
    key: 'property',
    label: REPORT_ANALYSIS_LABELS.PROPERTY_GROUP,
    colorToken: 'chart-3',
    value: (point) => point.propertyShare,
    amountText: (point) => point.propertyText,
    shareText: (point) => point.propertyShareText,
  },
];

export const assetComposition: RenderChart = (vm, context) => (
  <AnalysisChart
    points={vm.assetComposition.points}
    selectedPeriod={context.selectedPeriod}
    onPointSelect={context.onPointSelect}
    height={{ mobile: 200, desktop: 320, shortDesktop: 240 }}
    yDomain={{ min: 0, max: 100 }}
    yTicks={5}
    yUnit="%"
    layers={(points, isVisible) =>
      ASSET_SERIES.filter((item) => isVisible(item.key)).map((item) => ({
        kind: 'line',
        seriesKey: item.key,
        tone: 'neutral',
        colorToken: item.colorToken,
        area: true,
        // Hidden series collapse out of the stack; the percentages themselves are
        // still shares of the full asset total, so the visible bands may not reach 100%.
        baseline: 'stack',
        values: points.map(item.value),
      }))
    }
    tooltip={(point, isVisible) => ({
      mode: 'list',
      items: ASSET_SERIES.filter((item) => isVisible(item.key)).map((item) => ({
        id: item.key,
        seriesKey: item.key,
        label: item.label,
        value: item.amountText(point),
        detail: `（${item.shareText(point)}）`,
        color: CHART_COLOR_TOKEN_COLOR[item.colorToken],
      })),
    })}
    legend={{
      items: ASSET_SERIES.map((item) => ({
        key: item.key,
        label: item.label,
        color: CHART_COLOR_TOKEN_COLOR[item.colorToken],
      })),
    }}
    ariaLabel={(visible) => REPORT_ANALYSIS_LABELS.ASSET_COMPOSITION_ARIA(visible.join('、'))}
  />
);

/**
 * 負債餘額柱、負債比折線、加權平均槓桿折線三層同節。槓桿層只在目前範圍
 * 真的出現槓桿時存在；缺 snapshot 只讓槓桿線斷開。
 */
export const debtLeverage: RenderChart = (vm, context) => (
  <div className="space-y-3">
    <AnalysisChart
      points={vm.debtLeverage.points}
      selectedPeriod={context.selectedPeriod}
      onPointSelect={context.onPointSelect}
      height={{ mobile: 160, desktop: 240, shortDesktop: 160 }}
      layers={(points, isVisible) =>
        isVisible('liabilities')
          ? [
              {
                kind: 'bar',
                seriesKey: 'liabilities',
                tone: 'negative',
                values: points.map((point) => point.liabilities),
              },
            ]
          : []
      }
      tooltip={(point, isVisible) => ({
        primary: isVisible('liabilities')
          ? {
              id: 'liabilities',
              label: REPORT_ANALYSIS_LABELS.DEBT_BALANCE,
              value: point.liabilitiesText,
            }
          : undefined,
        secondary: [
          isVisible('debtRatio')
            ? {
                id: 'debtRatio',
                seriesKey: 'debtRatio',
                label: REPORT_ANALYSIS_LABELS.DEBT_RATIO,
                value: point.debtRatioText,
                ...(point.changeText === null ? {} : { detail: point.changeText }),
              }
            : null,
          isVisible('leverage')
            ? {
                id: 'leverage',
                seriesKey: 'leverage',
                label: REPORT_ANALYSIS_LABELS.LEVERAGE,
                value: point.leverageText,
              }
            : null,
        ],
      })}
      secondary={(points) => {
        const bands: ChartSecondary[] = [
          {
            seriesKey: 'debtRatio',
            unit: REPORT_ANALYSIS_LABELS.DEBT_RATIO_UNIT,
            tone: 'neutral',
            values: points.map((point) => point.debtRatio),
            yTicks: 3,
            yDecimals: 1,
            yUnit: '%',
          },
        ];
        if (vm.debtLeverage.showLeverage) {
          bands.push({
            seriesKey: 'leverage',
            unit: REPORT_ANALYSIS_LABELS.LEVERAGE_UNIT,
            tone: 'investment',
            values: points.map((point) => point.leverage),
            yTicks: 3,
            yDecimals: 3,
            yUnit: 'x',
          });
        }
        return bands;
      }}
      legend={{
        items: [
          { key: 'liabilities', label: REPORT_ANALYSIS_LABELS.DEBT_BALANCE, tone: 'negative' },
          { key: 'debtRatio', label: REPORT_ANALYSIS_LABELS.DEBT_RATIO, tone: 'neutral' },
          ...(vm.debtLeverage.showLeverage
            ? [
                {
                  key: 'leverage',
                  label: REPORT_ANALYSIS_LABELS.LEVERAGE,
                  tone: 'investment' as const,
                },
              ]
            : []),
        ],
      }}
      ariaLabel={(visible) => REPORT_ANALYSIS_LABELS.DEBT_LEVERAGE_ARIA(visible.join('、'))}
    />
    {!vm.debtLeverage.showLeverage && (
      <p className="text-xs text-muted-foreground">{REPORT_ANALYSIS_LABELS.NO_LEVERAGE_HINT}</p>
    )}
  </div>
);
