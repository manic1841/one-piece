import React from 'react';

import { toast } from 'sonner';

import { ArrowRight, Search, Settings } from 'lucide-react';

import { ActivityList, ActivityRow } from '@/ui/components/ActivityList';
import { Avatar } from '@/ui/components/Avatar';
import { CliProgress } from '@/ui/components/CliProgress';
import { Divider } from '@/ui/components/Divider';
import { EmptyState } from '@/ui/components/EmptyState';
import { FinancialNumber } from '@/ui/components/FinancialNumber';
import { PageHeader } from '@/ui/components/PageHeader';
import { Radio, RadioGroup } from '@/ui/components/RadioGroup';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Toolbar } from '@/ui/components/Toolbar';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/ui/components/ui/accordion';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { Checkbox } from '@/ui/components/ui/checkbox';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/ui/components/ui/command';
import { Switch } from '@/ui/components/ui/switch';
import { ConfirmDialogBody } from '@/ui/features/app/confirm/ConfirmDialogBody';
import type { ConfirmOptions } from '@/ui/features/app/confirm/resolveConfirmOptions';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';
import CommandPalette from '@/ui/features/app/layout/CommandPalette';
import { DrawerSection } from './GalleryDrawer';
import { GalleryModule, GallerySection } from './GalleryScaffold';

const EmptySection: React.FC = () => (
  <GallerySection number="13" title="Empty State">
    <GalleryModule label="NO TRANSACTIONS">
      <EmptyState
        title="NO TRANSACTIONS"
        description="No transactions have been recorded for this period."
        action={<Button>+ ADD TRANSACTION</Button>}
      />
    </GalleryModule>
  </GallerySection>
);

