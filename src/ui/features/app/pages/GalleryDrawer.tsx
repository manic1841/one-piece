import React from 'react';

import { Skeleton } from '@/ui/components/Skeleton';
import { Button } from '@/ui/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/ui/components/ui/sheet';
import { DrawerPanel } from '@/ui/features/app/drawer/DrawerPanel';

import { GalleryModule, GallerySection } from './GalleryScaffold';

const TRANSACTION_FIELDS: { label: string; value: React.ReactNode; className?: string }[] = [
  { label: 'DATE', value: 'SEP 17, 2026' },
  { label: 'ACCOUNT', value: 'Brokerage' },
  { label: 'AMOUNT', value: '-NT$20,000', className: 'text-negative' },
  { label: 'CATEGORY', value: 'Investment' },
];

const TRANSACTION_FOOTER = (
  <>
    <Button variant="outline" size="sm">
      Edit
    </Button>
    <Button variant="destructive" size="sm">
      Delete
    </Button>
  </>
);

const TransactionRows = () => (
  <div className="pt-1">
    {TRANSACTION_FIELDS.map((field) => (
      <div key={field.label} className="border-b border-border py-3">
        <p className="font-mono text-[10px] uppercase text-muted-foreground">{field.label}</p>
        <p className={`mt-1 font-mono text-sm ${field.className ?? ''}`}>{field.value}</p>
      </div>
    ))}
  </div>
);

export const DrawerSection: React.FC = () => (
  <GallerySection number="16" title="Drawer & Detail Panel">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <GalleryModule label="OPEN DRAWER (SIMULATED)" className="flex flex-col">
        <div className="relative h-[420px] overflow-hidden rounded-md border border-border bg-elevated">
          <div className="flex h-full flex-col gap-3 p-5 opacity-40 saturate-50">
            <Skeleton className="h-6 w-2/5" />
            <Skeleton className="h-4 w-3/5" />
            <div className="mt-2 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-4/5" />
              <Skeleton className="h-10 w-4/5" />
              <Skeleton className="h-10 w-3/5" />
              <Skeleton className="h-10 w-3/5" />
              <Skeleton className="h-10 w-3/5" />
              <Skeleton className="h-10 w-2/5" />
            </div>
          </div>
          <div className="absolute inset-y-0 right-0 flex w-[75%] max-w-[240px] flex-col border-l border-border bg-background p-5 shadow-xl">
            <DrawerPanel
              inline
              title="TRANSACTION"
              description="Inspect and edit without leaving context."
              onClose={() => {}}
              footer={TRANSACTION_FOOTER}
            >
              <TransactionRows />
            </DrawerPanel>
          </div>
        </div>
      </GalleryModule>
      <GalleryModule label="LIVE DRAWER" className="flex flex-col">
        <div className="flex flex-1 flex-col items-start justify-center gap-3">
          <div>
            <p className="text-sm font-medium">ETF Purchase</p>
            <p className="font-mono text-[11px] text-muted-foreground">
              SEP 17, 2026 · Brokerage · <span className="text-negative">-NT$20,000</span>
            </p>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Open drawer</Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-[360px]">
              <DrawerPanel
                title="TRANSACTION"
                description="Inspect and edit without leaving context."
                footer={TRANSACTION_FOOTER}
              >
                <TransactionRows />
              </DrawerPanel>
            </SheetContent>
          </Sheet>
        </div>
      </GalleryModule>
    </div>
    <p className="mt-3 font-mono text-[11px] text-muted-foreground">
      Simulated preview and live drawer render DrawerPanel — the same surface
    </p>
  </GallerySection>
);
