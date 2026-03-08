import { type PortfolioSnapshot, type PortfolioSnapshotFormData } from '../types';

export const toPortfolioSnapshotForm = (
  snapshot?: PortfolioSnapshot,
): PortfolioSnapshotFormData => {
  const now = new Date();
  return {
    year: snapshot?.year || now.getFullYear(),
    month: snapshot?.month || now.getMonth() + 1,
    deposits: snapshot?.cashFlow.deposits || 0,
    withdrawals: snapshot?.cashFlow.withdrawals || 0,
  };
};

export const toPortfolioSnapshotFormData = (
  year: number,
  month: number,
  deposits: number | string,
  withdrawals: number | string,
): PortfolioSnapshotFormData => {
  return {
    year,
    month,
    deposits: typeof deposits === 'string' ? parseFloat(deposits) || 0 : deposits,
    withdrawals: typeof withdrawals === 'string' ? parseFloat(withdrawals) || 0 : withdrawals,
  };
};
