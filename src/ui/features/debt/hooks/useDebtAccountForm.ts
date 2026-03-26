import { useCallback, useEffect, useRef, useState } from 'react';

import { type DebtAccount, type DebtType } from '@/domains/debt/schemas';
import { type LoanCalcResult, calculateLoan } from '@/ui/features/debt/utils/loanCalculator';

export interface DebtFormValues {
  name: string;
  type: DebtType;
  repaymentType: 'equal_payment';
  originalAmount: string;
  currentBalance: string;
  interestRate: string;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;
  graceEndDate: string; // ISO date string YYYY-MM-DD or empty if no grace period
  disbursementDate: string; // ISO date string YYYY-MM-DD
  disbursementDescription: string;
  monthlyPayment: string;
  linkedProjectId: string;
  note: string;
}

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
  values: DebtFormValues;
  calcResult: LoanCalcResult | null;
  isManualPayment: boolean;
  isCreateMode: boolean;
  errors: Partial<Record<keyof DebtFormValues, string>>;
  setField: (field: keyof DebtFormValues, value: string) => void;
  setValidationErrors: (next: Partial<Record<keyof DebtFormValues, string>>) => void;
  resetCalc: () => void;
}

export function useDebtAccountForm(initialAccount?: DebtAccount): DebtAccountFormHook {
  const isCreateMode = !initialAccount;
  const [values, setValues] = useState<DebtFormValues>(
    initialAccount ? toFormValues(initialAccount) : emptyForm,
  );
  const [isManualPayment, setIsManualPayment] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof DebtFormValues, string>>>({});

  // Sync state when initialAccount changes (e.g. switching between edit targets or create/edit mode)
  useEffect(() => {
    setValues(initialAccount ? toFormValues(initialAccount) : emptyForm);
    setIsManualPayment(false);
    setErrors({});
  }, [initialAccount]);

  // In create mode, disbursement date defaults to start date unless user has changed it.
  useEffect(() => {
    if (!isCreateMode) return;
    setValues((prev) => {
      const shouldSyncDisbursementDate =
        !prev.disbursementDate || prev.disbursementDate === prev.startDate;
      if (!shouldSyncDisbursementDate) return prev;
      return {
        ...prev,
        disbursementDate: prev.startDate,
      };
    });
  }, [values.startDate, isCreateMode]);

  // In create mode, current balance must start at original amount.
  useEffect(() => {
    if (!isCreateMode) return;
    setValues((prev) => {
      if (prev.currentBalance === prev.originalAmount) return prev;
      return {
        ...prev,
        currentBalance: prev.originalAmount,
      };
    });
  }, [values.originalAmount, isCreateMode]);

  // Derived calc result (recalculated whenever trigger fields change, unless isManualPayment)
  const calcResult = tryCalc(values);

  // Auto-fill monthlyPayment when calc triggers change and user hasn't manually overridden
  const prevCalcRef = useRef<number | null>(null);
  useEffect(() => {
    if (isManualPayment) return;
    if (!calcResult) return;
    if (prevCalcRef.current === calcResult.monthlyPayment) return;
    prevCalcRef.current = calcResult.monthlyPayment;
    setValues((v) => ({ ...v, monthlyPayment: String(calcResult.monthlyPayment) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calcResult?.monthlyPayment, isManualPayment]);

  const setField = useCallback((field: keyof DebtFormValues, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));

    // If user edits monthlyPayment directly, mark as manual
    if (field === 'monthlyPayment') {
      setIsManualPayment(true);
    }
  }, []);

  /** Resets the manual override flag and re-applies calculated value */
  const resetCalc = useCallback(() => {
    setIsManualPayment(false);
    prevCalcRef.current = null; // force effect to re-apply
  }, []);

  const setValidationErrors = useCallback((next: Partial<Record<keyof DebtFormValues, string>>) => {
    setErrors(next);
  }, []);

  return {
    values,
    calcResult,
    isManualPayment,
    isCreateMode,
    errors,
    setField,
    setValidationErrors,
    resetCalc,
  };
}
