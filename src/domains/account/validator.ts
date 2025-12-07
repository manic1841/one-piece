import type { AccountFormData } from './types';

export const validate = (formData: AccountFormData) => {
  // 驗證名稱
  if (!formData.name || formData.name.trim().length === 0) {
    return { isValid: false, error: '帳戶名稱不能為空' };
  }

  // 驗證類別
  if (!formData.category || formData.category.trim().length === 0) {
    return { isValid: false, error: '請選擇帳戶類別' };
  }

  // 驗證幣別
  if (!formData.currency || formData.currency.trim().length === 0) {
    return { isValid: false, error: '請選擇幣別' };
  }

  return { isValid: true, error: '' };
};
