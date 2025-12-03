import { type UnifiedRecord } from '../types';
import { type ValidationResult } from './index';

export const validateIncomeForm = (formData: UnifiedRecord): ValidationResult => {
  // NOT IMPLEMENTED
  const amount = Number(formData.amount);
  if (amount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }
  return { isValid: true, error: 'Not implemented' };
};
