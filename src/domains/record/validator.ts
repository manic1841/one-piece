import { type Record } from '@/domains/record/record';
import { FormType } from '@/domains/record/formType';

export type ValidationResult = {
  isValid: boolean;
  error: string;
};

export const validateForm = (formData: Record, showAllocations: boolean): ValidationResult => {
  if (formData.formType == FormType.EXPENSE) {
    return validateExpenseForm(formData);
  } else if (formData.formType == FormType.INCOME) {
    return validateIncomeForm(formData, showAllocations);
  } else {
    return validateTransferForm(formData);
  }
};

// Expense Form Validator
const validateExpenseForm = (formData: Record): ValidationResult => {
  if (!formData.amount || formData.amount <= 0) {
    return { isValid: false, error: '請輸入有效金額' };
  }

  if (!formData.category) {
    return { isValid: false, error: '請選擇類別' };
  }

  if (!formData.mainProjectId) {
    return { isValid: false, error: '請選擇專案' };
  }

  return { isValid: true, error: '' };
};

// Income Form Validator
const validateIncomeForm = (formData: Record, showAllocations: boolean): ValidationResult => {
  if (!formData.amount || formData.amount <= 0) {
    return { isValid: false, error: '請輸入有效金額' };
  }

  if (!formData.category) {
    return { isValid: false, error: '請選擇類別' };
  }

  if (!showAllocations && !formData.mainProjectId) {
    return { isValid: false, error: '請選擇專案' };
  }

  if (showAllocations) {
    const totalPercentage =
      formData.allocations?.reduce((sum, allocation) => sum + allocation.percentage, 0) || 0;
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return {
        isValid: false,
        error: `總分配金額必須為100%。目前: ${totalPercentage.toFixed(1)}%`,
      };
    }
  }

  return { isValid: true, error: '' };
};

// Transfer Form Validator
const validateTransferForm = (formData: Record): ValidationResult => {
  // NOT IMPLEMENTED
  if (!formData.amount || isNaN(formData.amount)) {
    return { isValid: false, error: '請輸入有效金額' };
  }
  // Only validate if both projects are selected that they're different
  if (
    formData.sourceProjectId &&
    formData.mainProjectId &&
    formData.sourceProjectId === formData.mainProjectId
  ) {
    return { isValid: false, error: '來源專案和目標專案不能相同' };
  }
  return { isValid: true, error: '' };
};
