import React, { useMemo, useState } from 'react';

import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { type AccountWithSnapshot } from '@/domains/account/types/account';
import { AccountCategory } from '@/domains/account/types/categories';
import { Button } from '@/ui/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/components/ui/table';
import { SortableListScope, GripHandle } from '@/ui/components/sortable/SortableListScope';
import { useSortableRow } from '@/ui/hooks/useSortableList';
import { PageHeader } from '@/ui/components/PageHeader';
import { formatCurrency } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

import { useAccountListController } from '../hooks/useAccountListController';
import AccountForm from './AccountForm';

const CATEGORY_ORDER: AccountCategory[] = [
  AccountCategory.CASH,
  AccountCategory.BANK,
  AccountCategory.SECURITIES,
];

const SECTION_TITLES: Partial<Record<AccountCategory, string>> = {
  [AccountCategory.CASH]: 'CASH',
  [AccountCategory.BANK]: 'BANK',
  [AccountCategory.SECURITIES]: 'SECURITIES',
};

interface AccountRowVM {
  id: string;
  name: string;
  currency: string;
  balanceText: string;
  asOfText: string;
  isActive: boolean;
}

const formatPeriod = (snapshot: AccountWithSnapshot['snapshot']): string => {
  if (!snapshot) return '—';
  return `${snapshot.year}-${snapshot.month.toString().padStart(2, '0')}`;
};

const toRowVM = (account: AccountWithSnapshot): AccountRowVM => ({
  id: account.id,
  name: account.name,
  currency: account.currency,
  balanceText: formatCurrency(account.snapshot?.amount ?? 0),
  asOfText: formatPeriod(account.snapshot),
  isActive: account.isActive !== false,
});

interface SortableAccountRowProps {
  row: AccountRowVM;
  onSelect: (id: string) => void;
}

const SortableAccountRow: React.FC<SortableAccountRowProps> = ({ row, onSelect }) => {
  const { setNodeRef, setActivatorNodeRef, attributes, listeners, rowStyle, isDragging } =
    useSortableRow(row.id);

  return (
    <TableRow
      ref={setNodeRef}
      onClick={() => onSelect(row.id)}
      interactive
      className={cn('cursor-pointer', isDragging && 'opacity-50')}
      style={rowStyle}
      data-testid={`account-row-${row.id}`}
    >
      <TableCell className="w-10 pr-0">
        <GripHandle
          label={`Reorder ${row.name}`}
          testId={`account-grip-${row.id}`}
          attributes={attributes}
          listeners={listeners}
          activatorRef={setActivatorNodeRef}
          className={row.isActive ? '' : 'opacity-60'}
        />
      </TableCell>
      <TableCell className={row.isActive ? '' : 'text-muted-foreground'}>
        {row.name}
        <span className="ml-2 font-mono text-[10px] text-muted-foreground">
          {row.currency}
        </span>
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums">{row.balanceText}</TableCell>
      <TableCell className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">
        {row.asOfText}
      </TableCell>
    </TableRow>
  );
};

const AccountSection: React.FC<{
  title: string;
  rows: AccountRowVM[];
  onSelect: (id: string) => void;
  onReorder: (next: AccountRowVM[]) => void;
}> = ({ title, rows, onSelect, onReorder }) => (
  <section className="space-y-3">
    <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">{title}</p>
    {/* DndContext renders aria-live divs, so it must wrap the table
        rather than sit inside tbody (invalid HTML). */}
    <SortableListScope items={rows} onReorder={onReorder}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Ending Balance</TableHead>
            <TableHead className="text-right">As of</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <SortableAccountRow key={row.id} row={row} onSelect={onSelect} />
          ))}
        </TableBody>
      </Table>
    </SortableListScope>
  </section>
);

const AccountList: React.FC = () => {
  const navigate = useNavigate();
  const {
    accounts,
    localAccounts,
    loadingAccounts,
    showForm,
    setShowForm,
    handleCreate,
    handleReorder,
  } = useAccountListController();

  const [showInactive, setShowInactive] = useState(false);

  const visibleAccounts = useMemo(() => {
    return localAccounts
      .filter((account) => showInactive || account.isActive !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [localAccounts, showInactive]);

  const orderedBase = useMemo(
    () => [...localAccounts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [localAccounts],
  );

  const grouped = useMemo(() => {
    const map = new Map<AccountCategory, AccountRowVM[]>();
    for (const category of CATEGORY_ORDER) {
      map.set(category, []);
    }
    for (const account of visibleAccounts) {
      const rows = map.get(account.category);
      if (rows) {
        rows.push(toRowVM(account));
      }
    }
    return map;
  }, [visibleAccounts]);

  const totalBalance = useMemo(
    () =>
      visibleAccounts
        .filter((account) => account.isActive !== false)
        .reduce((sum, account) => sum + (account.snapshot?.amount ?? 0), 0),
    [visibleAccounts],
  );

  if (showForm) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <AccountForm
          onSubmit={handleCreate}
          onCancel={() => {
            setShowForm(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="帳戶管理"
        description="管理您的銀行、券商與現金帳戶"
        meta={
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            <span>啟用中 {visibleAccounts.filter((a) => a.isActive !== false).length} 筆</span>
            <button
              type="button"
              className="underline underline-offset-2 transition-[color,background-color,transform] duration-fast ease-out-quint hover:text-foreground active:scale-[0.97]"
              onClick={() => setShowInactive((prev) => !prev)}
            >
              {showInactive ? '隱藏停用' : '顯示停用'}
            </button>
          </div>
        }
        actions={
          <div className="flex gap-2">
            <Button onClick={() => setShowForm(true)} className="gap-2">
              <Plus size={18} />
              新增帳戶
            </Button>
          </div>
        }
      />

      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          TOTAL BALANCE
        </p>
        <p className="font-mono text-2xl tabular-nums text-foreground">
          {formatCurrency(totalBalance)}
        </p>
      </div>

      {!loadingAccounts && accounts.length === 0 && (
        <div className="rounded border border-dashed border-border bg-muted px-4 py-12 text-center">
          <h3 className="font-medium text-foreground">目前沒有帳戶</h3>
          <p className="mt-1 text-sm text-muted-foreground">點擊「新增帳戶」按鈕開始管理您的資產</p>
          <Button onClick={() => setShowForm(true)} variant="outline" className="mt-6">
            新增我的第一個帳戶
          </Button>
        </div>
      )}

      {CATEGORY_ORDER.map((category) => {
        const rows = grouped.get(category) ?? [];
        if (rows.length === 0) return null;
        return (
          <AccountSection
            key={category}
            title={SECTION_TITLES[category] ?? 'OTHER'}
            rows={rows}
            onSelect={(id) => navigate(`/accounts/${id}`)}
            onReorder={(orderedRows) => {
              const sectionIds = new Set(rows.map((row) => row.id));
              let sectionCursor = 0;
              const reordered = orderedBase.map((account) => {
                if (!sectionIds.has(account.id)) return account;
                const row = orderedRows[sectionCursor++];
                const match = orderedBase.find((item) => item.id === row.id);
                return match ?? account;
              });
              handleReorder(reordered);
            }}
          />
        );
      })}
    </div>
  );
};

export default AccountList;
