import React, { useState } from 'react';

import { AlertTriangle } from 'lucide-react';

import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';

import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  DataTableScrollArea,
  NumberCell,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { REPORT_VIEW_TITLES } from '@/ui/constants/report/reportViewLabels';
import {
  type BalanceSheetData,
  type BalanceSheetGroup,
  type CashFlowData,
  type IncomeStatementData,
} from '../hooks/useCloseFinancialReports';
import { formatCurrency } from '@/ui/utils';

import { useCloseFinancialReports } from '../hooks/useCloseFinancialReports';

const STATEMENT_COLUMN_WIDTHS = [22, 14, 64] as const;

const statementTitleClass =
  'text-[13px] font-semibold uppercase tracking-[0.08em] text-foreground';

interface StatementRowItem {
  code: string;
  label: string;
  amount: number;
  subItems?: StatementRowItem[];
}

const StatementRows: React.FC<{ items: StatementRowItem[] }> = ({ items }) => (
  <>
    {items.map((item) => (
      <StatementRow key={item.code} item={item} />
    ))}
  </>
);

const StatementRow: React.FC<{ item: StatementRowItem }> = ({ item }) => {
  const [isExpanded, setIsExpanded] = useState(
    item.subItems !== undefined && item.subItems.length > 0,
  );
  const hasSubItems = item.subItems !== undefined && item.subItems.length > 0;

  return (
    <>
      <DataTableRow interactive={hasSubItems} onClick={() => hasSubItems && setIsExpanded(!isExpanded)}>
        <DataTableCell>
          <span className={hasSubItems ? 'font-medium text-foreground' : 'text-muted-foreground'}>
            {item.label}
          </span>
        </DataTableCell>
        <NumberCell value={item.amount} format={formatCurrency} />
        <DataTableCell className="text-xs text-muted-foreground">
          {hasSubItems ? (isExpanded ? '−' : '+') : ''}
        </DataTableCell>
      </DataTableRow>
      {isExpanded && hasSubItems && <StatementRows items={item.subItems!} />}
    </>
  );
};

const IncomeStatementView: React.FC<{ data: IncomeStatementData | null }> = ({ data }) => {
  if (!data) return null;
  return (
    <div className="space-y-6" data-testid="close-income-statement">
      <div className="flex items-baseline justify-between">
        <p className={statementTitleClass}>{MONTHLY_CLOSE_LABELS.INCOME_SECTION}</p>
        <p className="text-sm text-muted-foreground">
          {MONTHLY_CLOSE_LABELS.INCOME_TOTAL} {formatCurrency(data.incomeTotal)}
        </p>
      </div>
      <DataTableScrollArea>
        <DataTable>
          <DataTableColGroup widths={STATEMENT_COLUMN_WIDTHS} />
          <TableHeader>
            <DataTableHeadRow>
              <DataTableHeadCell>{MONTHLY_CLOSE_LABELS.STATEMENT_ITEM}</DataTableHeadCell>
              <DataTableHeadCell align="number">
                {MONTHLY_CLOSE_LABELS.STATEMENT_AMOUNT}
              </DataTableHeadCell>
              <DataTableHeadCell>{''}</DataTableHeadCell>
            </DataTableHeadRow>
          </TableHeader>
          <TableBody>
            <StatementRows items={data.incomeItems} />
          </TableBody>
        </DataTable>
      </DataTableScrollArea>
      <div className="flex items-baseline justify-between">
        <p className={statementTitleClass}>{MONTHLY_CLOSE_LABELS.EXPENSE_SECTION}</p>
        <p className="text-sm text-muted-foreground">
          {MONTHLY_CLOSE_LABELS.EXPENSE_TOTAL} {formatCurrency(data.expenseTotal)}
        </p>
      </div>
      <DataTableScrollArea>
        <DataTable>
          <DataTableColGroup widths={STATEMENT_COLUMN_WIDTHS} />
          <TableHeader>
            <DataTableHeadRow>
              <DataTableHeadCell>{MONTHLY_CLOSE_LABELS.STATEMENT_ITEM}</DataTableHeadCell>
              <DataTableHeadCell align="number">
                {MONTHLY_CLOSE_LABELS.STATEMENT_AMOUNT}
              </DataTableHeadCell>
              <DataTableHeadCell>{''}</DataTableHeadCell>
            </DataTableHeadRow>
          </TableHeader>
          <TableBody>
            <StatementRows items={data.expenseItems} />
          </TableBody>
        </DataTable>
      </DataTableScrollArea>
      <div className="flex items-baseline justify-end gap-4 border-t border-border pt-4">
        <p className="text-sm font-semibold text-foreground">
          {MONTHLY_CLOSE_LABELS.NET_INCOME} {formatCurrency(data.netIncome)}
        </p>
      </div>
    </div>
  );
};

