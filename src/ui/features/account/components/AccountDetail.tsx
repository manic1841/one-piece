import React, { useCallback, useState } from 'react';

import { ChevronDown, ChevronRight } from 'lucide-react';

import { DangerZone } from '@/ui/components/DangerZone';
import { FinancialNumber } from '@/ui/components/FinancialNumber';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { PageSection } from '@/ui/components/PageSection';
import { InteractiveLineChart } from '@/ui/components/charts/InteractiveLineChart';
import { type MonthTrendSeries } from '@/ui/components/charts/monthTrendSeries';
import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  DataTableScrollArea,
  MobileDataField,
  MobileDataList,
  MobileDataRow,
  MobileExpandableRow,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { MONEY_CHANGE_TONE_CLASS } from '@/ui/components/moneyTone';
import { Button } from '@/ui/components/ui/button';
import {
  ACCOUNT_DANGER_LABELS,
  ACCOUNT_DETAIL_LABELS,
  ACCOUNT_HISTORY_COLUMN_LABELS,
  ACCOUNT_HISTORY_COLUMN_WIDTHS,
  ACCOUNT_HOLDING_COLUMN_LABELS,
  ACCOUNT_HOLDING_COLUMN_WIDTHS,
  accountHoldingRowLabel,
  accountHoldingsCountLabel,
} from '@/ui/constants/account/detailLabels';
import { AccountCategoryLabels } from '@/ui/constants/account/label';
import { type AccountWithSnapshot } from '@/ui/features/account/viewmodels/account.vm';
import { type AccountHistoryRowVM } from '@/ui/features/account/viewmodels/accountDetail.vm';
import { formatDate } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

const HoldingsTable: React.FC<{ row: AccountHistoryRowVM }> = ({ row }) => {
  if (row.holdings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{ACCOUNT_DETAIL_LABELS.HOLDINGS_EMPTY_HINT}</p>
    );
  }

  const holdings = row.holdings;

  return (
    <>
      <DataTableScrollArea>
        <DataTable>
          <DataTableColGroup widths={ACCOUNT_HOLDING_COLUMN_WIDTHS} />
          <TableHeader>
            <DataTableHeadRow>
              <DataTableHeadCell>{ACCOUNT_HOLDING_COLUMN_LABELS.SYMBOL}</DataTableHeadCell>
              <DataTableHeadCell>{ACCOUNT_HOLDING_COLUMN_LABELS.NAME}</DataTableHeadCell>
              <DataTableHeadCell align="number">
                {ACCOUNT_HOLDING_COLUMN_LABELS.COST}
              </DataTableHeadCell>
              <DataTableHeadCell align="number">
                {ACCOUNT_HOLDING_COLUMN_LABELS.VALUE}
              </DataTableHeadCell>
              <DataTableHeadCell align="number">
                {ACCOUNT_HOLDING_COLUMN_LABELS.LEVERAGE}
              </DataTableHeadCell>
            </DataTableHeadRow>
          </TableHeader>
          <TableBody>
            {holdings.map((holding) => (
              <DataTableRow key={holding.id}>
                <DataTableCell className="font-mono text-[12px]">{holding.symbol}</DataTableCell>
                <DataTableCell>{holding.name}</DataTableCell>
                <DataTableCell align="number">{holding.costText}</DataTableCell>
                <DataTableCell align="number">{holding.valueText}</DataTableCell>
                <DataTableCell align="number">{holding.leverageText}</DataTableCell>
              </DataTableRow>
            ))}
          </TableBody>
        </DataTable>
      </DataTableScrollArea>
      <MobileDataList>
        {holdings.map((holding) => (
          <MobileDataRow key={holding.id}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-sm">{holding.symbol}</span>
              <span className="font-mono text-sm tabular-nums">{holding.valueText}</span>
            </div>
            <MobileDataField label={ACCOUNT_HOLDING_COLUMN_LABELS.NAME}>
              {holding.name}
            </MobileDataField>
            <MobileDataField label={ACCOUNT_HOLDING_COLUMN_LABELS.COST}>
              <span className="font-mono text-sm tabular-nums">{holding.costText}</span>
            </MobileDataField>
            <MobileDataField label={ACCOUNT_HOLDING_COLUMN_LABELS.LEVERAGE}>
              <span className="font-mono text-sm tabular-nums">{holding.leverageText}</span>
            </MobileDataField>
          </MobileDataRow>
        ))}
      </MobileDataList>
    </>
  );
};

interface AccountDetailProps {
  /** Rename override, which may differ from `account.name` before a refetch. */
  name: string;
  account: AccountWithSnapshot;
  latestRow: AccountHistoryRowVM | undefined;
  trend: MonthTrendSeries;
  historyRows: AccountHistoryRowVM[];
  onDelete: () => void;
}