const LoadingSection: React.FC = () => (
  <GallerySection number="14" title="Loading & Skeleton">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <GalleryModule label="FINANCIAL NUMBER">
        <Skeleton className="h-8 w-3/5" />
        <Skeleton className="mt-3 w-1/3" />
      </GalleryModule>
      <GalleryModule label="GENERATING REPORTS">
        <CliProgress
          command="generate-reports --period SEP-2026"
          value={62}
          statusText="Generating September financial statements..."
        />
      </GalleryModule>
    </div>
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
    <GallerySection number="17" title="Confirmation">
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

const ActivitySection: React.FC = () => (
  <GallerySection number="25" title="Activity List">
    <GalleryModule label="RECENT ACTIVITY">
      <ActivityList>
        <ActivityRow date="SEP 18" title="Salary Received" meta="Main Bank" amount="+NT$85,000" tone="positive" />
        <ActivityRow date="SEP 17" title="ETF Purchase" meta="Brokerage" amount="-NT$20,000" tone="negative" />
        <ActivityRow date="SEP 16" title="Dividend Received" meta="Brokerage" amount="+NT$8,420" tone="positive" />
      </ActivityList>
    </GalleryModule>
  </GallerySection>
);

const UserSection: React.FC = () => (
  <GallerySection number="26" title="Avatar & User Menu">
    <GalleryModule label="USER">
      <div className="flex items-center gap-4">
        <Avatar initials="CY" />
        <div>
          <p className="text-sm font-medium">Celine Yang</p>
          <p className="font-mono text-[11px] text-muted-foreground">celine@onepiece.app</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="icon" aria-label="Settings"><Settings size={16} /></Button>
          <Button variant="text">Log out</Button>
        </div>
      </div>
    </GalleryModule>
  </GallerySection>
);

const SwitchSection: React.FC = () => {
  const [reconcile, setReconcile] = React.useState(true);
  const [notify, setNotify] = React.useState(false);

  return (
    <GallerySection number="28" title="Toggle / Switch">
      <GalleryModule label="SETTINGS">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Automatic reconciliation</span>
            <Switch
              checked={reconcile}
              onCheckedChange={setReconcile}
              aria-label="Automatic reconciliation"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Notifications</span>
            <Switch checked={notify} onCheckedChange={setNotify} aria-label="Notifications" />
          </div>
        </div>
      </GalleryModule>
    </GallerySection>
  );
};

const CheckboxSection: React.FC = () => {
  const [etf, setEtf] = React.useState(true);
  const [dividend, setDividend] = React.useState(false);
  const toBoolean = (checked: boolean | 'indeterminate') => checked === true;

  return (
    <GallerySection number="29" title="CheckBox / Selection">
      <GalleryModule label="DATA SELECTION">
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={etf}
              onCheckedChange={(checked) => setEtf(toBoolean(checked))}
              aria-label="ETF Purchase"
            />
            ETF Purchase
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Checkbox
              checked={dividend}
              onCheckedChange={(checked) => setDividend(toBoolean(checked))}
              aria-label="Dividend Received"
            />
            Dividend Received
          </label>
        </div>
      </GalleryModule>
    </GallerySection>
  );
};

const SelectionSection: React.FC<{ cadence: string; onCadenceChange: (value: string) => void }> = ({
  cadence,
  onCadenceChange,
}) => (
  <GallerySection number="30" title="Radio / Single Selection">
    <GalleryModule label="CADENCE">
      <RadioGroup aria-label="Cadence" name="cadence" value={cadence} onValueChange={onCadenceChange}>
        <Radio value="monthly" label="Monthly" />
        <Radio value="quarterly" label="Quarterly" />
        <Radio value="yearly" label="Yearly" />
      </RadioGroup>
    </GalleryModule>
  </GallerySection>
);

const AccordionSection: React.FC = () => (
  <GallerySection number="31" title="Accordion / Collapsible Section">
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
            <p className="font-mono text-sm text-muted-foreground">No reconciliation entries yet.</p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  </GallerySection>
);

const AlertSection: React.FC = () => (
  <GallerySection number="32" title="Alert / Inline Message">
    <Alert variant="warning">
      <StatusGlyph type="review" label="REVIEW" />
      <AlertDescription>Brokerage ending balance differs from ledger by NT$1,240.</AlertDescription>
      <Button variant="text" className="ml-auto shrink-0">
        Review
        <ArrowRight size={16} aria-hidden="true" />
      </Button>
    </Alert>
  </GallerySection>
);

const DividerSection: React.FC = () => (
  <GallerySection number="33" title="Divider">
    <GalleryModule label="BALANCE">
      <p className="font-mono text-[11px] uppercase tracking-heading text-muted-foreground">
        ASSETS
      </p>
      <FinancialNumber className="mt-2" value="NT$5,420,000" size="large" />
      <Divider className="my-4" />
      <p className="font-mono text-[11px] uppercase tracking-heading text-muted-foreground">
        LIABILITIES
      </p>
      <FinancialNumber className="mt-2" value="NT$598,680" size="large" />
    </GalleryModule>
  </GallerySection>
);

const PageChromeSection: React.FC = () => (
  <GallerySection number="34" title="Page Header">
    <div className="space-y-6">
      <PageHeader
        title="TRANSACTIONS"
        description="Track and review household financial activity."
        actions={<Button>+ ADD TRANSACTION</Button>}
      />
      <Toolbar
        actions={
          <>
            <Button variant="outline" size="sm">EDIT</Button>
            <Button variant="destructive" size="sm">DELETE</Button>
            <Button size="sm">+ ADD TRANSACTION</Button>
          </>
        }
      >
        <span className="font-mono text-[11px] uppercase text-muted-foreground">
          5 SELECTED
        </span>
      </Toolbar>
    </div>
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
    <GallerySection number="44" title="Search / Command Access">
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

export const GalleryStatesBody: React.FC<{ cadence: string; onCadenceChange: (value: string) => void }> = ({
  cadence,
  onCadenceChange,
}) => (
  <>
    <EmptySection />
    <LoadingSection />
    <DrawerSection />
    <ConfirmationSection />
    <ActivitySection />
    <UserSection />
    <SwitchSection />
    <CheckboxSection />
    <SelectionSection cadence={cadence} onCadenceChange={onCadenceChange} />
    <AccordionSection />
    <AlertSection />
    <DividerSection />
    <PageChromeSection />
    <CommandSection />
  </>
);
