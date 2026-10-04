import { useState } from 'react';

import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { FilterStrip } from '@/ui/components/FilterStrip';
import { Metric, MetricGroup } from '@/ui/components/MetricGroup';
import { PageHeader } from '@/ui/components/PageHeader';
import { PageSection } from '@/ui/components/PageSection';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Toolbar } from '@/ui/components/Toolbar';
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
  TableBody,
  TableHeader,
} from '@/ui/components/data-table';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import {
  DEBT_FILTER_ALL,
  DEBT_FILTER_ITEMS,
  DEBT_FILTER_LABEL,
  DEBT_STATUS_GRACE_PERIOD_LABEL,
  DEBT_SUMMARY_LABELS,
} from '@/ui/constants/debt/label';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { DebtAccountFormDialog } from '@/ui/features/debt/components/DebtAccountFormDialog';
import { useDebtPage } from '@/ui/features/debt/hooks/useDebtPage';
import { type DebtAccount } from '@/ui/features/debt/viewmodels/debtDisplay.vm';
import { useDebtAccountFormViewModel } from '@/ui/features/debt/viewmodels/useDebtAccountFormViewModel';
import { formatCurrency, formatDate } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

type DialogMode = 'create' | 'edit';

const SKELETON_ROWS = [0, 1, 2, 3, 4];

const DEBT_COLUMN_WIDTHS = [28, 16, 20, 20, 16] as const;

