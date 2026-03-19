import { useCallback, useEffect, useRef, useState } from 'react';

import { type DebtAccount, type DebtAccountCreate, type DebtType } from '@/domains/debt/schemas';
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
  monthlyPayment: '',
  linkedProjectId: '',
  note: '',
};

function toFormValues(account: DebtAccount): DebtFormValues {
  const toDateStr = (d: Date) => d.toISOString().substring(0, 10);
  return {
    name: account.name,
    type: account.type,
    repaymentType: account.repaymentType,
    originalAmount: String(account.originalAmount),
    currentBalance: String(account.currentBalance),
    interestRate: String(account.interestRate),
    startDate: toDateStr(account.startDate),
    endDate: toDateStr(account.endDate),
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

  if (!isNaN(amount) && !isNaN(rate) && start && end && end > start) {
    return calculateLoan({
      originalAmount: amount,
      interestRate: rate,
      startDate: start,
      endDate: end,
    });
  }
  return null;
}

export interface DebtAccountFormHook {
  values: DebtFormValues;
  calcResult: LoanCalcResult | null;
  isManualPayment: boolean;
  errors: Partial<Record<keyof DebtFormValues, string>>;
  setField: (field: keyof DebtFormValues, value: string) => void;
  resetCalc: () => void;
  validate: () => boolean;
  buildPayload: () => Omit<DebtAccountCreate, 'linkedLedgerCode'> | null;
}

export function useDebtAccountForm(initialAccount?: DebtAccount): DebtAccountFormHook {
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

  const validate = useCallback((): boolean => {
    const errs: Partial<Record<keyof DebtFormValues, string>> = {};

    if (!values.name.trim()) errs.name = '必填';
    if (!values.originalAmount || parseFloat(values.originalAmount) <= 0)
      errs.originalAmount = '必填且須大於 0';
    if (!values.currentBalance || parseFloat(values.currentBalance) <= 0)
      errs.currentBalance = '必填且須大於 0';
    if (values.interestRate === '' || parseFloat(values.interestRate) < 0)
      errs.interestRate = '必填且須 >= 0';
    if (!values.startDate) errs.startDate = '必填';
    if (!values.endDate) errs.endDate = '必填';
    if (values.startDate && values.endDate && values.endDate <= values.startDate) {
      errs.endDate = '結束日須晚於開始日';
    }
    if (!values.monthlyPayment || parseFloat(values.monthlyPayment) <= 0)
      errs.monthlyPayment = '必填且須大於 0';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [values]);

  const buildPayload = useCallback((): Omit<DebtAccountCreate, 'linkedLedgerCode'> | null => {
    if (!validate()) return null;
    return {
      name: values.name.trim(),
      type: values.type,
      repaymentType: values.repaymentType,
      originalAmount: parseFloat(values.originalAmount),
      currentBalance: parseFloat(values.currentBalance),
      interestRate: parseFloat(values.interestRate),
      startDate: new Date(values.startDate),
      endDate: new Date(values.endDate),
      monthlyPayment: parseFloat(values.monthlyPayment),
      linkedProjectId: values.linkedProjectId || null,
      note: values.note || undefined,
      isActive: true,
    };
  }, [values, validate]);

  return {
    values,
    calcResult,
    isManualPayment,
    errors,
    setField,
    resetCalc,
    validate,
    buildPayload,
  };
}
