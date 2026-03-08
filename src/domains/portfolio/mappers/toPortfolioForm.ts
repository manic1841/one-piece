import { type Portfolio, type PortfolioFormData } from '../types';

export const toPortfolioForm = (portfolio?: Portfolio): PortfolioFormData => {
  return {
    name: portfolio?.name || '',
    description: portfolio?.description || '',
    accountIds: portfolio?.accountIds || [],
    isActive: portfolio?.isActive ?? true,
    order: portfolio?.order ?? 0,
  };
};

export const toPortfolioFormData = (
  name: string,
  description: string,
  accountIds: string[],
  isActive: boolean,
  order: number,
): PortfolioFormData => {
  return {
    name,
    description: description || undefined,
    accountIds,
    isActive,
    order,
  };
};
