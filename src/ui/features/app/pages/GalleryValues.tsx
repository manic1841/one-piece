import React from 'react';

import { DefinitionRows } from '@/ui/components/DefinitionRows';
import { FinancialNumber } from '@/ui/components/FinancialNumber';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import PeriodBadge from '@/ui/components/PeriodBadge';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Badge } from '@/ui/components/ui/badge';

import { GalleryGroup, GalleryModule, GallerySection } from './GalleryScaffold';

const NumberSection: React.FC = () => (
  <GallerySection number="01" title="Financial Number">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <GalleryModule label="NET WORTH">
        <FinancialNumber
          value="NT$4,812,430"
          size="hero"
          change="+8.42% YTD · +NT$374,210"
          changeTone="positive"
        />
      </GalleryModule>
      <GalleryModule label="PORTFOLIO RETURN">
        <FinancialNumber
          value="+12.42%"
          size="large"
          tone="positive"
          change="YTD"
          changeTone="positive"
        />
      </GalleryModule>
      <GalleryModule label="MISSING DATA">
        <FinancialNumber value={null} change="No report available" />
      </GalleryModule>
    </div>
  </GallerySection>
);

const MetricSection: React.FC = () => (
  <GallerySection number="02" title="Metric Group">
    <MetricGroup>
      <Metric label="TOTAL ASSETS" value="NT$5,420,000" change="+6.8% YTD" changeTone="positive" />
      <Metric label="TOTAL LIABILITIES" value="NT$598,680" change="-1.2% YTD" />
      <Metric
        label="MONTHLY CASH FLOW"
        value="+NT$36,000"
        tone="positive"
        change="+22.4% MoM"
        changeTone="positive"
      />
      <Metric label="PORTFOLIO RETURN" value="+12.4%" tone="positive" change="YTD" />
    </MetricGroup>
    <GalleryModule label="5-COLUMN SNAPSHOT" className="mt-6">
      <MetricGroup columns={5} lastSpansFull>
        <Metric label="TOTAL ASSETS" value="NT$5,420,000" change="ANCHORED 2026-08" />
        <Metric label="TOTAL LIABILITIES" value="NT$598,680" />
        <Metric label="MONTHLY CASH FLOW" value="-NT$12,300" tone="negative" />
        <Metric label="PORTFOLIO RETURN" value="3.91%" change="損益 NT$3,000" />
        <Metric label="INVESTMENT LEVERAGE" value="1.20x" />
      </MetricGroup>
    </GalleryModule>
    <GalleryModule label="WITH ACTION" className="mt-6">
      <MetricGroup columns={2}>
        <Metric
          label="LOWEST NET WORTH"
          value="NT$120,000"
          change="AGE 62 · 2052"
          action={<span className="font-mono text-xs text-primary">檢視該年 →</span>}
        />
        <Metric label="FINAL NET WORTH" value="NT$3,400,000" change="AGE 88 · 2078" />
      </MetricGroup>
    </GalleryModule>
  </GallerySection>
);

const StatusSection: React.FC = () => (
  <GallerySection number="03" title="Status & Badge">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <GalleryModule label="STATUS">
        <div className="flex flex-wrap gap-4">
          <StatusGlyph type="verified" label="VERIFIED" />
          <StatusGlyph type="active" label="ACTIVE" />
          <StatusGlyph type="waiting" label="WAITING" />
          <StatusGlyph type="review" label="REVIEW" />
          <StatusGlyph type="error" label="ERROR" />
        </div>
      </GalleryModule>
      <GalleryModule label="BADGE">
        <div className="flex flex-wrap gap-2">
          <Badge>ETF</Badge>
          <Badge>BROKERAGE</Badge>
          <Badge>PROJECT</Badge>
          <Badge>TAX</Badge>
          <Badge variant="destructive">OVERDUE</Badge>
        </div>
      </GalleryModule>
      <GalleryModule label="PERIOD BADGE">
        <div className="flex flex-wrap gap-2">
          <PeriodBadge label="PERIOD" period="SEP 2026" />
          <PeriodBadge label="REPORT" period="2026 Q3" />
        </div>
      </GalleryModule>
    </div>
  </GallerySection>
);

const DefinitionSection: React.FC = () => (
  <GallerySection number="04" title="Definition Rows">
    <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
      唯讀的「標籤 / 值」成對清單。專案內唯一的 definition 版型來源；不要在畫面手寫
      <code className="mx-1 font-mono text-xs">&lt;dl&gt;</code>。
    </p>
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <GalleryModule label="LIST — 預設；標籤在上，md 以上轉兩欄">
        <DefinitionRows
          items={[
            { label: 'ENGINE VERSION', value: 'v1' },
            { label: 'CALCULATED AT', value: '2026-03-02' },
          ]}
        />
      </GalleryModule>
      <GalleryModule label="ROW — 值靠右，可加分隔線">
        <DefinitionRows
          layout="row"
          divided
          items={[
            { label: 'NET WORTH', value: 'NT$4,812,430' },
            { label: 'NET CASH FLOW', value: '-NT$12,300' },
          ]}
        />
      </GalleryModule>
      <GalleryModule label="INLINE — 單行緊接，適合事件明細">
        <DefinitionRows layout="inline" items={[{ label: '2030–2032', value: 'NT$50,000' }]} />
      </GalleryModule>
    </div>
  </GallerySection>
);

export const GalleryValuesBody: React.FC = () => (
  <>
    <GalleryGroup label="VALUES & STATUS" />
    <NumberSection />
    <MetricSection />
    <StatusSection />
    <DefinitionSection />
  </>
);
