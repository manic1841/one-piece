import React, { useMemo, useState } from 'react';

import { Download, Plus, Upload } from 'lucide-react';
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
import { PageHeader } from '@/ui/components/PageHeader';
import { formatCurrency } from '@/ui/utils';

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

const AccountSection: React.FC<{
  title: string;
  rows: AccountRowVM[];
  onSelect: (id: string) => void;
}> = ({ title, rows, onSelect }) => (
  <section className="space-y-3">
    <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">{title}</p>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Account</TableHead>
          <TableHead className="text-right">Ending Balance</TableHead>
          <TableHead className="text-right">As of</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow
            key={row.id}
            onClick={() => onSelect(row.id)}
            className="cursor-pointer"
            data-testid={`account-row-${row.id}`}
          >
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
        ))}
      </TableBody>
    </Table>
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
    editingAccount,
    setEditingAccount,
    fileInputRef,
    importing,
    exportToCSV,
    handleCreate,
    handleUpdate,
    handleImport,
  } = useAccountListController();

  const [showInactive, setShowInactive] = useState(false);

  const visibleAccounts = useMemo(() => {
    return localAccounts
      .filter((account) => showInactive || account.isActive !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [localAccounts, showInactive]);

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

  if (showForm || editingAccount) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <AccountForm
          initialData={editingAccount}
          onSubmit={editingAccount ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingAccount(null);
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
              className="underline underline-offset-2 hover:text-foreground"
              onClick={() => setShowInactive((prev) => !prev)}
            >
              {showInactive ? '隱藏停用帳戶' : '顯示停用帳戶'}
            </button>
          </div>
        }
        actions={
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImport}
              accept=".csv"
              className="hidden"
            />
            <Button variant="outline" onClick={exportToCSV} className="gap-2">
              <Download size={18} />
              匯出
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
              disabled={importing}
            >
              <Upload size={18} />
              {importing ? '匯入中...' : '匯入'}
            </Button>
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
          />
        );
      })}
    </div>
  );
};

export default AccountList;
