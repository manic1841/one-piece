import React from 'react';

import { ArrowRight, MoreVertical, Plus, Search, Settings, X } from 'lucide-react';

import { FinancialNumber } from '@/ui/components/FinancialNumber';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { BarChart } from '@/ui/components/charts/BarChart';
import {
  DataTable,
  DataTableCell,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  DataTableScrollArea,
  MobileDataField,
  MobileDataList,
  MobileDataRow,
} from '@/ui/components/data-table';
import { CurrencyInput } from '@/ui/components/form/CurrencyInput';
import { DateInput } from '@/ui/components/form/DateInput';
import { SelectField } from '@/ui/components/form/Select';
import { TextInput } from '@/ui/components/form/TextInput';
import { Badge } from '@/ui/components/ui/badge';
import { Button } from '@/ui/components/ui/button';
import { TableBody, TableHeader } from '@/ui/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/components/ui/tooltip';

import { GalleryIntro, GalleryModule, GallerySection } from './GalleryScaffold';
import { ToastSection } from './GalleryToasts';

const SAMPLE_TABLE_ROWS = [
  {
    id: 't-1',
    date: 'SEP 18',
    description: 'Salary Received',
    account: 'Main Bank',
    amount: '+NT$85,000',
    tone: 'positive' as const,
  },
  {
    id: 't-2',
    date: 'SEP 17',
    description: 'ETF Purchase',
    account: 'Brokerage',
    amount: '-NT$20,000',
    tone: 'negative' as const,
  },
  {
    id: 't-3',
    date: 'SEP 16',
    description: 'Dividend Received',
    account: 'Brokerage',
    amount: '+NT$8,420',
    tone: 'positive' as const,
  },
];

const FieldDemo: React.FC<{ label: string; error?: boolean; children: React.ReactNode }> = ({
  label,
  error,
  children,
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
      {label}
    </span>
    {children}
    {error && <StatusGlyph type="error" label="Balance does not match ledger" />}
  </div>
);

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
  </GallerySection>
);

const DataTableSection: React.FC = () => (
  <GallerySection number="03" title="Data Table">
    <GalleryModule label="TRANSACTIONS">
      <DataTableScrollArea className="hidden md:block">
        <DataTable>
          <TableHeader>
            <DataTableHeadRow>
              <DataTableHeadCell>DATE</DataTableHeadCell>
              <DataTableHeadCell>DESCRIPTION</DataTableHeadCell>
              <DataTableHeadCell>ACCOUNT</DataTableHeadCell>
              <DataTableHeadCell align="number">AMOUNT</DataTableHeadCell>
            </DataTableHeadRow>
          </TableHeader>
          <TableBody>
            {SAMPLE_TABLE_ROWS.map((row) => (
              <DataTableRow key={row.id}>
                <DataTableCell>{row.date}</DataTableCell>
                <DataTableCell>{row.description}</DataTableCell>
                <DataTableCell>{row.account}</DataTableCell>
                <DataTableCell
                  align="number"
                  className={row.tone === 'positive' ? 'text-positive' : 'text-negative'}
                >
                  {row.amount}
                </DataTableCell>
              </DataTableRow>
            ))}
          </TableBody>
        </DataTable>
      </DataTableScrollArea>
      <MobileDataList className="md:hidden">
        {SAMPLE_TABLE_ROWS.map((row) => (
          <MobileDataRow key={row.id}>
            <MobileDataField label="DATE">{row.date}</MobileDataField>
            <MobileDataField label="DESCRIPTION">{row.description}</MobileDataField>
            <MobileDataField label="AMOUNT">
              <span className="font-mono tabular-nums">{row.amount}</span>
            </MobileDataField>
          </MobileDataRow>
        ))}
      </MobileDataList>
    </GalleryModule>
  </GallerySection>
);

const StatusSection: React.FC = () => (
  <GallerySection number="04" title="Status & Badge">
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
    </div>
  </GallerySection>
);

