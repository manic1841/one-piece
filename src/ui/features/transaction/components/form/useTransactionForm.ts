import { useCallback, useEffect, useState } from 'react';

import { createAllocationUseCase } from '@/application/ledger/use_cases/createAllocationUseCase';
import { createTransactionUseCase } from '@/application/ledger/use_cases/createTransactionUseCase';
import { createDebtPaymentUseCase } from '@/application/debt/use_cases/createDebtPaymentUseCase';
import { DEFAULT_INTENT_MAPPINGS } from '@/domains/ledger/intentMapping';
import { type TransactionCreate } from '@/domains/ledger/schemas';
import { type DebtAccount } from '@/domains/debt/schemas';
import { projectService } from '@/domains/project/projectService';
import { useAuth } from '@/infra/contexts/useAuth';
import { listDebtAccountsUseCase } from '@/application/debt/use_cases/listDebtAccountsUseCase';
import {
  type TransactionFormCategoryOption,
  type TransactionFormOutput,
} from '@/ui/features/transaction/types/transaction';

const expenseCategories: TransactionFormCategoryOption[] = [
  ...DEFAULT_INTENT_MAPPINGS.filter((mapping) => mapping.type === 'EXPENSE').map((mapping) => ({
    value: mapping.debitLedgerCode,
    label: mapping.label,
  })),
  {
    value: 'expense:other',
    label: '其他支出',
  },
];

const incomeCategories: TransactionFormCategoryOption[] = [
  ...DEFAULT_INTENT_MAPPINGS.filter((mapping) => mapping.type === 'INCOME').map((mapping) => ({
    value: mapping.creditLedgerCode,
    label: mapping.label,
  })),
  {
    value: 'income:other',
    label: '其他收入',
  },
];

const investmentCategories: TransactionFormCategoryOption[] = DEFAULT_INTENT_MAPPINGS.filter(
  (mapping) => mapping.type === 'INVESTMENT',
).map((mapping) => ({
  value: `${mapping.debitLedgerCode}|${mapping.creditLedgerCode}`,
  label: mapping.label,
}));

const financingCategories: TransactionFormCategoryOption[] = DEFAULT_INTENT_MAPPINGS.filter(
  (mapping) => mapping.type === 'FINANCING',
).map((mapping) => ({
  value: `${mapping.debitLedgerCode}|${mapping.creditLedgerCode}`,
  label: mapping.label,
}));

const advancedCategories: TransactionFormCategoryOption[] = [
  ...expenseCategories,
  ...incomeCategories.filter((option) => option.value !== 'income:other'),
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

const buildInvestmentFinancingEntries = (
  amount: number,
  ledgerCode: string,
): TransactionCreate['entries'] => {
  const [debitLedgerCode, creditLedgerCode] = ledgerCode.split('|');
  return [
    {
      ledgerCode: debitLedgerCode,
      debit: amount,
      credit: 0,
    },
    {
      ledgerCode: creditLedgerCode,
      debit: 0,
      credit: amount,
    },
  ];
};

const buildAdvancedEntries = (amount: number, ledgerCode: string): TransactionCreate['entries'] =>
  ledgerCode.startsWith('income:')
    ? [
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
      ]
    : [
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
  switch (output.intentType) {
    case 'EXPENSE':
      if (!output.ledgerCode) {
        throw new Error('Expense requires a category.');
      }
      return buildExpenseEntries(output.amount, output.ledgerCode);
    case 'INCOME':
      if (!output.ledgerCode) {
        throw new Error('Income requires a category.');
      }
      return buildIncomeEntries(output.amount, output.ledgerCode);
    case 'INVESTMENT':
    case 'FINANCING':
      if (!output.ledgerCode || !output.ledgerCode.includes('|')) {
        throw new Error('Investment/financing requires a mapped debit-credit pair.');
      }
      return buildInvestmentFinancingEntries(output.amount, output.ledgerCode);
    case 'MANUAL':
    case 'TRANSFER':
      if (!output.ledgerCode) {
        throw new Error('Advanced entry requires a ledger category.');
      }
      return buildAdvancedEntries(output.amount, output.ledgerCode);
    default:
      throw new Error('Unsupported transaction type.');
  }
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

      if (output.intentType === 'DEBT_PAYMENT') {
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
      } else if (output.intentType === 'PROJECT_TRANSFER') {
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
    loading,
    error,
    handleSubmit,
  };
};
