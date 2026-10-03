import React from 'react';

import { ArrowRight, MoreVertical, Plus, Search, Settings, X } from 'lucide-react';
import { toast } from 'sonner';

import { Avatar } from '@/ui/components/Avatar';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { ConfirmDialogBody } from '@/ui/components/confirm/ConfirmDialogBody';
import type { ConfirmOptions } from '@/ui/components/confirm/resolveConfirmOptions';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { DrawerPanel } from '@/ui/components/drawer/DrawerPanel';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/ui/components/ui/accordion';
import { Button } from '@/ui/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/ui/components/ui/command';
import { Sheet, SheetContent, SheetTrigger } from '@/ui/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/components/ui/tooltip';
import CommandPalette from '@/ui/features/app/layout/CommandPalette';

import { GalleryGroup, GalleryModule, GallerySection } from './GalleryScaffold';

const ButtonSection: React.FC = () => (
  <GallerySection number="21" title="Button & Action">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <GalleryModule label="HIERARCHY">
        <div className="flex flex-wrap items-center gap-3">
          <Button>CLOSE PERIOD</Button>
          <Button variant="outline">Cancel</Button>
          <Button variant="text">
            View details
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </GalleryModule>
      <GalleryModule label="ICON BUTTON">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Add">
            <Plus size={16} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="More">
            <MoreVertical size={16} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings size={16} />
          </Button>
          <Button variant="ghost" size="icon" aria-label="Search">
            <Search size={16} />
          </Button>
          <Button variant="outline" size="icon" aria-label="Close">
            <X size={16} />
          </Button>
        </div>
      </GalleryModule>
    </div>
  </GallerySection>
);

const TooltipSection: React.FC = () => (
  <GallerySection number="22" title="Tooltip">
    <div className="flex min-h-24 items-center justify-center rounded-lg border border-border bg-card">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Explain">
            ?
          </Button>
        </TooltipTrigger>
        <TooltipContent>Calculated from Jan 1 to Oct 2, 2026</TooltipContent>
      </Tooltip>
    </div>
  </GallerySection>
);

const AccordionSection: React.FC = () => (
  <GallerySection number="23" title="Accordion / Collapsible Section">
    <Accordion type="single" collapsible>
      <AccordionItem value="details">
        <AccordionTrigger>ACCOUNT DETAILS</AccordionTrigger>
        <AccordionContent>
          <div className="border-b border-border py-3">
            <p className="font-mono text-[10px] uppercase text-muted-foreground">ACCOUNT TYPE</p>
            <p className="mt-1 font-mono text-sm">BROKERAGE</p>
          </div>
          <div className="border-b border-border py-3">
            <p className="font-mono text-[10px] uppercase text-muted-foreground">CURRENCY</p>
            <p className="mt-1 font-mono text-sm">TWD</p>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="history">
        <AccordionTrigger>RECONCILIATION HISTORY</AccordionTrigger>
        <AccordionContent>
          <div className="border-b border-border py-3">
            <p className="font-mono text-sm text-muted-foreground">
              No reconciliation entries yet.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </GallerySection>
);

const TabsSection: React.FC = () => (
  <GallerySection number="24" title="Tabs">
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">OVERVIEW</TabsTrigger>
        <TabsTrigger value="holdings">HOLDINGS</TabsTrigger>
        <TabsTrigger value="history">HISTORY</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="pt-4 text-sm text-muted-foreground">
          Summary of the selected period and its reconciliation status.
        </p>
      </TabsContent>
      <TabsContent value="holdings">
        <p className="pt-4 text-sm text-muted-foreground">
          Positions held at the end of the period.
        </p>
      </TabsContent>
      <TabsContent value="history">
        <p className="pt-4 text-sm text-muted-foreground">Prior snapshots and their as-of dates.</p>
      </TabsContent>
    </Tabs>
  </GallerySection>
);

const DELETE_OPTIONS: ConfirmOptions = {
  title: 'Delete transaction?',
  context: 'SEP 17 · ETF Purchase · -NT$20,000',
  consequence: 'This action cannot be undone.',
  confirmLabel: 'DELETE',
};

