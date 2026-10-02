import React from 'react';

import { FinancialNumber } from '@/ui/components/FinancialNumber';
import { ChartLegend } from '@/ui/components/charts/ChartLegend';
import { ChartTooltip } from '@/ui/components/charts/ChartTooltip';
import { DonutChart } from '@/ui/components/charts/DonutChart';
import { InteractiveBarChart } from '@/ui/components/charts/InteractiveBarChart';
import { InteractiveLineChart } from '@/ui/components/charts/InteractiveLineChart';
import { LineChart } from '@/ui/components/charts/LineChart';
import type { MoneyTone } from '@/ui/components/moneyTone';

import { GalleryModule, GallerySection } from './GalleryScaffold';

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
  { title: 'APR 2026', value: 'INCOME +NT$55,000', meta: 'EXPENSE −NT$28,000' },
  { title: 'MAY 2026', value: 'INCOME +NT$70,000', meta: 'EXPENSE −NT$34,000' },
  { title: 'JUN 2026', value: 'INCOME +NT$64,000', meta: 'EXPENSE −NT$43,000' },
  { title: 'JUL 2026', value: 'INCOME +NT$78,000', meta: 'EXPENSE −NT$38,000' },
  { title: 'AUG 2026', value: 'INCOME +NT$69,000', meta: 'EXPENSE −NT$32,000' },
  { title: 'SEP 2026', value: 'INCOME +NT$84,000', meta: 'EXPENSE −NT$31,000' },
];

const ALLOCATION = [
  { label: 'Equities', value: 42 },
  { label: 'Cash', value: 25 },
  { label: 'Bonds', value: 17 },
  { label: 'Other', value: 16 },
];

const NET_WORTH_POINTS = [
  { title: 'OCT 2025', value: 'NT$4,120,000', meta: '—' },
  { title: 'NOV 2025', value: 'NT$4,180,000', meta: '+1.5%' },
  { title: 'DEC 2025', value: 'NT$4,160,000', meta: '+1.0%' },
  { title: 'JAN 2026', value: 'NT$4,310,000', meta: '+4.6%' },
  { title: 'FEB 2026', value: 'NT$4,270,000', meta: '+3.6%' },
  { title: 'MAR 2026', value: 'NT$4,420,000', meta: '+7.3%' },
  { title: 'APR 2026', value: 'NT$4,380,000', meta: '+6.3%' },
  { title: 'MAY 2026', value: 'NT$4,520,000', meta: '+9.7%' },
  { title: 'JUN 2026', value: 'NT$4,470,000', meta: '+8.5%' },
  { title: 'JUL 2026', value: 'NT$4,620,000', meta: '+12.1%' },
  { title: 'AUG 2026', value: 'NT$4,570,000', meta: '+10.9%' },
  { title: 'SEP 2026', value: 'NT$4,812,430', meta: '+8.42% YTD' },
];

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
  <GallerySection number="15" title="Chart & Data Visualization">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <GalleryModule label="LINE CHART · 12M NET WORTH">
        <ChartHead value="NT$4,812,430" meta="+8.42% YTD" tone="positive" />
        <LineChart
          values={NET_WORTH}
          labels={MONTHS_12}
          showArea
          markLastPoint
          height={150}
          ariaLabel="12 month net worth"
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

      <GalleryModule label="DONUT CHART · ASSET ALLOCATION">
        <DonutChart segments={ALLOCATION} centerLabel="100%" ariaLabel="Asset allocation" />
      </GalleryModule>

      <GalleryModule label="CHART WITH SUMMARY">
        <div className="grid grid-cols-1 items-center gap-7 sm:grid-cols-[180px_1fr]">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              PORTFOLIO RETURN
            </p>
            <FinancialNumber
              value="+12.42%"
              size="hero"
              change="YTD · +NT$284,210"
              changeTone="positive"
              className="mt-1 block"
            />
          </div>
          <LineChart values={PORTFOLIO_RETURN} labels={MONTHS_12.slice(0, 11)} height={145} />
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
          <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            TOOLTIP SPECIMEN
          </p>
          <ChartTooltip title="SEP 2026" value="NT$4,812,430" meta="+8.42% YTD" />
        </div>
      </div>
    </GalleryModule>
  </GallerySection>
);

export const GalleryChartsBody: React.FC = () => <LineChartSection />;
