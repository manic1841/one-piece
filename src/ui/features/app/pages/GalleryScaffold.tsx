import React from 'react';

import { ActivityList, ActivityRow } from '@/ui/components/ActivityList';
import { Module } from '@/ui/components/Module';
import { PageSection } from '@/ui/components/PageSection';

export const GallerySection = PageSection;
export const GalleryModule = Module;

export const GalleryIntro: React.FC = () => (
  <div className="pb-10">
    <p className="font-mono text-[11px] uppercase tracking-heading text-muted-foreground">
      DESIGN SYSTEM / COMPONENT GALLERY
    </p>
    <h2 className="mt-2 text-3xl font-bold tracking-display">Component Gallery</h2>
    <p className="mt-3 max-w-2xl text-sm text-muted-foreground leading-relaxed">
      Engineering-first household financial operating system. Dark-first, data-driven, semantic
      color, and structure over cardization. Rendered from the real global components.
    </p>
  </div>
);

const SAMPLE_TRANSACTION_ROWS = [
  { id: 'sample-1', date: 'SEP 18', title: 'Salary Received', meta: 'Main Bank', amount: '+NT$85,000', tone: 'positive' as const },
  { id: 'sample-2', date: 'SEP 17', title: 'ETF Purchase', meta: 'Brokerage', amount: '-NT$20,000', tone: 'negative' as const },
  { id: 'sample-3', date: 'SEP 16', title: 'Dividend Received', meta: 'Brokerage', amount: '+NT$8,420', tone: 'positive' as const },
];

export const RowList: React.FC<{ withMeta?: boolean }> = ({ withMeta = false }) => (
  <ActivityList>
    {SAMPLE_TRANSACTION_ROWS.map((row) => (
      <ActivityRow
        key={row.id}
        date={row.date}
        title={row.title}
        meta={withMeta ? row.meta : undefined}
        amount={row.amount}
        tone={row.tone}
      />
    ))}
  </ActivityList>
);
