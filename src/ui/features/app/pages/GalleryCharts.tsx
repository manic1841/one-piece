import React from 'react';

import { FinancialNumber } from '@/ui/components/FinancialNumber';
import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { ChartTooltip } from '@/ui/components/charts/ChartTooltip';
import { DonutChart } from '@/ui/components/charts/DonutChart';
import { InteractiveBarChart } from '@/ui/components/charts/InteractiveBarChart';
import { InteractiveComposedChart } from '@/ui/components/charts/InteractiveComposedChart';
import { InteractiveLineChart } from '@/ui/components/charts/InteractiveLineChart';
import { LineChart } from '@/ui/components/charts/LineChart';
import { heroPoint } from '@/ui/components/charts/chartInteraction';
import { type ComposedSeries } from '@/ui/components/charts/composedChartGeometry';
import { eyebrowClass } from '@/ui/components/eyebrow';
import type { MoneyTone } from '@/ui/components/moneyTone';
import { PROJECTION_COMMON_LABELS } from '@/ui/constants/retirement/displayLabels';

import { GalleryGroup, GalleryModule, GallerySection } from './GalleryScaffold';

const MONTHS_12 = [
  'OCT',
  'NOV',
  'DEC',
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
];

const NET_WORTH = [
  4_120_000, 4_180_000, 4_160_000, 4_310_000, 4_270_000, 4_420_000, 4_380_000, 4_520_000, 4_470_000,
  4_620_000, 4_570_000, 4_812_430,
];

const PORTFOLIO_RETURN = [108, 112, 94, 101, 78, 86, 62, 69, 48, 55, 28];

const CASH_FLOW_LABELS = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];
const CASH_FLOW_SERIES = [
  { tone: 'positive' as const, values: [55, 70, 64, 78, 69, 84] },
  { tone: 'negative' as const, values: [28, 34, 43, 38, 32, 31] },
];
const CASH_FLOW_POINTS = [
  ['APR 2026', '55,000', '28,000'],
  ['MAY 2026', '70,000', '34,000'],
  ['JUN 2026', '64,000', '43,000'],
  ['JUL 2026', '78,000', '38,000'],
  ['AUG 2026', '69,000', '32,000'],
  ['SEP 2026', '84,000', '31,000'],
].map(([title, inflow, outflow]) =>
  heroPoint(title ?? '', { id: 'inflow', label: 'INCOME', value: `+NT$${inflow}` }, [
    { id: 'outflow', label: 'EXPENSE', value: `−NT$${outflow}` },
  ]),
);

const ALLOCATION = [
  { label: 'Equities', value: 42 },
  { label: 'Cash', value: 25 },
  { label: 'Bonds', value: 17 },
  { label: 'Other', value: 16 },
];

const PROJECTION_LABELS = ['2026', '2030', '2035', '2040', '2045', '2050'];
const PROJECTION_INCOME = [720_000, 760_000, 680_000, 520_000, 420_000, 380_000];
const PROJECTION_EXPENSE = [420_000, 480_000, 520_000, 540_000, 560_000, 520_000];
const PROJECTION_NET_CASH_FLOW = [300_000, 280_000, 160_000, -20_000, -140_000, -140_000];
const PROJECTION_NET_WORTH = [1_200_000, 1_800_000, 2_400_000, 2_600_000, 2_200_000, 1_400_000];
// 5% of the net worth held that year — the band that stacks on top of income.
const PROJECTION_RETURN = [60_000, 90_000, 120_000, 130_000, 110_000, 70_000];
const PROJECTION_SERIES: ComposedSeries[] = [
  { kind: 'line', tone: 'positive', area: true, values: PROJECTION_INCOME },
  {
    kind: 'line',
    tone: 'investment',
    area: true,
    values: PROJECTION_INCOME.map((income, index) => income + (PROJECTION_RETURN[index] ?? 0)),
    baselineValues: PROJECTION_INCOME,
  },
  {
    kind: 'line',
    tone: 'negative',
    area: true,
    values: PROJECTION_EXPENSE.map((expense) => -expense),
  },
  { kind: 'line', tone: 'primary', values: PROJECTION_NET_CASH_FLOW },
  { kind: 'line', tone: 'asset', axis: 'right', values: PROJECTION_NET_WORTH },
];
const PROJECTION_POINTS = PROJECTION_LABELS.map((year, index) =>
  heroPoint(
    `YEAR ${year}`,
    {
      id: 'netCashFlow',
      label: 'NET CASH FLOW',
      value: `NT$${(PROJECTION_NET_CASH_FLOW[index] ?? 0).toLocaleString()}`,
    },
    [
      {
        id: 'income',
        label: 'INCOME',
        value: `NT$${(PROJECTION_INCOME[index] ?? 0).toLocaleString()}`,
      },
      {
        id: 'return',
        label: 'RETURN',
        value: `NT$${(PROJECTION_RETURN[index] ?? 0).toLocaleString()}`,
      },
      {
        id: 'netWorth',
        label: 'NET WORTH',
        value: `NT$${(PROJECTION_NET_WORTH[index] ?? 0).toLocaleString()}`,
      },
    ],
  ),
);