export default function DebtListPage() {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId ?? '';
  const navigate = useNavigate();

  const { debtAccountViews, projects, totalDebt, loading, errorMessage, reload } =
    useDebtPage(householdId);

  const [dialogMode, setDialogMode] = useState<DialogMode | null>(null);
  const [editTarget, setEditTarget] = useState<DebtAccount | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const openCreate = () => {
    setEditTarget(null);
    setDialogMode('create');
  };

  const closeDialog = () => {
    setDialogMode(null);
    setEditTarget(null);
  };

  const formVm = useDebtAccountFormViewModel({
    householdId,
    initialAccount: editTarget ?? undefined,
    projects,
    submitLabel: dialogMode === 'create' ? '新增' : '儲存',
    onSubmitSuccess: () => {
      closeDialog();
      reload();
    },
    onCancel: closeDialog,
  });

  const visibleAccounts = debtAccountViews
    .filter((a) => (showInactive ? true : a.isActive))
    .sort((a, b) => {
      if (a.isActive === b.isActive) return 0;
      return a.isActive ? -1 : 1;
    });

  const filterValue = showInactive ? DEBT_FILTER_ALL : 'active';
  const handleFilterChange = (id: string) => setShowInactive(id === DEBT_FILTER_ALL);
  const activeCount = debtAccountViews.filter((account) => account.isActive).length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="債務管理"
        description="追蹤所有貸款與還款進度"
        actions={
          <div className="flex gap-2">
            <Button onClick={openCreate} className="gap-2">
              <Plus size={18} aria-hidden="true" />
              新增貸款
            </Button>
          </div>
        }
      />

      {loading && (
        <div role="status" className="space-y-2 py-2">
          <span className="sr-only">載入中…</span>
          {SKELETON_ROWS.map((row) => (
            <Skeleton key={row} className="h-12" />
          ))}
        </div>
      )}
      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={() => void reload()}>
            重試
          </Button>
        </Alert>
      )}

      {!loading && (
        <>
          <PageSection title="SUMMARY" spacing="compact" className="border-b-0">
            <MetricGroup columns={2} lastSpansFull>
              <Metric
                testId="debt-total-outstanding"
                label={DEBT_SUMMARY_LABELS.TOTAL_OUTSTANDING}
                value={formatCurrency(totalDebt)}
                tone="negative"
              />
              <Metric
                testId="debt-active-count"
                label={DEBT_SUMMARY_LABELS.ACTIVE_ACCOUNTS}
                value={String(activeCount)}
              />
            </MetricGroup>
          </PageSection>

          <Toolbar>
            <FilterStrip
              items={DEBT_FILTER_ITEMS}
              value={filterValue}
              onValueChange={handleFilterChange}
              ariaLabel={DEBT_FILTER_LABEL}
            />
          </Toolbar>

          {visibleAccounts.length === 0 ? (
            debtAccountViews.length === 0 ? (
              <EmptyState
                title="尚無貸款紀錄"
                description="點擊「新增貸款」開始建立。"
                action={
                  <Button onClick={openCreate} className="gap-2">
                    <Plus size={16} aria-hidden="true" />
                    新增貸款
                  </Button>
                }
              />
            ) : (
              <EmptyState title="沒有符合的貸款" description="目前沒有符合條件的貸款。" />
            )
          ) : (
            <>
              <MobileDataList>
                {visibleAccounts.map((account) => {
                  const isInactive = !account.isActive;
                  return (
                    <MobileDataRow
                      key={account.id}
                      data-testid={`debt-row-mobile-${account.id}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/debt/${account.id}`)}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        navigate(`/debt/${account.id}`);
                      }}
                      className={cn(
                        'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
                        isInactive && 'text-muted-foreground',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 text-sm font-medium">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate">{account.name}</span>
                          {account.inGracePeriod && (
                            <StatusGlyph type="review" label={DEBT_STATUS_GRACE_PERIOD_LABEL} />
                          )}
                        </span>
                        <span className="font-mono tabular-nums">
                          {formatCurrency(account.currentBalance)}
                        </span>
                      </div>
                      <MobileDataField label="類型">
                        <span className="text-sm">{account.typeLabel}</span>
                      </MobileDataField>
                      <MobileDataField label="每月應付">
                        <span className="font-mono text-sm tabular-nums">
                          {formatCurrency(account.monthlyDueAmount)}
                        </span>
                      </MobileDataField>
                      <MobileDataField label="截至">
                        <span className="font-mono text-sm tabular-nums">
                          {account.updatedAt ? formatDate(account.updatedAt) : '—'}
                        </span>
                      </MobileDataField>
                    </MobileDataRow>
                  );
                })}
              </MobileDataList>
              <DataTableScrollArea>
                <DataTable>
                  <DataTableColGroup widths={DEBT_COLUMN_WIDTHS} />
                  <TableHeader>
                    <DataTableHeadRow>
                      <DataTableHeadCell>Loan Name</DataTableHeadCell>
                      <DataTableHeadCell>Type</DataTableHeadCell>
                      <DataTableHeadCell align="number">Outstanding Balance</DataTableHeadCell>
                      <DataTableHeadCell align="number">Monthly Payment</DataTableHeadCell>
                      <DataTableHeadCell align="number">As of</DataTableHeadCell>
                    </DataTableHeadRow>
                  </TableHeader>
                  <TableBody>
                    {visibleAccounts.map((account) => {
                      const isInactive = !account.isActive;
                      return (
                        <DataTableRow
                          key={account.id}
                          data-testid={`debt-row-${account.id}`}
                          onClick={() => navigate(`/debt/${account.id}`)}
                          interactive
                          className="cursor-pointer"
                        >
                          <DataTableCell className={isInactive ? 'text-muted-foreground' : ''}>
                            <span className="flex items-center gap-2">
                              {account.name}
                              {account.inGracePeriod && (
                                <StatusGlyph type="review" label={DEBT_STATUS_GRACE_PERIOD_LABEL} />
                              )}
                            </span>
                          </DataTableCell>
                          <DataTableCell className="text-muted-foreground">
                            {account.typeLabel}
                          </DataTableCell>
                          <DataTableCell align="number">
                            {formatCurrency(account.currentBalance)}
                          </DataTableCell>
                          <DataTableCell align="number">
                            {formatCurrency(account.monthlyDueAmount)}
                          </DataTableCell>
                          <DataTableCell align="number" className="text-muted-foreground">
                            {account.updatedAt ? formatDate(account.updatedAt) : '—'}
                          </DataTableCell>
                        </DataTableRow>
                      );
                    })}
                  </TableBody>
                </DataTable>
              </DataTableScrollArea>
            </>
          )}
        </>
      )}

      <DebtAccountFormDialog
        open={dialogMode !== null}
        onOpenChange={(open) => !open && closeDialog()}
        title={dialogMode === 'create' ? '新增貸款' : '編輯貸款'}
        vm={formVm}
      />
    </div>
  );
}
