import React from 'react';

import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { cn } from '@/ui/utils/cn';

import { statementTitleClass } from './StatementTable';
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
 * 一張報表的排版外框：標題（僅行動版）＋ 摘要指標列 ＋ 表格內容。內容由呼叫端提供，
 * 讓同一份外框同時服務報表檢視與月度關帳——兩個表面因此長得一樣。
 */
export const StatementPanel: React.FC<StatementPanelProps> = ({
  title,
  metrics,
  children,
  testId,
}) => (
  <div className="space-y-4" data-testid={testId}>
    {title !== undefined && <p className={cn(statementTitleClass, 'md:hidden')}>{title}</p>}
    {metrics !== undefined && (
      <MetricGroup columns={3} lastSpansFull>
        {metrics.map((item) => (
          <Metric
            key={item.key}
            testId={item.testId}
            label={item.label}
            value={item.value}
            tone={item.tone}
            change={item.change}
            changeTone={item.changeTone}
          />
        ))}
      </MetricGroup>
    )}
    {children}
  </div>
);