const BAR_CHART_LABELS = ['FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];
const BAR_HEIGHTS = [38, 48, 45, 62, 58, 70, 67, 82];

const SectionModuleSection: React.FC = () => (
  <GallerySection number="05" title="Section & Module">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
          12M NET WORTH
        </p>
        <div className="my-4 h-px bg-border" />
        <GalleryModule label="TREND">
          <BarChart
            labels={BAR_CHART_LABELS}
            series={[{ tone: 'neutral', values: BAR_HEIGHTS }]}
            highlightIndex={BAR_HEIGHTS.length - 1}
            height={150}
            ariaLabel="12 month net worth trend"
          />
        </GalleryModule>
      </div>
      <GalleryModule label="MONTHLY CLOSE">
        <div className="space-y-3">
          <StatusGlyph type="verified" label="ACCOUNTS · 3/3" />
          <div className="h-px bg-border" />
          <StatusGlyph type="verified" label="LEDGER · 128 ENTRIES" />
          <div className="h-px bg-border" />
          <StatusGlyph type="waiting" label="REPORTS · WAITING" />
        </div>
        <div className="mt-5">
          <Button variant="text">
            View close
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </div>
      </GalleryModule>
    </div>
  </GallerySection>
);

const ButtonSection: React.FC = () => (
  <GallerySection number="06" title="Button & Action">
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

const InputSection: React.FC = () => (
  <GallerySection number="07" title="Input & Form Field">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <FieldDemo label="ACCOUNT NAME">
        <TextInput defaultValue="Main Bank Account" aria-label="Account name" />
      </FieldDemo>
      <FieldDemo label="AMOUNT">
        <CurrencyInput prefix="NT$" defaultValue={125420} aria-label="Amount" />
      </FieldDemo>
      <FieldDemo label="ENDING BALANCE *" error>
        <CurrencyInput prefix="NT$" defaultValue={124200} error aria-label="Ending balance" />
      </FieldDemo>
      <FieldDemo label="DATE">
        <DateInput defaultValue="2026-10-02" aria-label="Date" />
      </FieldDemo>
    </div>
  </GallerySection>
);

const SelectSection: React.FC = () => (
  <GallerySection number="08" title="Select & Dropdown">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      <FieldDemo label="ACCOUNT">
        <SelectField
          aria-label="Account"
          options={[
            { value: 'main', label: 'Main Bank' },
            { value: 'brokerage', label: 'Brokerage' },
            { value: 'credit', label: 'Credit Card' },
          ]}
        />
      </FieldDemo>
      <FieldDemo label="CATEGORY">
        <SelectField
          aria-label="Category"
          options={[
            { value: 'investment', label: 'Investment' },
            { value: 'income', label: 'Income' },
            { value: 'expense', label: 'Expense' },
          ]}
        />
      </FieldDemo>
      <FieldDemo label="PROJECT">
        <SelectField
          aria-label="Project"
          options={[
            { value: 'retirement', label: 'Retirement' },
            { value: 'home', label: 'Home' },
            { value: 'wedding', label: 'Wedding' },
          ]}
        />
      </FieldDemo>
    </div>
  </GallerySection>
);

const PeriodSection: React.FC = () => (
  <GallerySection number="09" title="Period Picker">
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <GalleryModule label="REPORT PERIOD">
        <YearMonthPicker year={2026} month={9} onYearChange={() => {}} onMonthChange={() => {}} />
      </GalleryModule>
      <GalleryModule label="TRANSACTION DATE">
        <Button variant="outline">OCT 2, 2026</Button>
      </GalleryModule>
    </div>
  </GallerySection>
);

const TooltipSection: React.FC = () => (
  <GallerySection number="12" title="Tooltip">
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

export const GalleryPrimitivesBody: React.FC = () => (
  <>
    <GalleryIntro />
    <NumberSection />
    <MetricSection />
    <DataTableSection />
    <StatusSection />
    <SectionModuleSection />
    <ButtonSection />
    <InputSection />
    <SelectSection />
    <PeriodSection />
    <ToastSection />
    <TooltipSection />
  </>
);
