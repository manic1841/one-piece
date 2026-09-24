import { useCallback, useEffect, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { type UseFormReturn, useForm, useWatch } from 'react-hook-form';

import { type DebtAccount } from '@/domains/debt/schemas';

import { type LoanCalcResult, calculateLoan } from '../utils/loanCalculator';
import { type DebtAccountFormVM, DebtAccountFormVMSchema } from '../viewmodels/debtAccountForm.vm';

/** Field values are strings (native inputs); the schema coerces at its boundary. */
export type DebtFormValues = DebtAccountFormVM;

const emptyForm: DebtFormValues = {
  name: '',
  type: 'mortgage',
  repaymentType: 'equal_payment',
  originalAmount: '',
  currentBalance: '',
  interestRate: '',
  startDate: '',
  endDate: '',
  graceEndDate: '',
  disbursementDate: '',
  disbursementDescription: '',
  monthlyPayment: '',
  linkedProjectId: '',
  note: '',
};

function toFormValues(account: DebtAccount): DebtFormValues {
  const toDateStr = (d: Date | null | undefined) => (d ? d.toISOString().substring(0, 10) : '');
  return {
    name: account.name,
    type: account.type,
    repaymentType: account.repaymentType,
    originalAmount: String(account.originalAmount),
    currentBalance: String(account.currentBalance),
    interestRate: String(account.interestRate),
    startDate: toDateStr(account.startDate),
    endDate: toDateStr(account.endDate),
    graceEndDate: toDateStr(account.graceEndDate),
    disbursementDate: toDateStr(account.startDate),
    disbursementDescription: `${account.name} 借款入帳`,
    monthlyPayment: String(account.monthlyPayment),
    linkedProjectId: account.linkedProjectId ?? '',
    note: account.note ?? '',
  };
}

function tryCalc(values: DebtFormValues): LoanCalcResult | null {
  const amount = parseFloat(values.originalAmount);
  const rate = parseFloat(values.interestRate);
  const start = values.startDate ? new Date(values.startDate) : null;
  const end = values.endDate ? new Date(values.endDate) : null;
  const grace = values.graceEndDate ? new Date(values.graceEndDate) : undefined;

  if (!isNaN(amount) && !isNaN(rate) && start && end && end > start) {
    return calculateLoan({
      originalAmount: amount,
      interestRate: rate,
      startDate: start,
      endDate: end,
      graceEndDate: grace,
    });
  }
  return null;
}

export interface DebtAccountFormHook {
  /** The RHF form; the component binds fields through it. */
  form: UseFormReturn<DebtFormValues>;
  values: DebtFormValues;
  calcResult: LoanCalcResult | null;
  isManualPayment: boolean;
  isCreateMode: boolean;
  setValidationErrors: (next: Partial<Record<keyof DebtFormValues, string>>) => void;
  resetCalc: () => void;
}

/**
 * Controller for the debt form (ADR-0064).
 *
 * RHF owns the **editable** field state only. Everything derived stays here, out
 * of RHF: the loan calculator's `monthlyPayment`/previews (`calcResult`), the
 * manual-override flag, and the create-mode synchronization of
 * `disbursementDate` / `currentBalance`. Cross-field validation stays in the
 * schema's `superRefine`; the viewmodel's `parseDebtAccountFormVM` remains the
 * authoritative submit gate.
 */
export function useDebtAccountForm(initialAccount?: DebtAccount): DebtAccountFormHook {
  const isCreateMode = !initialAccount;

  const form = useForm<DebtFormValues>({
    resolver: zodResolver(DebtAccountFormVMSchema),
    mode: 'onTouched',
    defaultValues: initialAccount ? toFormValues(initialAccount) : emptyForm,
  });
  const { control, setValue, getValues, setError } = form;

  // Reset when the edit target or mode changes.
  useEffect(() => {
    form.reset(initialAccount ? toFormValues(initialAccount) : emptyForm);
  }, [initialAccount, form]);

  const watched = useWatch({ control });
  const values = (watched ?? emptyForm) as DebtFormValues;
  const { startDate, originalAmount, monthlyPayment } = values;

  // In create mode, disbursement date follows the start date until the user changes it.
  useEffect(() => {
    if (!isCreateMode) return;
    const disbursement = getValues('disbursementDate');
    if (!disbursement || disbursement === startDate) {
      setValue('disbursementDate', startDate);
    }
  }, [startDate, isCreateMode, getValues, setValue]);

  // In create mode, current balance must start at the original amount.
  useEffect(() => {
    if (!isCreateMode) return;
    if (getValues('currentBalance') !== originalAmount) {
      setValue('currentBalance', originalAmount);
    }
  }, [originalAmount, isCreateMode, getValues, setValue]);

  // Derived calc result (recalculated whenever the input fields change).
  const calcResult = useMemo(() => tryCalc(values), [values]);

  // A payment the calculator would not have produced is a manual override.
  const isManualPayment =
    calcResult !== null &&
    monthlyPayment !== '' &&
    Number(monthlyPayment) !== calcResult.monthlyPayment;

  // Auto-fill monthlyPayment from the calculator unless the user overrode it.
  useEffect(() => {
    if (isManualPayment || !calcResult) return;
    const next = String(calcResult.monthlyPayment);
    if (getValues('monthlyPayment') !== next) {
      setValue('monthlyPayment', next);
    }
  }, [calcResult, isManualPayment, getValues, setValue]);

  /** Drops the manual override and re-applies the calculated value. */
  const resetCalc = useCallback(() => {
    if (calcResult)
      setValue('monthlyPayment', String(calcResult.monthlyPayment), { shouldDirty: true });
  }, [calcResult, setValue]);

  /** Writes mapped Zod errors back into RHF so `FormMessage` renders them. */
  const setValidationErrors = useCallback(
    (next: Partial<Record<keyof DebtFormValues, string>>) => {
      for (const [field, message] of Object.entries(next)) {
        if (message) setError(field as keyof DebtFormValues, { message });
      }
    },
    [setError],
  );

  return {
    form,
    values,
    calcResult,
    isManualPayment,
    isCreateMode,
    setValidationErrors,
    resetCalc,
  };
}