const BalanceGroupSection: React.FC<{ group: BalanceSheetGroup; calculated?: boolean }> = ({
  group,
  calculated = false,
}) => {
  if (group.total === 0 && group.items.length === 0 && !calculated) return null;
  return (
    <section className="space-y-3 border-b border-border pb-4 last:border-b-0" data-testid="close-balance-group">
      <div className="flex items-baseline justify-between">
        <p className={statementTitleClass}>{group.label}</p>
        <p className="font-mono text-sm tabular-nums text-foreground">
          {formatCurrency(group.total)}
          {calculated && (
            <span className="ml-2 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              {MONTHLY_CLOSE_LABELS.CALCULATED}
            </span>
          )}
        </p>
      </div>
      {group.items.length > 0 && (
        <DataTableScrollArea>
          <DataTable>
            <DataTableColGroup widths={STATEMENT_COLUMN_WIDTHS} />
            <TableHeader>
              <DataTableHeadRow>
                <DataTableHeadCell>{MONTHLY_CLOSE_LABELS.STATEMENT_ITEM}</DataTableHeadCell>
                <DataTableHeadCell align="number">
                  {MONTHLY_CLOSE_LABELS.STATEMENT_AMOUNT}
                </DataTableHeadCell>
                <DataTableHeadCell>{''}</DataTableHeadCell>
              </DataTableHeadRow>
            </TableHeader>
            <TableBody>
              <StatementRows items={group.items} />
            </TableBody>
          </DataTable>
        </DataTableScrollArea>
      )}
    </section>
  );
};

const BalanceSheetView: React.FC<{ data: BalanceSheetData | null }> = ({ data }) => {
  if (!data) return null;
  const equityEntries = Object.entries(data.equity.groups);
  return (
    <div className="space-y-6" data-testid="close-balance-sheet">
      <p className={statementTitleClass}>{MONTHLY_CLOSE_LABELS.ASSETS_SECTION}</p>
      {Object.values(data.assets.groups).map((group) => (
        <BalanceGroupSection key={group.label} group={group} />
      ))}
      <p className={statementTitleClass}>{MONTHLY_CLOSE_LABELS.LIABILITIES_SECTION}</p>
      {Object.values(data.liabilities.groups).map((group) => (
        <BalanceGroupSection key={group.label} group={group} />
      ))}
      <p className={statementTitleClass}>{MONTHLY_CLOSE_LABELS.EQUITY_SECTION}</p>
      {equityEntries.map(([key, group]) => (
        <BalanceGroupSection
          key={key}
          group={group}
          calculated={key === 'netIncome' || key === 'adjustment'}
        />
      ))}
    </div>
  );
};

const CashFlowView: React.FC<{ data: CashFlowData | null }> = ({ data }) => {
  if (!data) return null;
  const groups = [
    { key: 'operating', group: data.operating },
    { key: 'investing', group: data.investing },
    { key: 'financing', group: data.financing },
  ];
  return (
    <div className="space-y-6" data-testid="close-cash-flow">
      {groups.map(({ key, group }) => {
        if (group.total === 0 && group.inflowItems.length === 0 && group.outflowItems.length === 0)
          return null;
        return (
          <section key={key} className="space-y-3" data-testid="close-cash-group">
            <p className={statementTitleClass}>{group.label}</p>
            <DataTableScrollArea>
              <DataTable>
                <DataTableColGroup widths={STATEMENT_COLUMN_WIDTHS} />
                <TableHeader>
                  <DataTableHeadRow>
                    <DataTableHeadCell>{MONTHLY_CLOSE_LABELS.STATEMENT_ITEM}</DataTableHeadCell>
                    <DataTableHeadCell align="number">
                      {MONTHLY_CLOSE_LABELS.STATEMENT_AMOUNT}
                    </DataTableHeadCell>
                    <DataTableHeadCell>{''}</DataTableHeadCell>
                  </DataTableHeadRow>
                </TableHeader>
                <TableBody>
                  <StatementRows items={[...group.inflowItems, ...group.outflowItems]} />
                </TableBody>
              </DataTable>
            </DataTableScrollArea>
          </section>
        );
      })}
      <div className="flex items-baseline justify-end gap-4 border-t border-border pt-4">
        <p className="text-sm font-semibold text-foreground">
          {MONTHLY_CLOSE_LABELS.NET_CASH_CHANGE} {formatCurrency(data.netCashChange)}
        </p>
        <p className="text-sm text-muted-foreground">
          {MONTHLY_CLOSE_LABELS.ACTUAL_BALANCE} {formatCurrency(data.actualBalance)}
        </p>
      </div>
    </div>
  );
};

interface CloseFinancialReportsProps {
  householdId: string;
  year: number;
  month: number;
  onContinue: () => void;
  onGenerate: () => void;
  onBack: () => void;
  confirming: boolean;
  isGenerated: boolean;
}

