import { type ProjectFormData } from '@/domains/project/types';

export const validate = (formData: ProjectFormData) => {
  // 驗證名稱
  if (!formData.name || formData.name.trim().length === 0) {
    return { isValid: false, error: '專案名稱不能為空' };
  }

  // 驗證類別
  if (!formData.category) {
    return { isValid: false, error: '請選擇專案類別' };
  }

  // 驗證圖示
  if (!formData.icon || formData.icon.trim().length === 0) {
    return { isValid: false, error: '請選擇圖示' };
  }

  // 驗證顏色
  if (!formData.color || formData.color.trim().length === 0) {
    return { isValid: false, error: '請選擇顏色' };
  }

  // 驗證會計設定
  if (formData.accounting.enabled) {
    // 如果啟用會計功能，至少需要一個會計分類
    const hasIncomeStatement = !!formData.accounting.incomeStatement?.category;
    const hasCashFlow = !!formData.accounting.cashFlow?.category;
    const hasBalanceSheet = !!formData.accounting.balanceSheet?.category;

    if (!hasIncomeStatement && !hasCashFlow && !hasBalanceSheet) {
      return { isValid: false, error: '啟用會計功能時，至少需要設定一個會計分類' };
    }
  }

  return { isValid: true, error: '' };
};
