import React, { useMemo, useState } from 'react';

import { Plus } from 'lucide-react';

import { FilterStrip } from '@/ui/components/FilterStrip';
import { PageHeader } from '@/ui/components/PageHeader';
import { SearchField } from '@/ui/components/SearchField';
import { showToast } from '@/ui/components/Toast';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { Button } from '@/ui/components/ui/button';
import {
  TRANSACTIONS_PAGE_CREATE_ACTION,
  TRANSACTIONS_PAGE_DELETED_TOAST,
  TRANSACTIONS_PAGE_DELETE_CONFIRM_CONTEXT,
  TRANSACTIONS_PAGE_DELETE_CONFIRM_TITLE,
  TRANSACTIONS_PAGE_DESCRIPTION,
  TRANSACTIONS_PAGE_EDIT_MISSING_TITLE,
  TRANSACTIONS_PAGE_EDIT_UNSUPPORTED_TITLE,
  TRANSACTIONS_PAGE_FILTER_EMPTY_DESCRIPTION,
  TRANSACTIONS_PAGE_FILTER_EMPTY_TITLE,
  TRANSACTIONS_PAGE_FILTER_LABEL,
  TRANSACTIONS_PAGE_SAVED_TOAST,
  TRANSACTIONS_PAGE_SEARCH_LABEL,
  TRANSACTIONS_PAGE_SEARCH_PLACEHOLDER,
  TRANSACTIONS_PAGE_TITLE,
  TRANSACTION_FILTER_ALL,
  TRANSACTION_FILTER_ITEMS,
} from '@/ui/constants/transaction';
import { useAuthState } from '@/ui/contexts/useAuthState';
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
  const {
    transactions,
    loading,
    errorMessage,
    reload,
    deleteTransaction,
    getTransactionAllocation,
  } = useTransactions(userProfile?.householdId, initialPeriodRange('CURRENT_MONTH'));
  const { projects } = useProjects(userProfile?.householdId);
  const { getLabel } = useLedgerCodes();

  const { confirm } = useConfirm();

  const handleDelete = async (transaction: TransactionListItemVM) => {
    const confirmed = await confirm({
      title: TRANSACTIONS_PAGE_DELETE_CONFIRM_TITLE,
      context: TRANSACTIONS_PAGE_DELETE_CONFIRM_CONTEXT,
    });
    if (confirmed) {
      const result = await deleteTransaction(transaction.id);
      if (result?.ok) {
        showToast(TRANSACTIONS_PAGE_DELETED_TOAST);
      }
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
  const [filterType, setFilterType] = useState<string>(TRANSACTION_FILTER_ALL);
  const [period, setPeriod] = useState<TransactionPeriod>('CURRENT_MONTH');

  const openCreateForm = () => {
    resetEditState();
    setIsFormOpen(true);
  };

  const handleEdit = async (transaction: TransactionListItemVM) => {
    const target = transactions.find((item) => item.id === transaction.id);
    if (!target) {
      await confirm({ title: TRANSACTIONS_PAGE_EDIT_MISSING_TITLE });
      return;
    }

    if (isNonEditableIntent(target.intentType)) {
      await confirm({ title: TRANSACTIONS_PAGE_EDIT_UNSUPPORTED_TITLE });
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
      showToast(TRANSACTIONS_PAGE_SAVED_TOAST);
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

      const matchType =
        filterType === TRANSACTION_FILTER_ALL ? true : item.intentType === filterType;

      return matchSearch && matchType;
    });
  }, [transactionItems, searchTerm, filterType]);

  const isFiltered = searchTerm.trim() !== '' || filterType !== TRANSACTION_FILTER_ALL;

  const projectOptions = projects
    .filter((project) => project.isActive)
    .map((project) => ({
      id: project.id,
      name: project.name,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={TRANSACTIONS_PAGE_TITLE}
        description={TRANSACTIONS_PAGE_DESCRIPTION}
        actions={
          <Button onClick={openCreateForm}>
            <Plus className="w-4 h-4" />
            {TRANSACTIONS_PAGE_CREATE_ACTION}
          </Button>
        }
      />

      <div className="flex flex-col gap-4 border-b border-border pb-4 md:flex-row md:items-end md:justify-between md:pb-0">
        <SearchField
          className="w-full md:w-96 md:pb-3"
          value={searchTerm}
          onValueChange={setSearchTerm}
          placeholder={TRANSACTIONS_PAGE_SEARCH_PLACEHOLDER}
          ariaLabel={TRANSACTIONS_PAGE_SEARCH_LABEL}
        />
        <div className="flex w-full flex-wrap items-end gap-4 md:w-auto">
          <FilterStrip
            items={TRANSACTION_FILTER_ITEMS}
            value={filterType}
            onValueChange={setFilterType}
            ariaLabel={TRANSACTIONS_PAGE_FILTER_LABEL}
          />
          <div className="md:pb-3">
            <TransactionPeriodPicker
              period={period}
              onPeriodChange={handlePeriodChange}
              onRangeChange={(range) => void handleDateRangeSearch(range)}
            />
          </div>
        </div>
      </div>

      <TransactionList
        items={filteredTransactions}
        loading={loading}
        error={errorMessage}
        emptyState={
          isFiltered
            ? {
                title: TRANSACTIONS_PAGE_FILTER_EMPTY_TITLE,
                description: TRANSACTIONS_PAGE_FILTER_EMPTY_DESCRIPTION,
              }
            : undefined
        }
        onRetry={() => void reload()}
        onCreate={isFiltered ? undefined : openCreateForm}
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
