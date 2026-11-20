import React from 'react';

import { type StatementRow, StatementTable } from '@/ui/components/statement/StatementTable';

import { GalleryModule } from './GalleryScaffold';

/**
 * 報表列在兩種寬度下的同一份結構：桌機是兩欄表，行動版是同一階層的一列一筆。
 * 樣本刻意包含漂移（金額兩行）、終結列與可摺疊的群組列。
 */
const STATEMENT_ROWS: StatementRow[] = [
  {
    key: 'section:income',
    label: '收入',
    amountText: null,
    tone: 'section',
    level: 0,
    children: [
      {
        key: 'income:salary',
        label: '薪資',
        amountText: 'NT$85,000',
        tone: 'group',
        level: 1,
        children: [
          {
            key: 'income:salary:charles',
            label: '薪資 › Charles',
            amountText: 'NT$85,000',
            tone: 'detail',
            level: 2,
            children: [],
          },
        ],
      },
    ],
  },
  {
    key: 'total:income',
    label: '收入合計',
    amountText: 'NT$85,000',
    tone: 'subtotal',
    level: 0,
    children: [],
  },
  {
    key: 'total:expense',
    label: '支出合計',
    amountText: 'NT$88,000',
    amountWarning: true,
    amountDetail: '期初 NT$85,000 → 期末 NT$88,000',
    tone: 'group',
    level: 1,
    children: [],
  },
  {
    key: 'terminus',
    label: '本期淨利',
    amountText: '-NT$3,000',
    tone: 'terminus',
    level: 0,
    children: [],
  },
];

export const StatementRowsModule: React.FC = () => {
  const [collapsed, setCollapsed] = React.useState<ReadonlySet<string>>(new Set());
  const onToggle = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  return (
    <GalleryModule label="STATEMENT ROWS (TABLE ABOVE md · LIST BELOW)">
      <StatementTable
        rows={STATEMENT_ROWS}
        collapsed={collapsed}
        onToggle={onToggle}
        testId="gallery-statement"
      />
    </GalleryModule>
  );
};
