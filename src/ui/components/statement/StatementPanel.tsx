import React from 'react';

import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { MobileDataList } from '@/ui/components/data-table';
import { subSectionTitleClass } from '@/ui/components/eyebrow';

import { type StatementMetric } from './statementMetrics';

interface StatementPanelProps {
  /** 行動版堆疊時的報表標題（桌機由 tabs 承擔）。 */
  title?: string;
  /** 三個摘要指標；缺席時整區不渲染（空狀態用：保留標題、省略指標，不顯示歸零假象）。 */
  metrics?: StatementMetric[];
  children: React.ReactNode;
  testId?: string;
}

/**
 * 一張報表的排版外框：標題＋摘要指標列＋表格內容。內容由呼叫端提供，讓同一份外框
 * 同時服務報表檢視與月度關帳——兩個表面因此長得一樣。標題在每個寬度都在：tabs 是
 * 導覽，標題是內容本身。
 *
 * 指標列在 `<md` 改為 label 左／值右的堆疊列：三格在兩欄裡會留下一格孤兒與一條
 * 沒有對應的直分隔線，堆疊後與下方的列式表同一套讀法。
 */
export const StatementPanel: React.FC<StatementPanelProps> = ({
  title,
  metrics,
  children,
  testId,
}) => {
  // The two representations differ only in layout, so the metric props are
  // mapped once instead of being copied per branch.
  const metricProps = (item: StatementMetric) => ({
    label: item.label,
    value: item.value,
    animatedValue: item.animatedValue,
    animateFormat: item.animateFormat,
    animateOnMount: true,
    tone: item.tone,
    change: item.change,
    changeTone: item.changeTone,
  });

  return (
    <div className="space-y-4" data-testid={testId}>
      {title !== undefined && <p className={subSectionTitleClass}>{title}</p>}
      {metrics !== undefined && (
        <>
          <MobileDataList
            className="space-y-0 divide-y divide-border"
            data-testid={testId === undefined ? undefined : `${testId}-metrics-stacked`}
          >
            {metrics.map((item) => (
              <Metric key={item.key} layout="stacked" {...metricProps(item)} />
            ))}
          </MobileDataList>
          <div className="hidden md:block">
            <MetricGroup columns={3} lastSpansFull>
              {metrics.map((item) => (
                <Metric key={item.key} testId={item.testId} {...metricProps(item)} />
              ))}
            </MetricGroup>
          </div>
        </>
      )}
      {children}
    </div>
  );
};
