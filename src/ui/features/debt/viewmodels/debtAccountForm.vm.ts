import { z } from 'zod';

import { type DebtAccountCreate, DebtType, RepaymentType } from '@/domains/debt/schemas';

export const DebtAccountFormVMSchema = z
  .object({
    name: z.string().min(1, '必填'),
    type: z.enum(DebtType.options),
    repaymentType: z.enum(RepaymentType.options),
    originalAmount: z.string().min(1, '必填且須大於 0'),
    currentBalance: z.string().min(1, '必填且須大於 0'),
    interestRate: z.string().min(1, '必填且須 >= 0'),
    startDate: z.string().min(1, '必填'),
    endDate: z.string().min(1, '必填'),
    graceEndDate: z.string().optional(),
    disbursementDate: z.string().optional(),
    disbursementDescription: z.string().optional(),
    monthlyPayment: z.string().min(1, '必填且須大於 0'),
    linkedProjectId: z.string().optional(),
    note: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const originalAmount = Number.parseFloat(value.originalAmount);
    if (!Number.isFinite(originalAmount) || originalAmount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '必填且須大於 0',
        path: ['originalAmount'],
      });
    }

    const currentBalance = Number.parseFloat(value.currentBalance);
    if (!Number.isFinite(currentBalance) || currentBalance <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '必填且須大於 0',
        path: ['currentBalance'],
      });
    }

    const interestRate = Number.parseFloat(value.interestRate);
    if (!Number.isFinite(interestRate) || interestRate < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '必填且須 >= 0',
        path: ['interestRate'],
      });
    }

    const monthlyPayment = Number.parseFloat(value.monthlyPayment);
    if (!Number.isFinite(monthlyPayment) || monthlyPayment <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '必填且須大於 0',
        path: ['monthlyPayment'],
      });
    }

    if (value.startDate && value.endDate && value.endDate <= value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '結束日須晚於開始日',
        path: ['endDate'],
      });
    }

    if (value.graceEndDate) {
      if (value.startDate && value.graceEndDate <= value.startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '寬限期結束日須晚於還款開始日',
          path: ['graceEndDate'],
        });
      }
      if (value.endDate && value.graceEndDate > value.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '寬限期結束日須早於貸款到期日',
          path: ['graceEndDate'],
        });
      }
    }
  });

export type DebtAccountFormVM = z.infer<typeof DebtAccountFormVMSchema>;

export const parseDebtAccountFormVM = (
  values: unknown,
  isCreateMode: boolean,
): DebtAccountFormVM => {
  const vm = DebtAccountFormVMSchema.parse(values);
  if (isCreateMode && !vm.disbursementDate) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        message: '必填',
        path: ['disbursementDate'],
      },
    ]);
  }
  return vm;
};

export const mapDebtAccountVMToDomain = (
  vm: DebtAccountFormVM,
): Omit<DebtAccountCreate, 'linkedLedgerCode'> => {
  return {
    name: vm.name.trim(),
    type: vm.type,
    repaymentType: vm.repaymentType,
    originalAmount: Number.parseFloat(vm.originalAmount),
    currentBalance: Number.parseFloat(vm.currentBalance),
    interestRate: Number.parseFloat(vm.interestRate),
    startDate: new Date(vm.startDate),
    endDate: new Date(vm.endDate),
    graceEndDate: vm.graceEndDate ? new Date(vm.graceEndDate) : null,
    monthlyPayment: Number.parseFloat(vm.monthlyPayment),
    linkedProjectId: vm.linkedProjectId || null,
    note: vm.note || undefined,
    isActive: true,
  };
};

export const mapDebtAccountVMToCreateMeta = (
  vm: DebtAccountFormVM,
): { disbursementDate: Date; disbursementDescription?: string } | null => {
  if (!vm.disbursementDate) return null;
  return {
    disbursementDate: new Date(vm.disbursementDate),
    disbursementDescription: vm.disbursementDescription?.trim() || undefined,
  };
};

export const mapDebtFormZodErrorToFieldErrors = <TField extends string>(
  error: z.ZodError,
): Partial<Record<TField, string>> => {
  const fieldErrors: Partial<Record<TField, string>> = {};

  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== 'string') continue;
    if (!fieldErrors[key as TField]) {
      fieldErrors[key as TField] = issue.message;
    }
  }

  return fieldErrors;
};