export const CloseFinancialReports: React.FC<CloseFinancialReportsProps> = ({
  householdId,
  year,
  month,
  onContinue,
  onGenerate,
  onBack,
  confirming,
  isGenerated,
}) => {
  const {
    view,
    setView,
    incomeStatement,
    balanceSheet,
    cashFlow,
    timestamps,
    missingCategoryNames,
    isLoading,
    error,
  } = useCloseFinancialReports({ householdId, year, month });

  const showReadinessGate = missingCategoryNames.length > 0;
  const showAdjustmentWarning = Math.abs(cashFlow?.adjustment ?? 0) > 1000;
  const hasAnyData = incomeStatement !== null || balanceSheet !== null || cashFlow !== null;

  return (
    <div className="space-y-6 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.EVIDENCE_LABEL}
          </p>
          <h2 className="text-[22px] font-medium leading-tight text-foreground">
            {MONTHLY_CLOSE_LABELS.FINANCIAL_REPORTS_TITLE}
          </h2>
          <p className="text-xs text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.FINANCIAL_REPORTS_NOTE}
          </p>
        </div>
        <span className="font-mono text-[13px] tabular-nums text-muted-foreground">
          {isGenerated ? MONTHLY_CLOSE_LABELS.REPORTS_GENERATED : MONTHLY_CLOSE_LABELS.FINANCIAL_REPORTS_TITLE}
        </span>
      </div>

      {error && (
        <Alert variant="destructive" className="border-negative/20 bg-negative/10">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showReadinessGate && (
        <Alert className="border-warning/30 bg-warning/5 text-foreground">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription>
            {MONTHLY_CLOSE_LABELS.READINESS_BLOCKED}
            {missingCategoryNames.join('、')}
          </AlertDescription>
        </Alert>
      )}

      {showAdjustmentWarning && (
        <Alert className="border-warning/30 bg-warning/5 text-foreground">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertDescription>{MONTHLY_CLOSE_LABELS.ADJUSTMENT_WARNING}</AlertDescription>
        </Alert>
      )}

      {isGenerated && (
        <div
          data-testid="reports-generated-panel"
          className="space-y-2 rounded-lg border border-positive/30 bg-positive/10 px-4 py-3"
        >
          <p className="text-sm font-bold text-foreground">{MONTHLY_CLOSE_LABELS.REPORTS_GENERATED}</p>
          <p className="text-xs text-muted-foreground">
            {MONTHLY_CLOSE_LABELS.GENERATED_AT}
            {timestamps.incomeStatement ? ` ｜ ${REPORT_VIEW_TITLES.INCOME_STATEMENT} ${timestamps.incomeStatement}` : ''}
            {timestamps.balanceSheet ? ` ｜ ${REPORT_VIEW_TITLES.BALANCE_SHEET} ${timestamps.balanceSheet}` : ''}
            {timestamps.cashFlow ? ` ｜ ${REPORT_VIEW_TITLES.CASH_FLOW} ${timestamps.cashFlow}` : ''}
          </p>
          <div className="flex justify-end">
            <Button variant="link" size="sm" onClick={onContinue} className="h-auto p-0 text-xs font-semibold uppercase tracking-[0.08em]">
              {MONTHLY_CLOSE_LABELS.CONTINUE}
            </Button>
          </div>
        </div>
      )}

      {hasAnyData && (
        <Tabs value={view} onValueChange={(value) => setView(value as typeof view)} className="space-y-4">
          <TabsList className="hidden md:inline-flex">
            {(Object.keys(REPORT_VIEW_TITLES) as Array<keyof typeof REPORT_VIEW_TITLES>).map((viewId) => (
              <TabsTrigger key={viewId} value={viewId}>
                {REPORT_VIEW_TITLES[viewId]}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent forceMount value="INCOME_STATEMENT" className="md:hidden md:data-[state=active]:block">
            <div className="md:hidden">
              <p className={statementTitleClass}>{REPORT_VIEW_TITLES.INCOME_STATEMENT}</p>
            </div>
            <IncomeStatementView data={incomeStatement} />
          </TabsContent>
          <TabsContent forceMount value="BALANCE_SHEET" className="md:hidden md:data-[state=active]:block">
            <div className="md:hidden">
              <p className={statementTitleClass}>{REPORT_VIEW_TITLES.BALANCE_SHEET}</p>
            </div>
            <BalanceSheetView data={balanceSheet} />
          </TabsContent>
          <TabsContent forceMount value="CASH_FLOW" className="md:hidden md:data-[state=active]:block">
            <div className="md:hidden">
              <p className={statementTitleClass}>{REPORT_VIEW_TITLES.CASH_FLOW}</p>
            </div>
            <CashFlowView data={cashFlow} />
          </TabsContent>
        </Tabs>
      )}

      {!hasAnyData && !error && !showReadinessGate && (
        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
          {MONTHLY_CLOSE_LABELS.NO_DATA}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-[26px]">
        <Button
          variant="text"
          size="sm"
          onClick={onBack}
          disabled={confirming}
          className="text-xs font-semibold uppercase tracking-[0.08em]"
        >
          {MONTHLY_CLOSE_LABELS.BACK_TO_CURRENT}
        </Button>
        {!isGenerated && (
          <Button
            data-testid="generate-reports"
            onClick={onGenerate}
            disabled={confirming || showReadinessGate || isLoading}
            className="h-[38px] px-[18px] text-xs font-semibold uppercase tracking-[0.08em]"
          >
            {confirming || isLoading ? MONTHLY_CLOSE_LABELS.LOADING : MONTHLY_CLOSE_LABELS.GENERATE_REPORTS}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CloseFinancialReports;
