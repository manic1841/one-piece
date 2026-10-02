import React, { useMemo, useState } from 'react';

import { Plus, Search } from 'lucide-react';

import { PageHeader } from '@/ui/components/PageHeader';
import { Button } from '@/ui/components/ui/button';
import { Input } from '@/ui/components/ui/input';
import { getIntentTypeLabel } from '@/ui/constants/transaction';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useConfirm } from '@/ui/features/app/confirm/useConfirm';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { useProjects } from '@/ui/features/project/hooks/useProjects';
import { TransactionList } from '@/ui/features/transaction/components/TransactionList';
import {
  type TransactionPeriod,
  TransactionPeriodPicker,
} from '@/ui/features/transaction/components/TransactionPeriodPicker';
import { useTransactionForm } from '@/ui/features/transaction/hooks/useTransactionForm';
import { useTransactions } from '@/ui/features/transaction/hooks/useTransactions';
import {
  type TransactionFormOutput,
  isNonEditableIntent,
} from '@/ui/features/transaction/types/transaction';
import {
  type TransactionListItemVM,
  mapTransactionToListItemVM,
} from '@/ui/features/transaction/viewmodels/transaction-list.vm';
import { mapDomainTransactionToFormOutput } from '@/ui/features/transaction/viewmodels/transaction.vm';
import { cn } from '@/ui/utils/cn';

import { TransactionForm } from '../components/form/TransactionForm';

const initialPeriodRange = (period: TransactionPeriod): { startDate?: Date; endDate?: Date } => {
  const today = new Date();
  if (period === 'CURRENT_MONTH') {
    return {
      startDate: new Date(today.getFullYear(), today.getMonth(), 1),
      endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  if (period === 'LAST_3_MONTHS') {
    return {
      startDate: new Date(today.getFullYear(), today.getMonth() - 2, 1),
      endDate: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  return {};
};

const Transactions: React.FC = () => {
  const { userProfile } = useAuthState();
  const { transactions, loading, reload, deleteTransaction, getTransactionAllocation } =
    useTransactions(userProfile?.householdId, initialPeriodRange('CURRENT_MONTH'));
  const { projects } = useProjects(userProfile?.householdId);
  const { getLabel } = useLedgerCodes();

  const { confirm } = useConfirm();

  const handleDelete = async (transaction: TransactionListItemVM) => {
    const confirmed = await confirm({
      title: 'Delete this transaction?',
      context: 'Related allocation data will be removed as well.',
    });
    if (confirmed) {
      await deleteTransaction(transaction.id);
    }
  };

  const handlePeriodChange = (nextPeriod: TransactionPeriod) => {
    setPeriod(nextPeriod);
    const range = initialPeriodRange(nextPeriod);
    void reload({ limit: 100, startDate: range.startDate, endDate: range.endDate });
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

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [period, setPeriod] = useState<TransactionPeriod>('CURRENT_MONTH');

  const handleEdit = async (transaction: TransactionListItemVM) => {
    const target = transactions.find((item) => item.id === transaction.id);
    if (!target) {
      await confirm({ title: '找不到要編輯的交易資料。' });
      return;
    }

    if (isNonEditableIntent(target.intentType)) {
      await confirm({ title: '目前不支援編輯此交易。' });
      return;
    }

    const allocation = await getTransactionAllocation(target.id);
    const initialOutput = mapDomainTransactionToFormOutput(target, allocation);

    setEditingTransactionId(target.id);
    setEditingInitialOutput(initialOutput);
    setIsFormOpen(true);
  };

  const {
    expenseCategories,
    incomeCategories,
    advancedCategories,
    allActiveLedgerCodes,
    loadIncomeAllocationTemplate,
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
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="交易"
        description="管理你的收入、支出與資金流動。"
        actions={
          <Button
            onClick={() => {
              resetEditState();
              setIsFormOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            新增交易
          </Button>
        }
      />

      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-border pb-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜尋交易或備註..."
            className="pl-9 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex w-full flex-wrap items-end gap-4 md:w-auto">
          {[
            { id: 'ALL', label: '全部' },
            { id: 'EXPENSE', label: getIntentTypeLabel('EXPENSE') },
            { id: 'INCOME', label: getIntentTypeLabel('INCOME') },
            { id: 'INVESTMENT', label: getIntentTypeLabel('INVESTMENT') },
            { id: 'FINANCING', label: getIntentTypeLabel('FINANCING') },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setFilterType(type.id)}
              className={cn(
                '-mb-1 whitespace-nowrap border-b-2 px-1 pb-1 text-sm font-medium transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0',
                filterType === type.id
                  ? 'text-foreground font-semibold border-primary'
                  : 'text-muted-foreground border-transparent',
              )}
            >
              {type.label}
            </button>
          ))}
          <TransactionPeriodPicker
            period={period}
            onPeriodChange={handlePeriodChange}
            onRangeChange={(range) => void handleDateRangeSearch(range)}
          />
        </div>
      </div>

      <TransactionList
        items={filteredTransactions}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
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
          advancedCategories={advancedCategories}
          allActiveLedgerCodes={allActiveLedgerCodes}
          loadIncomeAllocationTemplate={loadIncomeAllocationTemplate}
        />
      )}
    </div>
  );
};

export default Transactions;
