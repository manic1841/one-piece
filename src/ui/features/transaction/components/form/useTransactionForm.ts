import { useCallback, useEffect, useState } from 'react';

import { createDebtPaymentUseCase } from '@/application/debt/use_cases/createDebtPaymentUseCase';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import { createAllocationUseCase } from '@/application/ledger/use_cases/createAllocationUseCase';
import { createTransactionUseCase } from '@/application/ledger/use_cases/createTransactionUseCase';
import { type DebtAccount } from '@/domains/debt/schemas';
import { IntentType } from '@/domains/ledger/constants';
import { DEFAULT_INTENT_MAPPINGS } from '@/domains/ledger/intentMapping';
import { type TransactionCreate } from '@/domains/ledger/schemas';
import { projectService } from '@/domains/project/projectService';
import { useAuth } from '@/infra/contexts/useAuth';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import {
  type TransactionFormCategoryOption,
  type TransactionFormOutput,
} from '@/ui/features/transaction/types/transaction';

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

const buildExpenseEntries = (amount: number, ledgerCode: string): TransactionCreate['entries'] => [
  {
    ledgerCode,
    debit: amount,
    credit: 0,
  },
  {
    ledgerCode: 'asset:cash',
    debit: 0,
    credit: amount,
  },
];

const buildIncomeEntries = (amount: number, ledgerCode: string): TransactionCreate['entries'] => [
  {
    ledgerCode,
    debit: 0,
    credit: amount,
  },
  {
    ledgerCode: 'asset:cash',
    debit: amount,
    credit: 0,
  },
];

const buildStandardTransaction = (input: {
  output: TransactionFormOutput;
  userEmail: string;
  entries: TransactionCreate['entries'];
}): TransactionCreate => {
  const { output, userEmail, entries } = input;

  return {
    date: toDate(output.date),
    description: output.description,
    intentType: output.intentType,
    amount: output.amount,
    projectId: output.projectId ?? null,
    fromProjectId: output.fromProjectId ?? null,
    toProjectId: output.toProjectId ?? null,
    allocationId: null,
    createdBy: userEmail,
    entries,
  };
};

const buildEntriesByIntent = (output: TransactionFormOutput): TransactionCreate['entries'] => {
  const mapping = DEFAULT_INTENT_MAPPINGS.find((m) => m.intent === output.intent);

  // Use the explicitly provided ledgerCode if it exists (for dynamic selection)
  // Otherwise use the default from mapping
  const debitCode = mapping?.debitUserSelect ? output.ledgerCode : mapping?.debitLedgerCode;
  const creditCode = mapping?.creditUserSelect ? output.ledgerCode : mapping?.creditLedgerCode;

  if (!debitCode || !creditCode) {
    // Advanced/Manual handling fallback
    if (output.ledgerCode) {
      if (output.ledgerCode.startsWith('income:')) {
        return buildIncomeEntries(output.amount, output.ledgerCode);
      }
      return buildExpenseEntries(output.amount, output.ledgerCode);
    }
    throw new Error('Could not resolve ledger codes for this intent.');
  }

  return [
    {
      ledgerCode: debitCode,
      debit: output.amount,
      credit: 0,
    },
    {
      ledgerCode: creditCode,
      debit: 0,
      credit: output.amount,
    },
  ];
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
    output: TransactionFormOutput;
    transactionId: string;
    userEmail: string;
  }) => {
    const { output, transactionId, userEmail } = input;

    if (!output.triggerAllocation) {
      return;
    }

    if (output.intentType !== 'INCOME' && output.intentType !== 'EXPENSE') {
      return;
    }

    if (!output.allocationItems || output.allocationItems.length === 0) {
      throw new Error('請至少填寫一筆分配。');
    }

    await createAllocationUseCase.execute({
      householdId,
      userEmail,
      data: {
        transactionId,
        transactionDate: toDate(output.date),
        totalAmount: output.amount,
        items: output.allocationItems,
        direction: output.intentType,
      },
    });
  };

  const handleSubmit = async (output: TransactionFormOutput) => {
    if (!userProfile?.email) return;

    setError('');
    setLoading(true);

    try {
      if (output.amount <= 0) {
        throw new Error('Amount must be greater than zero.');
      }

      if (output.intentType === IntentType.DEBT_PAYMENT) {
        if (!output.debtAccountId) throw new Error('請選擇貸款帳戶');
        await createDebtPaymentUseCase.execute({
          householdId,
          userEmail: userProfile.email,
          auth: {
            uid: currentUser?.uid ?? '',
            isGlobalAdmin: isAdmin ?? false,
          },
          debtAccountId: output.debtAccountId,
          totalPayment: output.amount,
          date: new Date(`${output.date}T00:00:00`),
          description: output.description,
          projectId: output.projectId,
        });
      } else if (output.intentType === IntentType.TRANSFER) {
        if (!output.fromProjectId || !output.toProjectId) {
          throw new Error('Please select both source and target projects.');
        }

        await projectService.transferBetweenProjects(
          householdId,
          {
            fromProjectId: output.fromProjectId,
            toProjectId: output.toProjectId,
            amount: output.amount,
            date: toDate(output.date),
            description: output.description,
          },
          userProfile.email,
        );
      } else {
        const entries = buildEntriesByIntent(output);

        const transactionId = await createTransactionUseCase.execute({
          householdId,
          userEmail: userProfile.email,
          data: buildStandardTransaction({
            output,
            userEmail: userProfile.email,
            entries,
          }),
        });

        await executeAllocation({
          output,
          transactionId,
          userEmail: userProfile.email,
        });
      }

      onClose();
      if (onSuccess) onSuccess();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'Failed to save transaction.');
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
