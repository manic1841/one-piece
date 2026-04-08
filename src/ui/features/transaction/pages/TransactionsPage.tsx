import React, { useMemo, useState } from 'react';

import { Plus, Search } from 'lucide-react';

import { useAuth } from '@/infra/contexts/useAuth';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { Input } from '@/ui/components/ui/input';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { useProjects } from '@/ui/features/project/hooks/useProjects';
import { TransactionList } from '@/ui/features/transaction/components/TransactionList';
import { useTransactionForm } from '@/ui/features/transaction/hooks/useTransactionForm';
import { useTransactions } from '@/ui/features/transaction/hooks/useTransactions';
import { type TransactionFormOutput } from '@/ui/features/transaction/types/transaction';
import {
  type TransactionListItemVM,
  mapTransactionToListItemVM,
} from '@/ui/features/transaction/viewmodels/transaction-list.vm';
import { mapDomainTransactionToFormOutput } from '@/ui/features/transaction/viewmodels/transaction.vm';
import { cn } from '@/ui/utils/cn';

import { TransactionForm } from '../components/form/TransactionForm';

const Transactions: React.FC = () => {
  const { userProfile } = useAuth();
  const { transactions, loading, reload, deleteTransaction, getTransactionAllocation } =
    useTransactions(userProfile?.householdId);
  const { projects } = useProjects(userProfile?.householdId);
  const { getLabel } = useLedgerCodes();

  const handleDelete = async (transaction: TransactionListItemVM) => {
    if (window.confirm('確定要刪除這筆交易嗎？相關的分攤資料也將一併刪除。')) {
      await deleteTransaction(transaction.id);
    }
  };

  const handleDateRangeSearch = async (range: { fromDate?: Date; toDate?: Date }) => {
    await reload({
      limit: 100,
      startDate: range.fromDate,
      endDate: range.toDate,
    });
  };

  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [editingInitialOutput, setEditingInitialOutput] = useState<TransactionFormOutput | null>(
    null,
  );

  const resetEditState = () => {
    setEditingTransactionId(null);
    setEditingInitialOutput(null);
  };

  const handleEdit = async (transaction: TransactionListItemVM) => {
    const target = transactions.find((item) => item.id === transaction.id);
    if (!target) {
      window.alert('找不到要編輯的交易資料。');
      return;
    }

    if (target.intentType === 'TRANSFER' || target.intentType === 'DEBT_PAYMENT') {
      window.alert('目前不支援編輯還款與專案轉帳交易。');
      return;
    }

    const allocation = await getTransactionAllocation(target.id);
    const initialOutput = mapDomainTransactionToFormOutput(target, allocation);

    setEditingTransactionId(target.id);
    setEditingInitialOutput(initialOutput);
    setIsFormOpen(true);
  };

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');

  const {
    expenseCategories,
    incomeCategories,
    investmentCategories,
    financingCategories,
    advancedCategories,
    debtAccounts,
    allActiveLedgerCodes,
    loadIncomeAllocationTemplate,
    settlementPrompt,
    confirmSettlementPrompt,
    dismissSettlementPrompt,
    loading: formSubmitting,
    error: formError,
    handleSubmit,
    handleUpdate,
  } = useTransactionForm(
    userProfile?.householdId || '',
    () => {
      setIsFormOpen(false);
      resetEditState();
    },
    () => reload(),
  );

  const handleFormSubmit = async (output: TransactionFormOutput) => {
    if (editingTransactionId) {
      await handleUpdate(editingTransactionId, output);
      return;
    }

    await handleSubmit(output);
  };

  const projectNameById = useMemo(() => {
    return new Map(projects.map((project) => [project.id, project.name]));
  }, [projects]);

  const transactionItems = useMemo(() => {
    return transactions.map((transaction) =>
      mapTransactionToListItemVM(transaction, {
        projectName: transaction.projectId ? projectNameById.get(transaction.projectId) : undefined,
        getLedgerLabel: getLabel,
      }),
    );
  }, [transactions, projectNameById, getLabel]);

  const filteredTransactions = useMemo(() => {
    return transactionItems.filter((item) => {
      const matchSearch = searchTerm
        ? item.displayTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.categoryLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.intentType.toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      const matchType = filterType === 'ALL' ? true : item.intentType === filterType;

      return matchSearch && matchType;
    });
  }, [transactionItems, searchTerm, filterType]);

  const projectOptions = projects
    .filter((project) => project.isActive)
    .map((project) => ({
      id: project.id,
      name: project.name,
      icon: project.icon,
    }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-foreground">交易</h1>
        <Button
          onClick={() => {
            resetEditState();
            setIsFormOpen(true);
          }}
          className="gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          新增交易
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="搜尋備註或類型..."
            className="pl-9 bg-gray-50/50 border-none focus-visible:ring-1 focus-visible:ring-gray-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: '全部' },
            { id: 'EXPENSE', label: '支出' },
            { id: 'INCOME', label: '收入' },
            { id: 'INVESTMENT', label: '投資' },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id)}
              className={cn(
                'px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap',
                filterType === type.id
                  ? 'bg-gray-900 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <TransactionList
        items={filteredTransactions}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDateRangeSearch={handleDateRangeSearch}
      />

      {userProfile?.householdId && isFormOpen && (
        <TransactionForm
          isOpen={isFormOpen}
          mode={editingTransactionId ? 'edit' : 'create'}
          initialOutput={editingInitialOutput}
          onClose={() => {
            setIsFormOpen(false);
            resetEditState();
          }}
          onSubmit={handleFormSubmit}
          loading={formSubmitting}
          error={formError}
          projects={projectOptions}
          expenseCategories={expenseCategories}
          incomeCategories={incomeCategories}
          investmentCategories={investmentCategories}
          financingCategories={financingCategories}
          advancedCategories={advancedCategories}
          debtAccounts={debtAccounts}
          allActiveLedgerCodes={allActiveLedgerCodes}
          loadIncomeAllocationTemplate={loadIncomeAllocationTemplate}
        />
      )}

      <Dialog
        open={Boolean(settlementPrompt)}
        onOpenChange={(open) => {
          if (!open) dismissSettlementPrompt();
        }}
      >
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{settlementPrompt?.debtAccountName ?? '貸款'} 已還清</DialogTitle>
            <DialogDescription>剩餘本金已為 0，是否將此貸款標記為結清？</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={dismissSettlementPrompt}>
              稍後再說
            </Button>
            <Button type="button" onClick={confirmSettlementPrompt}>
              確認結清
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transactions;
