import { type PortfolioCreate } from '@/schemas';

import { type PortfolioFormData } from '../types';

export const fromPortfolioForm = (formData: PortfolioFormData): PortfolioCreate => {
  return {
    name: formData.name,
    description: formData.description,
    accountIds: formData.accountIds,
    isActive: formData.isActive,
    order: formData.order,
  };
};