/** 帳戶詳情的資料 sections（ADR-0062：header 由 page 層擁有）。 */
const AccountDetail: React.FC<AccountDetailProps> = ({
  name,
  account,
  latestRow,
  trend,
  historyRows,
  onDelete,
}) => {
  // Which period shows its holdings; a pure view concern, so it lives here.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggleExpanded = useCallback(
    (id: string) => setExpandedId((current) => (current === id ? null : id)),
    [],
  );

  return (
    <div className="space-y-8">
      <PageSection title={ACCOUNT_DETAIL_LABELS.BASIC_INFO_SECTION_TITLE} spacing="compact">
        <MetricGroup columns={4}>
          <Metric label={ACCOUNT_DETAIL_LABELS.NAME_LABEL} value={name} />
          <Metric
            label={ACCOUNT_DETAIL_LABELS.TYPE_LABEL}
            value={AccountCategoryLabels[account.category]}
          />
          <Metric label={ACCOUNT_DETAIL_LABELS.CURRENCY_LABEL} value={account.currency} />
          <Metric
            label={ACCOUNT_DETAIL_LABELS.CREATED_LABEL}
            value={formatDate(account.createdAt)}
          />
        </MetricGroup>
      </PageSection>

      <PageSection title={ACCOUNT_DETAIL_LABELS.ENDING_BALANCE_SECTION_TITLE} spacing="compact">
        {latestRow ? (
          <div className="flex items-baseline justify-between gap-4">
            <FinancialNumber
              value={latestRow.balanceText}
              size="hero"
              change={latestRow.changeText}
              changeTone={latestRow.changeTone}
            />
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {latestRow.periodLabel}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {ACCOUNT_DETAIL_LABELS.HISTORY_EMPTY_HINT}
          </p>
        )}
      </PageSection>

      <PageSection title={ACCOUNT_DETAIL_LABELS.TREND_SECTION_TITLE} spacing="compact">
        {trend.hasData ? (
          <InteractiveLineChart
            values={trend.values}
            points={trend.points}
            xLabels={trend.labels}
            includeZero={false}
            yAxis="left"
            height={320}
            ariaLabel="12 month account balance trend"
          />
        ) : (
          <p className="text-sm text-muted-foreground">{ACCOUNT_DETAIL_LABELS.TREND_EMPTY_HINT}</p>
        )}
      </PageSection>

      <PageSection title={ACCOUNT_DETAIL_LABELS.HISTORY_SECTION_TITLE} spacing="compact">
        {historyRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {ACCOUNT_DETAIL_LABELS.HISTORY_EMPTY_HINT}
          </p>
        ) : (
          <>
            <DataTableScrollArea>
              <DataTable>
                <DataTableColGroup widths={ACCOUNT_HISTORY_COLUMN_WIDTHS} />
                <TableHeader>
                  <DataTableHeadRow>
                    <DataTableHeadCell className="w-10">
                      <span className="sr-only">{ACCOUNT_HISTORY_COLUMN_LABELS.EXPAND}</span>
                    </DataTableHeadCell>
                    <DataTableHeadCell>{ACCOUNT_HISTORY_COLUMN_LABELS.PERIOD}</DataTableHeadCell>
                    <DataTableHeadCell align="number">
                      {ACCOUNT_HISTORY_COLUMN_LABELS.BALANCE}
                    </DataTableHeadCell>
                    <DataTableHeadCell align="number">
                      {ACCOUNT_HISTORY_COLUMN_LABELS.CHANGE}
                    </DataTableHeadCell>
                    <DataTableHeadCell align="number">
                      {ACCOUNT_HISTORY_COLUMN_LABELS.HOLDINGS}
                    </DataTableHeadCell>
                  </DataTableHeadRow>
                </TableHeader>
                <TableBody>
                  {historyRows.map((row) => {
                    const isExpanded = expandedId === row.id;
                    return (
                      <React.Fragment key={row.id}>
                        <DataTableRow data-testid={`account-history-row-${row.id}`}>
                          <DataTableCell className="w-10 pr-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-expanded={isExpanded}
                              aria-label={accountHoldingRowLabel(row.periodLabel)}
                              onClick={() => toggleExpanded(row.id)}
                              className="h-7 w-7"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </DataTableCell>
                          <DataTableCell className="font-mono text-[12px]">
                            {row.periodLabel}
                          </DataTableCell>
                          <DataTableCell align="number">{row.balanceText}</DataTableCell>
                          <DataTableCell
                            align="number"
                            className={MONEY_CHANGE_TONE_CLASS[row.changeTone]}
                          >
                            {row.changeText}
                          </DataTableCell>
                          <DataTableCell align="number" className="text-muted-foreground">
                            {accountHoldingsCountLabel(row.holdingsCount)}
                          </DataTableCell>
                        </DataTableRow>
                        {isExpanded && (
                          <DataTableRow data-testid={`account-history-holdings-${row.id}`}>
                            <DataTableCell colSpan={5} className="bg-muted/40">
                              <HoldingsTable row={row} />
                            </DataTableCell>
                          </DataTableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </DataTable>
            </DataTableScrollArea>

            <MobileDataList>
              {historyRows.map((row) => (
                <MobileExpandableRow
                  key={row.id}
                  data-testid={`account-history-row-mobile-${row.id}`}
                  summary={<span className="font-mono text-sm">{row.periodLabel}</span>}
                  value={<span className="font-mono text-sm tabular-nums">{row.balanceText}</span>}
                  meta={
                    <>
                      <span
                        className={cn(
                          'font-mono tabular-nums',
                          MONEY_CHANGE_TONE_CLASS[row.changeTone],
                        )}
                      >
                        {row.changeText}
                      </span>
                      <span>{accountHoldingsCountLabel(row.holdingsCount)}</span>
                    </>
                  }
                  details={<HoldingsTable row={row} />}
                />
              ))}
            </MobileDataList>
          </>
        )}
      </PageSection>

      <DangerZone actionLabel={ACCOUNT_DANGER_LABELS.DELETE} onAction={onDelete} />
    </div>
  );
};

export default AccountDetail;
