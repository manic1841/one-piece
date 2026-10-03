import React, { useState } from 'react';

import { ChevronRight } from 'lucide-react';

import { PageSection } from '@/ui/components/PageSection';
import {
  DataTable,
  DataTableCell,
  DataTableColGroup,
  DataTableHeadCell,
  DataTableHeadRow,
  DataTableRow,
  DataTableScrollArea,
  MobileDataList,
  MobileDataRow,
  MobileExpandableRow,
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { MONEY_TONE_CLASS } from '@/ui/components/moneyTone';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/ui/components/ui/accordion';
import {
  PROJECT_DETAIL_LABELS,
  PROJECT_RECORD_COLUMN_LABELS,
  PROJECT_RECORD_COLUMN_WIDTHS,
  PROJECT_SNAPSHOT_COLUMN_LABELS,
  PROJECT_SNAPSHOT_COLUMN_WIDTHS,
  PROJECT_SUMMARY_LABELS,
  projectRecordCountLabel,
} from '@/ui/constants/project/projectDetailLabels';
import { type ProjectMonthGroup } from '@/ui/features/project/viewmodels/projectDetail.vm';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

const PANEL_VALUE = 'cash-flow';
const SNAPSHOT_COL_SPAN = PROJECT_SNAPSHOT_COLUMN_WIDTHS.length;

const amountToneClass = (isIncome: boolean): string =>
  MONEY_TONE_CLASS[isIncome ? 'positive' : 'negative'];

interface ProjectCashFlowPanelProps {
  groups: ProjectMonthGroup[];
}

export const ProjectCashFlowPanel: React.FC<ProjectCashFlowPanelProps> = ({ groups }) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  const toggle = (key: string) =>
    setExpandedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const handleRowKeyDown = (key: string) => (event: React.KeyboardEvent<HTMLTableRowElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggle(key);
  };

  return (
    <PageSection spacing="compact">
      <Accordion type="multiple" defaultValue={[PANEL_VALUE]} className="border-y-0">
        <AccordionItem value={PANEL_VALUE}>
          <AccordionTrigger className="h-auto border-b-0 p-0 hover:text-foreground">
            {PROJECT_DETAIL_LABELS.CASH_FLOW_SECTION_TITLE}
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-0 pt-4">
            {groups.length === 0 ? (
              <p className="py-2 text-sm text-muted-foreground">
                {PROJECT_DETAIL_LABELS.CASH_FLOW_EMPTY_HINT}
              </p>
            ) : (
              <>
                <DataTableScrollArea>
                  <DataTable>
                    <DataTableColGroup widths={PROJECT_SNAPSHOT_COLUMN_WIDTHS} />
                    <TableHeader>
                      <DataTableHeadRow>
                        <DataTableHeadCell>
                          {PROJECT_SNAPSHOT_COLUMN_LABELS.MONTH}
                        </DataTableHeadCell>
                        <DataTableHeadCell align="number">
                          {PROJECT_SNAPSHOT_COLUMN_LABELS.OPENING}
                        </DataTableHeadCell>
                        <DataTableHeadCell align="number">
                          {PROJECT_SNAPSHOT_COLUMN_LABELS.INCOME}
                        </DataTableHeadCell>
                        <DataTableHeadCell align="number">
                          {PROJECT_SNAPSHOT_COLUMN_LABELS.EXPENSE}
                        </DataTableHeadCell>
                        <DataTableHeadCell align="number">
                          {PROJECT_SNAPSHOT_COLUMN_LABELS.CLOSING}
                        </DataTableHeadCell>
                      </DataTableHeadRow>
                    </TableHeader>
                    <TableBody>
                      {groups.map((group) => {
                        const isOpen = expandedKeys.includes(group.key);
                        return (
                          <React.Fragment key={group.key}>
                            <DataTableRow
                              data-testid={`project-month-${group.key}`}
                              interactive
                              aria-expanded={isOpen}
                              tabIndex={0}
                              onClick={() => toggle(group.key)}
                              onKeyDown={handleRowKeyDown(group.key)}
                              className={cn('cursor-pointer', isOpen && 'border-b-0 bg-muted/50')}
                            >
                              <DataTableCell>
                                <span className="flex items-center gap-2">
                                  <ChevronRight
                                    size={14}
                                    aria-hidden="true"
                                    className={cn(
                                      'shrink-0 text-muted-foreground transition-transform duration-fast',
                                      isOpen && 'rotate-90',
                                    )}
                                  />
                                  <span className="font-mono text-[12px] tabular-nums">
                                    {group.label}
                                  </span>
                                </span>
                              </DataTableCell>
                              <DataTableCell align="number">
                                {group.snapshot?.openingBalanceText ?? '—'}
                              </DataTableCell>
                              <DataTableCell align="number" className={amountToneClass(true)}>
                                {formatCurrency(group.income)}
                              </DataTableCell>
                              <DataTableCell align="number" className={amountToneClass(false)}>
                                {formatCurrency(group.expense)}
                              </DataTableCell>
                              <DataTableCell align="number">
                                {group.snapshot?.closingBalanceText ?? '—'}
                              </DataTableCell>
                            </DataTableRow>
                            {isOpen && (
                              <DataTableRow
                                className="hover:bg-transparent"
                                data-testid={`project-month-details-${group.key}`}
                              >
                                <DataTableCell
                                  colSpan={SNAPSHOT_COL_SPAN}
                                  className="bg-muted/30 px-3 py-3"
                                >
                                  {group.records.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                      {PROJECT_DETAIL_LABELS.RECORD_EMPTY_HINT}
                                    </p>
                                  ) : (
                                    <DataTable>
                                      <DataTableColGroup widths={PROJECT_RECORD_COLUMN_WIDTHS} />
                                      <TableHeader>
                                        <DataTableHeadRow>
                                          <DataTableHeadCell>
                                            {PROJECT_RECORD_COLUMN_LABELS.DATE}
                                          </DataTableHeadCell>
                                          <DataTableHeadCell>
                                            {PROJECT_RECORD_COLUMN_LABELS.CATEGORY}
                                          </DataTableHeadCell>
                                          <DataTableHeadCell align="number">
                                            {PROJECT_RECORD_COLUMN_LABELS.AMOUNT}
                                          </DataTableHeadCell>
                                        </DataTableHeadRow>
                                      </TableHeader>
                                      <TableBody>
                                        {group.records.map((record) => (
                                          <DataTableRow key={record.id}>
                                            <DataTableCell className="font-mono text-[12px]">
                                              {record.dateText}
                                            </DataTableCell>
                                            <DataTableCell className="text-muted-foreground">
                                              {record.categoryLabel}
                                            </DataTableCell>
                                            <DataTableCell
                                              align="number"
                                              className={amountToneClass(record.isIncome)}
                                            >
                                              {record.amountText}
                                            </DataTableCell>
                                          </DataTableRow>
                                        ))}
                                      </TableBody>
                                    </DataTable>
                                  )}
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
                  {groups.map((group) => (
                    <MobileExpandableRow
                      key={group.key}
                      data-testid={`project-month-mobile-${group.key}`}
                      summary={
                        <>
                          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                            {group.label}
                          </span>
                          <span className="min-w-0 truncate text-sm font-medium">
                            {projectRecordCountLabel(group.records.length)}
                          </span>
                        </>
                      }
                      value={
                        <span className="font-mono text-sm tabular-nums">
                          {formatCurrency(group.net)}
                        </span>
                      }
                      meta={
                        <span className="truncate">
                          {`${PROJECT_SUMMARY_LABELS.INCOME} ${formatCurrency(group.income)} · ${PROJECT_SUMMARY_LABELS.EXPENSE} ${formatCurrency(group.expense)} · ${PROJECT_SNAPSHOT_COLUMN_LABELS.CLOSING} ${group.snapshot?.closingBalanceText ?? '—'}`}
                        </span>
                      }
                      details={
                        group.records.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            {PROJECT_DETAIL_LABELS.RECORD_EMPTY_HINT}
                          </p>
                        ) : (
                          <div>
                            {group.records.map((record) => (
                              <MobileDataRow key={record.id} className="py-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                                    {record.dateText}
                                  </span>
                                  <span
                                    className={cn(
                                      'font-mono text-sm tabular-nums',
                                      amountToneClass(record.isIncome),
                                    )}
                                  >
                                    {record.amountText}
                                  </span>
                                </div>
                                <span className="text-[11px] text-muted-foreground">
                                  {record.categoryLabel}
                                </span>
                              </MobileDataRow>
                            ))}
                          </div>
                        )
                      }
                    />
                  ))}
                </MobileDataList>
              </>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </PageSection>
  );
};
