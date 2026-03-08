import { type PortfolioSnapshotFormData } from '../types';

export const fromPortfolioSnapshotForm = (
  formData: PortfolioSnapshotFormData,
): { deposits: number; withdrawals: number } => {
  return {
    deposits: formData.deposits,
    withdrawals: formData.withdrawals,
  };
};
