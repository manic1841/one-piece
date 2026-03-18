import { nullOrData } from '@/ui/constants/empty';

import type { AccountFormData, AccountSnapshotFormData } from './types';

export const validate = (formData: AccountFormData) => {
  // 驗名稱
  if (!formData.name || formData.name.trim().length === 0) {
    return { isValid: false, error: '帳戶名稱不能為空' };
  }

  // 驗類別
  if (!formData.category || formData.category.trim().length === 0) {
    return { isValid: false, error: '請選擇帳戶類別' };
  }

  // 驗幣別
  if (!formData.currency || formData.currency.trim().length === 0) {
    return { isValid: false, error: '請選擇幣別' };
  }

  return { isValid: true, error: '' };
};

export const validateSnapshot = (formData: AccountSnapshotFormData) => {
  if (!nullOrData(formData.accountId)) {
    return { isValid: false, error: '請選擇帳戶' };
  }

  if (!formData.amount || parseFloat(formData.amount) < 0) {
    return { isValid: false, error: '請輸入正確的餘額' };
  }

  return { isValid: true, error: '' };
};
