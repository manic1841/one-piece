import { type RecordFormData, RecordFormType } from '@/domains/record/types';

type ValidateArgs = {
  formData: RecordFormData;
  showAllocations?: boolean;
};

type ValidationResult = {
  isValid: boolean;
  error: string;
};

// Expense Form Validator
const validateExpenseForm = (args: ValidateArgs): ValidationResult => {
  const { formData } = args;
  if (!formData.amount || parseFloat(formData.amount) <= 0) {
    return { isValid: false, error: '請輸入有效金額' };
  }

  if (!formData.category) {
    return { isValid: false, error: '請選擇類別' };
  }

  if (!formData.projectId) {
    return { isValid: false, error: '請選擇專案' };
  }

  return { isValid: true, error: '' };
};

// Income Form Validator
const validateIncomeForm = (args: ValidateArgs): ValidationResult => {
  const { formData, showAllocations } = args;
  if (!formData.amount || parseFloat(formData.amount) <= 0) {
    return { isValid: false, error: '請輸入有效金額' };
  }

  if (!formData.category) {
    return { isValid: false, error: '請選擇類別' };
  }

  if (!showAllocations && !formData.projectId) {
    return { isValid: false, error: '請選擇專案' };
  }

  if (showAllocations) {
    const totalPercentage =
      formData.allocations?.reduce(
        (sum, allocation) => sum + parseFloat(allocation.percentage),
        0,
      ) || 0;
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
const validateTransferForm = (args: ValidateArgs): ValidationResult => {
  const { formData } = args;
  // NOT IMPLEMENTED
  if (!formData.amount || isNaN(parseFloat(formData.amount))) {
    return { isValid: false, error: '請輸入有效金額' };
  }
  // Only validate if both projects are selected that they're different
  if (
    formData.projectId &&
    formData.fromProjectId &&
    formData.projectId === formData.fromProjectId
  ) {
    return { isValid: false, error: '來源專案和目標專案不能相同' };
  }

  if (!formData.projectId && !formData.fromProjectId) {
    return { isValid: false, error: '請選擇來源專案或目標專案' };
  }

  return { isValid: true, error: '' };
};

const validators = {
  [RecordFormType.EXPENSE]: validateExpenseForm,
  [RecordFormType.INCOME]: validateIncomeForm,
  [RecordFormType.TRANSFER]: validateTransferForm,
} as const;

export const validateForm = (
  formData: RecordFormData,
  showAllocations: boolean,
): ValidationResult => {
  const validator = validators[formData.formType];
  if (!validator) {
    return { isValid: false, error: '未知的表單類型' };
  }
  return validator({ formData, showAllocations });
};
