import { useCallback, useEffect, useState } from 'react';

import { z } from 'zod';

import { createDebtPaymentUseCase } from '@/application/debt/use_cases/createDebtPaymentUseCase';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { createAllocationUseCase } from '@/application/ledger/use_cases/createAllocationUseCase';
import { createTransactionUseCase } from '@/application/ledger/use_cases/createTransactionUseCase';
import { type DebtAccount } from '@/domains/debt/schemas';
import { IntentType } from '@/domains/ledger/constants';
import { DEFAULT_INTENT_MAPPINGS } from '@/domains/ledger/intentMapping';
import { projectService } from '@/domains/project/projectService';
import { useAuth } from '@/infra/contexts/useAuth';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import {
  type TransactionFormCategoryOption,
  type TransactionFormOutput,
} from '@/ui/features/transaction/types/transaction';
import {
  type TransactionFormVM,
  mapTransactionVMToAllocationData,
  mapTransactionVMToDomain,
  parseTransactionFormVM,
} from '@/ui/features/transaction/viewmodels/transaction.vm';

const expenseCategories: TransactionFormCategoryOption[] = [
  ...DEFAULT_INTENT_MAPPINGS.filter((mapping) => mapping.type === 'EXPENSE').map((mapping) => ({
    value: mapping.intent,
    label: mapping.label,
  })),
];

const incomeCategories: TransactionFormCategoryOption[] = [
  ...DEFAULT_INTENT_MAPPINGS.filter((mapping) => mapping.type === 'INCOME').map((mapping) => ({
    value: mapping.intent,
    label: mapping.label,
  })),
];

const investmentCategories: TransactionFormCategoryOption[] = DEFAULT_INTENT_MAPPINGS.filter(
  (mapping) => mapping.type === 'INVESTMENT',
).map((mapping) => ({
  value: mapping.intent,
  label: mapping.label,
}));

const financingCategories: TransactionFormCategoryOption[] = DEFAULT_INTENT_MAPPINGS.filter(
  (mapping) => mapping.type === 'FINANCING',
).map((mapping) => ({
  value: mapping.intent,
  label: mapping.label,
}));

const advancedCategories: TransactionFormCategoryOption[] = [
  ...expenseCategories,
  ...incomeCategories,
];

const toDate = (date: string) => new Date(`${date}T00:00:00`);

export const useTransactionForm = (
  householdId: string,
  onClose: () => void,
  onSuccess?: () => void,
) => {
  const { userProfile, currentUser, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);
  const { codes: allActiveLedgerCodes } = useLedgerCodes(false);

  // Fetch active debt accounts for the DEBT_PAYMENT tab
  const fetchDebtAccounts = useCallback(async () => {
    if (!householdId) return;
    try {
      const accounts = await listDebtAccountsUseCase.execute({ householdId });
      setDebtAccounts(accounts);
    } catch {
      // non-critical — DEBT_PAYMENT tab will simply show empty list
    }
  }, [householdId]);

  useEffect(() => {
    fetchDebtAccounts();
  }, [fetchDebtAccounts]);

  const executeAllocation = async (input: {
    vm: TransactionFormVM;
    transactionId: string;
    userEmail: string;
  }) => {
    const { vm, transactionId, userEmail } = input;

    const allocationData = mapTransactionVMToAllocationData(vm, transactionId);
    if (!allocationData) return;

    await createAllocationUseCase.execute({
      householdId,
      userEmail,
      data: allocationData,
    });
  };

  const handleSubmit = async (output: TransactionFormOutput) => {
    if (!userProfile?.email) return;

    setError('');
    setLoading(true);

    try {
      const vm = parseTransactionFormVM(output);

      if (vm.intentType === IntentType.DEBT_PAYMENT) {
        if (!vm.debtAccountId) throw new Error('請選擇貸款帳戶');
        await createDebtPaymentUseCase.execute({
          householdId,
          userEmail: userProfile.email,
          auth: {
            uid: currentUser?.uid ?? '',
            isGlobalAdmin: isAdmin ?? false,
          },
          debtAccountId: vm.debtAccountId,
          totalPayment: vm.amount,
          date: new Date(`${vm.date}T00:00:00`),
          description: vm.description,
          projectId: vm.projectId,
        });
      } else if (vm.intentType === IntentType.TRANSFER) {
        if (!vm.fromProjectId || !vm.toProjectId)
          throw new Error('Please select both source and target projects.');

        await projectService.transferBetweenProjects(
          householdId,
          {
            fromProjectId: vm.fromProjectId,
            toProjectId: vm.toProjectId,
            amount: vm.amount,
            date: toDate(vm.date),
            description: vm.description,
          },
          userProfile.email,
        );
      } else {
        const transactionId = await createTransactionUseCase.execute({
          householdId,
          userEmail: userProfile.email,
          data: mapTransactionVMToDomain(vm, userProfile.email),
        });

        await executeAllocation({
          vm,
          transactionId,
          userEmail: userProfile.email,
        });
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0]?.message || 'Invalid transaction form input.');
      } else {
        const e = err as Error;
        setError(e.message || 'Failed to save transaction.');
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    expenseCategories,
    incomeCategories,
    investmentCategories,
    financingCategories,
    advancedCategories,
    debtAccounts,
    allActiveLedgerCodes,
    loading,
    error,
    handleSubmit,
  };
};
