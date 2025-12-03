import { type UnifiedRecord, FormType } from '../types';
import { validateExpenseForm } from './expenseValidator';
import { validateIncomeForm } from './incomeValidator';
import { validateTransferForm } from './transferValidator';

export type ValidationResult = {
  isValid: boolean;
  error: string;
};

export const validateForm = (formData: UnifiedRecord): ValidationResult => {
  if (formData.formType == FormType.expense) {
    return validateExpenseForm(formData);
  } else if (formData.formType == FormType.income) {
    return validateIncomeForm(formData);
  } else {
    return validateTransferForm(formData);
  }
};