const CLOSE_OPTIONS: ConfirmOptions = {
  title: 'Close Sep 2026?',
  context: 'All transactions have been reviewed.',
  consequence: 'Reports will be finalized and the period locked.',
  confirmLabel: 'CLOSE PERIOD',
  status: <StatusGlyph type="verified" label="5/5 STEPS COMPLETED" />,
  confirmTone: 'primary',
};

const ConfirmationSection: React.FC = () => {
  const { confirm } = useConfirm();

  return (
    <GallerySection number="25" title="Confirmation">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <GalleryModule label="DIALOG PREVIEW (INLINE)" className="flex flex-col">
          <ConfirmDialogBody
            inline
            options={DELETE_OPTIONS}
            onConfirm={() => {
              confirm(DELETE_OPTIONS).then((confirmed) => {
                if (confirmed) toast('TRANSACTION DELETED');
              });
            }}
            onCancel={() => toast('CANCELLED')}
          />
        </GalleryModule>
        <GalleryModule label="LIVE CONFIRM (INLINE)" className="flex flex-col">
          <ConfirmDialogBody
            inline
            options={CLOSE_OPTIONS}
            onConfirm={() => {
              confirm(CLOSE_OPTIONS).then((confirmed) => {
                if (confirmed) toast('PERIOD CLOSED');
              });
            }}
            onCancel={() => toast('CANCELLED')}
          />
        </GalleryModule>
      </div>
      <p className="mt-3 font-mono text-[11px] text-muted-foreground">
        Inline preview renders ConfirmDialogBody — the same surface the modal shows
      </p>
    </GallerySection>
  );
};

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

const DrawerSection: React.FC = () => (
  <GallerySection number="26" title="Drawer & Detail Panel">
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

const CommandSection: React.FC = () => {
  const [liveOpen, setLiveOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'k' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setLiveOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <GallerySection number="27" title="Search / Command Access">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <GalleryModule label="COMMAND PALETTE (SIMULATED) · CTRL / ⌘ K">
          <Command className="rounded-lg border border-border">
            <CommandInput placeholder="Search or run a command..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="NAVIGATION">
                <CommandItem>→ Open Portfolio</CommandItem>
                <CommandItem>→ Open Monthly Close</CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="ACTIONS">
                <CommandItem>+ Add Transaction</CommandItem>
                <CommandItem>+ Create Project</CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </GalleryModule>
        <GalleryModule label="LIVE PALETTE" className="flex flex-col">
          <p className="font-mono text-[11px] text-muted-foreground">
            Press Ctrl / ⌘ K or click Search to open the real CommandPalette.
          </p>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Search"
              onClick={() => setLiveOpen(true)}
              className="text-muted-foreground"
            >
              <Search size={18} />
            </Button>
            <span className="font-mono text-[11px] text-muted-foreground">CTRL / ⌘ K</span>
          </div>
        </GalleryModule>
      </div>
      <CommandPalette open={liveOpen} onOpenChange={setLiveOpen} />
    </GallerySection>
  );
};

const UserSection: React.FC = () => (
  <GallerySection number="28" title="Avatar & User Menu">
    <GalleryModule label="USER">
      <div className="flex items-center gap-4">
        <Avatar initials="CY" />
        <div>
          <p className="text-sm font-medium">Celine Yang</p>
          <p className="font-mono text-[11px] text-muted-foreground">celine@onepiece.app</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings size={16} />
          </Button>
          <Button variant="text">Log out</Button>
        </div>
      </div>
    </GalleryModule>
  </GallerySection>
);

export const GalleryInteractionBody: React.FC = () => (
  <>
    <GalleryGroup label="ACTIONS & INTERACTION" />
    <ButtonSection />
    <TooltipSection />
    <AccordionSection />
    <TabsSection />
    <ConfirmationSection />
    <DrawerSection />
    <CommandSection />
    <UserSection />
  </>
);
