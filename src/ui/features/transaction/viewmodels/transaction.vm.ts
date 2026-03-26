import { z } from 'zod';

import { DEFAULT_INTENT_MAPPINGS } from '@/domains/ledger/intentMapping';
import { type TransactionCreate } from '@/domains/ledger/schemas';

const TransactionIntentTypeSchema = z.enum([
  'EXPENSE',
  'INCOME',
  'INVESTMENT',
  'FINANCING',
  'TRANSFER',
  'MANUAL',
  'DEBT_PAYMENT',
]);

const AllocationItemSchema = z.object({
  projectId: z.string().min(1, 'Project is required.'),
  percentage: z.number().positive('Allocation percentage must be greater than zero.'),
});

export const TransactionFormVMSchema = z
  .object({
    intentType: TransactionIntentTypeSchema,
    intent: z.string().optional(),
    date: z.string().min(1, 'Date is required.'),
    amount: z.number().positive('Amount must be greater than zero.'),
    projectId: z.string().optional(),
    ledgerCode: z.string().optional(),
    description: z.string().optional(),
    triggerAllocation: z.boolean().optional(),
    allocationItems: z.array(AllocationItemSchema).optional(),
    allocationDirection: z.enum(['INCOME', 'EXPENSE']).optional(),
    fromProjectId: z.string().optional(),
    toProjectId: z.string().optional(),
    debtAccountId: z.string().optional(),
    principal: z.number().nonnegative().optional(),
    interest: z.number().nonnegative().optional(),
  })
  .superRefine((value, context) => {
    if (value.intentType === 'TRANSFER') {
      if (!value.fromProjectId || !value.toProjectId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Please select both source and target projects.',
          path: ['fromProjectId'],
        });
      }
      if (value.fromProjectId && value.toProjectId && value.fromProjectId === value.toProjectId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Source and target projects must be different.',
          path: ['toProjectId'],
        });
      }
    }

    if (value.intentType === 'DEBT_PAYMENT' && !value.debtAccountId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: '請選擇貸款帳戶',
        path: ['debtAccountId'],
      });
    }

    if (value.triggerAllocation) {
      if (value.intentType !== 'INCOME' && value.intentType !== 'EXPENSE') {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Allocation is only supported for INCOME or EXPENSE.',
          path: ['intentType'],
        });
      }

      if (!value.allocationDirection) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Allocation direction is required.',
          path: ['allocationDirection'],
        });
      }

      if (!value.allocationItems || value.allocationItems.length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: '請至少填寫一筆分配。',
          path: ['allocationItems'],
        });
      } else {
        const totalPercentage = value.allocationItems.reduce(
          (sum, item) => sum + item.percentage,
          0,
        );
        if (Math.abs(totalPercentage - 100) > 0.01) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Allocation percentages must sum to 100%. Current sum: ${totalPercentage}%`,
            path: ['allocationItems'],
          });
        }
      }
    }
  });

export type TransactionFormVM = z.infer<typeof TransactionFormVMSchema>;

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

const resolveEntriesByIntent = (vm: TransactionFormVM): TransactionCreate['entries'] => {
  const mapping = DEFAULT_INTENT_MAPPINGS.find((item) => item.intent === vm.intent);
  const debitCode = mapping?.debitUserSelect ? vm.ledgerCode : mapping?.debitLedgerCode;
  const creditCode = mapping?.creditUserSelect ? vm.ledgerCode : mapping?.creditLedgerCode;

  if (!debitCode || !creditCode) {
    if (vm.ledgerCode) {
      if (vm.ledgerCode.startsWith('income:')) {
        return buildIncomeEntries(vm.amount, vm.ledgerCode);
      }
      return buildExpenseEntries(vm.amount, vm.ledgerCode);
    }
    throw new Error('Could not resolve ledger codes for this intent.');
  }

  return [
    {
      ledgerCode: debitCode,
      debit: vm.amount,
      credit: 0,
    },
    {
      ledgerCode: creditCode,
      debit: 0,
      credit: vm.amount,
    },
  ];
};

export const parseTransactionFormVM = (input: unknown): TransactionFormVM => {
  return TransactionFormVMSchema.parse(input);
};

export const mapTransactionVMToDomain = (
  vm: TransactionFormVM,
  userEmail: string,
): TransactionCreate => {
  if (vm.intentType === 'TRANSFER' || vm.intentType === 'DEBT_PAYMENT') {
    throw new Error(`Intent type ${vm.intentType} does not map to a standard transaction payload.`);
  }

  return {
    date: toDate(vm.date),
    description: vm.description,
    intent: vm.intent,
    intentType: vm.intentType,
    amount: vm.amount,
    projectId: vm.projectId ?? null,
    fromProjectId: vm.fromProjectId ?? null,
    toProjectId: vm.toProjectId ?? null,
    allocationId: null,
    createdBy: userEmail,
    entries: resolveEntriesByIntent(vm),
  };
};

export const mapTransactionVMToAllocationData = (
  vm: TransactionFormVM,
  transactionId: string,
): {
  transactionId: string;
  transactionDate: Date;
  totalAmount: number;
  items: { projectId: string; percentage: number }[];
  direction: 'INCOME' | 'EXPENSE';
} | null => {
  if (!vm.triggerAllocation) {
    return null;
  }

  if (vm.intentType !== 'INCOME' && vm.intentType !== 'EXPENSE') {
    return null;
  }

  if (!vm.allocationItems || vm.allocationItems.length === 0 || !vm.allocationDirection) {
    throw new Error('請至少填寫一筆分配。');
  }

  return {
    transactionId,
    transactionDate: toDate(vm.date),
    totalAmount: vm.amount,
    items: vm.allocationItems,
    direction: vm.allocationDirection,
  };
};
