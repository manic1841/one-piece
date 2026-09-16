import { useCallback, useRef, useState } from 'react';

import { z } from 'zod';

import { createTransactionWithAllocationUseCase } from '@/application/ledger/use_cases/createTransactionWithAllocationUseCase';
import { createTransactionUseCase } from '@/application/ledger/use_cases/createTransactionUseCase';
import { getIncomeAllocationTemplateUseCase } from '@/application/ledger/use_cases/getIncomeAllocationTemplateUseCase';
import { updateTransactionUseCase } from '@/application/ledger/use_cases/updateTransactionUseCase';
import { upsertIncomeAllocationTemplateUseCase } from '@/application/ledger/use_cases/upsertIncomeAllocationTemplateUseCase';
import { IntentType } from '@/domains/ledger/constants';
import { DEFAULT_INTENT_MAPPINGS } from '@/domains/ledger/intentMapping';
import { normalizeDescription } from '@/domains/operation/fingerprint';
import { useAuth } from '@/infra/contexts/useAuth';
import { getIntentLabel } from '@/ui/constants/transaction';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { useAuthContext } from '@/ui/hooks/useAuthContext';
import { type AllocationItemInput } from '@/ui/features/transaction/types/allocation';
import {
  type TransactionFormCategoryOption,
  type TransactionFormOutput,
} from '@/ui/features/transaction/types/transaction';
import {
  type TransactionFormVM,
  mapTransactionVMToAllocationInput,
  mapTransactionVMToAllocationData,
  mapTransactionVMToDomain,
  parseTransactionFormVM,
} from '@/ui/features/transaction/viewmodels/transaction.vm';
import { logger } from '@/utils/logger';

const expenseCategories: TransactionFormCategoryOption[] = [
  ...DEFAULT_INTENT_MAPPINGS.filter((mapping) => mapping.type === 'EXPENSE').map((mapping) => ({
    value: mapping.intent,
    label: getIntentLabel(mapping.intent),
  })),
];

const incomeCategories: TransactionFormCategoryOption[] = [
  ...DEFAULT_INTENT_MAPPINGS.filter((mapping) => mapping.type === 'INCOME').map((mapping) => ({
    value: mapping.intent,
    label: getIntentLabel(mapping.intent),
  })),
];

const investmentCategories: TransactionFormCategoryOption[] = DEFAULT_INTENT_MAPPINGS.filter(
  (mapping) => mapping.type === 'INVESTMENT',
).map((mapping) => ({
  value: mapping.intent,
  label: getIntentLabel(mapping.intent),
}));

const financingCategories: TransactionFormCategoryOption[] = DEFAULT_INTENT_MAPPINGS.filter(
  (mapping) => mapping.type === 'FINANCING',
).map((mapping) => ({
  value: mapping.intent,
  label: getIntentLabel(mapping.intent),
}));

const advancedCategories: TransactionFormCategoryOption[] = [
  ...expenseCategories,
  ...incomeCategories,
];

type TransactionWithAllocationAttempt = {
  signature: string;
  idempotencyKey: string;
};

const getTransactionWithAllocationAttemptSignature = (vm: TransactionFormVM): string =>
  JSON.stringify({
    intentType: vm.intentType,
    intent: vm.intent ?? null,
    date: vm.date,
    amount: vm.amount,
    ledgerCode: vm.ledgerCode ?? null,
    description: normalizeDescription(vm.description),
    projectId: vm.projectId ?? null,
    allocationDirection: vm.allocationDirection ?? null,
    allocationItems: vm.allocationItems ?? [],
  });

export const useTransactionForm = (
  householdId: string,
  onClose: () => void,
  onSuccess?: () => void,
) => {
  const { userProfile } = useAuth();
  const auth = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const incomeTemplateCacheRef = useRef<Map<string, AllocationItemInput[] | null>>(new Map());
  const transactionWithAllocationAttemptRef = useRef<TransactionWithAllocationAttempt | null>(null);
  const { codes: allActiveLedgerCodes } = useLedgerCodes(false);

  const getTransactionWithAllocationIdempotencyKey = (vm: TransactionFormVM): string => {
    const signature = getTransactionWithAllocationAttemptSignature(vm);
    if (transactionWithAllocationAttemptRef.current?.signature === signature) {
      return transactionWithAllocationAttemptRef.current.idempotencyKey;
    }

    const idempotencyKey = globalThis.crypto.randomUUID();
    transactionWithAllocationAttemptRef.current = { signature, idempotencyKey };
    return idempotencyKey;
  };

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

  const persistIncomeAllocationTemplate = async (input: {
    vm: TransactionFormVM;
    items: AllocationItemInput[];
    userEmail: string;
  }) => {
    const { vm, items, userEmail } = input;
    if (vm.intentType !== IntentType.INCOME || !vm.ledgerCode?.startsWith('income:')) {
      return;
    }

    try {
      await upsertIncomeAllocationTemplateUseCase.execute({
        householdId,
        userEmail,
        ledgerCode: vm.ledgerCode,
        items,
      });

      incomeTemplateCacheRef.current.set(vm.ledgerCode, items);
    } catch (templateError) {
      logger.warn('Failed to persist income allocation template', 'useTransactionForm', {
        templateError,
        ledgerCode: vm.ledgerCode,
      });
    }
  };

  const handleStandardTransaction = async (vm: TransactionFormVM) => {
    if (!userProfile?.email) return;
    const transactionData = mapTransactionVMToDomain(vm, userProfile.email);
    const allocationData = mapTransactionVMToAllocationInput(vm);

    if (allocationData) {
      await createTransactionWithAllocationUseCase.execute({
        householdId,
        userEmail: auth.email || '',
        auth,
        idempotencyKey: getTransactionWithAllocationIdempotencyKey(vm),
        data: transactionData,
        allocation: {
          direction: allocationData.direction,
          items: allocationData.items,
        },
      });

      await persistIncomeAllocationTemplate({
        vm,
        items: allocationData.items,
        userEmail: auth.email || '',
      });
    } else {
      await createTransactionUseCase.execute({
        householdId,
        userEmail: auth.email || '',
        data: transactionData,
      });
    }
  };

  const handleSubmit = async (output: TransactionFormOutput) => {
    if (!userProfile?.email) return;

    setError('');
    setLoading(true);

    try {
      const vm = parseTransactionFormVM(output);

      await handleStandardTransaction(vm);

      onClose();
      transactionWithAllocationAttemptRef.current = null;
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

      const allocationData = mapTransactionVMToAllocationData(vm, transactionId);

      await updateTransactionUseCase.execute({
        householdId,
        transactionId,
        userEmail: auth.email || '',
        auth,
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
            userEmail: auth.email || '',
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

  return {
    expenseCategories,
    incomeCategories,
    investmentCategories,
    financingCategories,
    advancedCategories,
    allActiveLedgerCodes,
    loadIncomeAllocationTemplate,
    loading,
    error,
    handleSubmit,
    handleUpdate,
  };
};
