import { useCallback, useEffect, useRef, useState } from 'react';

import { z } from 'zod';

import { createDebtPaymentUseCase } from '@/application/debt/use_cases/createDebtPaymentUseCase';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { updateDebtAccountUseCase } from '@/application/debt/use_cases/updateDebtAccountUseCase';
import { createAllocationUseCase } from '@/application/ledger/use_cases/createAllocationUseCase';
import { createTransactionUseCase } from '@/application/ledger/use_cases/createTransactionUseCase';
import { getIncomeAllocationTemplateUseCase } from '@/application/ledger/use_cases/getIncomeAllocationTemplateUseCase';
import { updateTransactionUseCase } from '@/application/ledger/use_cases/updateTransactionUseCase';
import { upsertIncomeAllocationTemplateUseCase } from '@/application/ledger/use_cases/upsertIncomeAllocationTemplateUseCase';
import { type DebtAccount } from '@/domains/debt/schemas';
import { IntentType } from '@/domains/ledger/constants';
import { DEFAULT_INTENT_MAPPINGS } from '@/domains/ledger/intentMapping';
import { projectService } from '@/domains/project/projectService';
import { useAuth } from '@/infra/contexts/useAuth';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { type AllocationItemInput } from '@/ui/features/transaction/types/allocation';
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
import { logger } from '@/utils/logger';

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

type SettlementPrompt = {
  debtAccountId: string;
  debtAccountName: string;
};

export const useTransactionForm = (
  householdId: string,
  onClose: () => void,
  onSuccess?: () => void,
) => {
  const { userProfile, currentUser, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debtAccounts, setDebtAccounts] = useState<DebtAccount[]>([]);
  const [settlementPrompt, setSettlementPrompt] = useState<SettlementPrompt | null>(null);
  const incomeTemplateCacheRef = useRef<Map<string, AllocationItemInput[] | null>>(new Map());
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

  const loadIncomeAllocationTemplate = useCallback(
    async (ledgerCode: string): Promise<AllocationItemInput[] | null> => {
      if (!householdId || !ledgerCode.startsWith('income:')) return null;

      if (incomeTemplateCacheRef.current.has(ledgerCode)) {
        return incomeTemplateCacheRef.current.get(ledgerCode) ?? null;
      }

      const template = await getIncomeAllocationTemplateUseCase.execute({
        householdId,
        ledgerCode,
      });

      const items = template
        ? template.items.map((item) => ({
            projectId: item.projectId,
            percentage: item.percentage,
          }))
        : null;

      incomeTemplateCacheRef.current.set(ledgerCode, items);
      return items;
    },
    [householdId],
  );

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

    if (vm.intentType !== IntentType.INCOME || !vm.ledgerCode?.startsWith('income:')) {
      return;
    }

    try {
      await upsertIncomeAllocationTemplateUseCase.execute({
        householdId,
        userEmail,
        ledgerCode: vm.ledgerCode,
        items: allocationData.items,
      });

      incomeTemplateCacheRef.current.set(vm.ledgerCode, allocationData.items);
    } catch (templateError) {
      logger.warn('Failed to persist income allocation template', 'useTransactionForm', {
        templateError,
        ledgerCode: vm.ledgerCode,
      });
    }
  };

  const handleSubmit = async (output: TransactionFormOutput) => {
    if (!userProfile?.email) return;

    setError('');
    setLoading(true);

    try {
      const vm = parseTransactionFormVM(output);

      if (vm.intentType === IntentType.DEBT_PAYMENT) {
        if (!vm.debtAccountId) throw new Error('請選擇貸款帳戶');
        const account = debtAccounts.find((item) => item.id === vm.debtAccountId) ?? null;
        const result = await createDebtPaymentUseCase.execute({
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

        if (result.newBalance <= 0) {
          setSettlementPrompt({
            debtAccountId: vm.debtAccountId,
            debtAccountName: account?.name ?? '貸款',
          });
        }
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

  const handleUpdate = async (transactionId: string, output: TransactionFormOutput) => {
    if (!userProfile?.email) return;

    setError('');
    setLoading(true);

    try {
      const vm = parseTransactionFormVM(output);

      if (vm.intentType === IntentType.DEBT_PAYMENT || vm.intentType === IntentType.TRANSFER) {
        throw new Error('目前不支援編輯還款與專案轉帳交易。');
      }

      const allocationData = mapTransactionVMToAllocationData(vm, transactionId);

      await updateTransactionUseCase.execute({
        householdId,
        transactionId,
        userEmail: userProfile.email,
        auth: {
          uid: currentUser?.uid ?? '',
          isGlobalAdmin: isAdmin ?? false,
        },
        data: mapTransactionVMToDomain(vm, userProfile.email),
        allocation: allocationData
          ? {
              transactionDate: allocationData.transactionDate,
              totalAmount: allocationData.totalAmount,
              items: allocationData.items,
              direction: allocationData.direction,
            }
          : null,
      });

      if (
        allocationData &&
        vm.intentType === IntentType.INCOME &&
        vm.ledgerCode?.startsWith('income:')
      ) {
        try {
          await upsertIncomeAllocationTemplateUseCase.execute({
            householdId,
            userEmail: userProfile.email,
            ledgerCode: vm.ledgerCode,
            items: allocationData.items,
          });
        } catch (templateError) {
          logger.warn('Failed to persist income allocation template', 'useTransactionForm', {
            templateError,
            ledgerCode: vm.ledgerCode,
          });
        }
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0]?.message || 'Invalid transaction form input.');
      } else {
        const e = err as Error;
        setError(e.message || 'Failed to update transaction.');
      }
    } finally {
      setLoading(false);
    }
  };

  const dismissSettlementPrompt = () => {
    setSettlementPrompt(null);
  };

  const confirmSettlementPrompt = async () => {
    if (!settlementPrompt || !userProfile?.email) return;

    try {
      await updateDebtAccountUseCase.execute({
        householdId,
        debtAccountId: settlementPrompt.debtAccountId,
        userEmail: userProfile.email,
        auth: {
          uid: currentUser?.uid ?? '',
          isGlobalAdmin: isAdmin ?? false,
        },
        data: {
          isActive: false,
          closedAt: new Date(),
        },
      });

      setSettlementPrompt(null);
      await fetchDebtAccounts();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to settle debt account.');
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
    loadIncomeAllocationTemplate,
    settlementPrompt,
    confirmSettlementPrompt,
    dismissSettlementPrompt,
    loading,
    error,
    handleSubmit,
    handleUpdate,
  };
};