const NET_WORTH_POINTS = [
  ['OCT 2025', 'NT$4,120,000', PROJECTION_COMMON_LABELS.DASH],
  ['NOV 2025', 'NT$4,180,000', '+1.5%'],
  ['DEC 2025', 'NT$4,160,000', '+1.0%'],
  ['JAN 2026', 'NT$4,310,000', '+4.6%'],
  ['FEB 2026', 'NT$4,270,000', '+3.6%'],
  ['MAR 2026', 'NT$4,420,000', '+7.3%'],
  ['APR 2026', 'NT$4,380,000', '+6.3%'],
  ['MAY 2026', 'NT$4,520,000', '+9.7%'],
  ['JUN 2026', 'NT$4,470,000', '+8.5%'],
  ['JUL 2026', 'NT$4,620,000', '+12.1%'],
  ['AUG 2026', 'NT$4,570,000', '+10.9%'],
  ['SEP 2026', 'NT$4,812,430', '+8.42% YTD'],
].map(([title, value, change]) =>
  heroPoint(title ?? '', { id: 'value', value: value ?? '' }, [
    { id: 'change', value: change ?? '' },
  ]),
);

const SIGNED_LABELS = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];
const SIGNED_VALUES = [32000, -8000, 45000, 6000, -12300, 27000];

const SignedCashFlowModule: React.FC = () => {
  const [hidden, setHidden] = React.useState<string[]>([]);
  const toggle = (label: string) =>
    setHidden((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );

  return (
    <GalleryModule label="COMPOSED CHART · SIGNED BARS · NULL GAP · TOGGLEABLE LEGEND">
      <ChartHead value="-NT$12,300" meta="SEP 2026" tone="negative" />
      <InteractiveComposedChart
        labels={SIGNED_LABELS}
        series={[
          ...(hidden.includes('NET WORTH')
            ? []
            : [
                {
                  kind: 'line' as const,
                  tone: 'asset' as const,
                  values: [42000, 38000, null, 51000, 39600, 31200],
                },
              ]),
          ...(hidden.includes('NET CASH FLOW')
            ? []
            : [
                {
                  kind: 'bar' as const,
                  tone: 'positive' as const,
                  toneBySign: true,
                  values: SIGNED_VALUES,
                },
              ]),
        ]}
        points={SIGNED_LABELS.map((label, index) =>
          heroPoint(`${label} 2026`, {
            id: 'netCashFlow',
            value: `NT$${(SIGNED_VALUES[index] ?? 0).toLocaleString()}`,
          }),
        )}
        height={180}
        ariaLabel="Signed monthly cash flow with detail"
      />
      <ChartLegend
        className="mt-4"
        active={['NET WORTH', 'NET CASH FLOW'].filter((label) => !hidden.includes(label))}
        onToggle={toggle}
        items={[
          { label: 'NET WORTH', tone: 'asset' },
          { label: 'NET CASH FLOW', tone: 'positive' },
        ]}
      />
    </GalleryModule>
  );
};

const ChartHead: React.FC<{ value: string; meta: string; tone?: MoneyTone }> = ({
  value,
  meta,
  tone = 'default',
}) => (
  <div className="mb-4">
    <FinancialNumber
      value={value}
      size="large"
      tone={tone}
      change={meta}
      changeTone={tone === 'default' ? 'muted' : tone}
    />
  </div>
);

const LineChartSection: React.FC = () => (
  <GallerySection number="35" title="Chart & Data Visualization">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <GalleryModule label="LINE CHART · 12M NET WORTH">
        <ChartHead value="NT$4,812,430" meta="+8.42% YTD" tone="positive" />
        <LineChart
          values={NET_WORTH}
          labels={MONTHS_12}
          includeZero
          yAxis="left"
          showArea
          markLastPoint
          height={150}
          ariaLabel="12 month net worth"
        />
      </GalleryModule>

      <GalleryModule label="LINE CHART · CASH FLOW · ZERO BASELINE">
        <ChartHead value="-NT$12,300" meta="SEP 2026" tone="negative" />
        <LineChart
          values={[38000, -12000, 42000, -8000, 36000, -12300]}
          labels={CASH_FLOW_LABELS}
          tone="positive"
          includeZero
          zeroLine
          markLastPoint
          height={150}
          ariaLabel="Monthly net cash flow"
        />
      </GalleryModule>

      <GalleryModule label="BAR CHART · MONTHLY CASH FLOW · HOVER OR ARROW KEYS">
        <ChartHead value="+NT$36,000" meta="+22.4% MoM" tone="positive" />
        <InteractiveBarChart
          labels={CASH_FLOW_LABELS}
          series={CASH_FLOW_SERIES}
          points={CASH_FLOW_POINTS}
          highlightIndex={CASH_FLOW_LABELS.length - 1}
          height={165}
          ariaLabel="Monthly cash flow with detail"
        />
        <ChartLegend
          className="mt-4"
          items={[
            { label: 'INCOME', tone: 'positive' },
            { label: 'EXPENSE', tone: 'negative' },
            { label: 'CURRENT', tone: 'primary' },
          ]}
        />
      </GalleryModule>

      <GalleryModule label="COMPOSED CHART · PROJECTION · STACKED BANDS · HOVER OR ARROW KEYS">
        <ChartHead value="NT$1,400,000" meta="2050 · NET WORTH" tone="default" />
        <InteractiveComposedChart
          labels={PROJECTION_LABELS}
          series={PROJECTION_SERIES}
          referenceLines={[{ index: 3, tone: 'primary', label: 'RETIREMENT' }]}
          points={PROJECTION_POINTS}
          height={220}
          ariaLabel="Retirement projection with detail"
        />
        <ChartLegend
          className="mt-4"
          items={[
            { label: 'INCOME', tone: 'positive' },
            { label: 'INVESTMENT RETURN', tone: 'investment' },
            { label: 'EXPENSE', tone: 'negative' },
            { label: 'NET CASH FLOW', tone: 'primary' },
            { label: 'NET WORTH', tone: 'asset' },
          ]}
        />
      </GalleryModule>

      <SignedCashFlowModule />

      <GalleryModule label="DONUT CHART · ASSET ALLOCATION">
        <DonutChart segments={ALLOCATION} centerLabel="100%" ariaLabel="Asset allocation" />
      </GalleryModule>

      <GalleryModule label="CHART WITH SUMMARY">
        <div className="grid grid-cols-1 items-center gap-7 sm:grid-cols-[180px_1fr]">
          <div>
            <p className={eyebrowClass}>PORTFOLIO RETURN</p>
            <FinancialNumber
              value="+12.42%"
              size="hero"
              change="YTD · +NT$284,210"
              changeTone="positive"
              className="mt-1 block"
            />
          </div>
          <LineChart
            values={PORTFOLIO_RETURN}
            labels={MONTHS_12.slice(0, 11)}
            includeZero
            yAxis="left"
            height={145}
          />
        </div>
      </GalleryModule>
    </div>

    <GalleryModule label="CHART TOOLTIP · HOVER OR ARROW KEYS" className="mt-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto]">
        <div>
          <ChartHead value="NT$4,812,430" meta="+8.42% YTD" tone="positive" />
          <InteractiveLineChart
            values={NET_WORTH}
            points={NET_WORTH_POINTS}
            xLabels={MONTHS_12}
            ariaLabel="12M net worth with hover detail"
          />
        </div>
        <div>
          <p className={`mb-3 ${eyebrowClass}`}>TOOLTIP SPECIMEN</p>
          <ChartTooltip
            title="SEP 2026"
            content={{
              mode: 'hero',
              primary: { id: 'netWorth', label: 'NET WORTH', value: 'NT$4,812,430' },
              secondary: [{ id: 'change', value: '+8.42% YTD' }],
            }}
          />
        </div>
      </div>
    </GalleryModule>
  </GallerySection>
);

export const GalleryChartsBody: React.FC = () => (
  <>
    <GalleryGroup label="DATA VISUALIZATION" />
    <LineChartSection />
  </>
);
