import { z } from 'zod';

import { type Portfolio, type PortfolioCreate } from '@/domains/portfolio/types/portfolio';

export const PortfolioFormVMSchema = z.object({
  name: z.string().trim().min(1, '投資組合名稱不能為空'),
  description: z.string().optional(),
  accountIds: z.array(z.string().min(1)).default([]),
  isActive: z.boolean(),
  order: z.number().int().min(0, '排序不能小於 0'),
});

export type PortfolioFormVM = z.infer<typeof PortfolioFormVMSchema>;

export const createDefaultPortfolioFormVM = (): PortfolioFormVM => {
  return {
    name: '',
    description: '',
    accountIds: [],
    isActive: true,
    order: 0,
  };
};

export const mapPortfolioToFormVM = (portfolio?: Portfolio): PortfolioFormVM => {
  if (!portfolio) return createDefaultPortfolioFormVM();
  return {
    name: portfolio.name,
    description: portfolio.description || '',
    accountIds: portfolio.accountIds,
    isActive: portfolio.isActive,
    order: portfolio.order || 0,
  };
};

export const parsePortfolioFormVM = (input: unknown): PortfolioFormVM => {
  return PortfolioFormVMSchema.parse(input);
};

export const mapPortfolioVMToDomain = (vm: PortfolioFormVM): PortfolioCreate => {
  return {
    name: vm.name,
    description: vm.description,
    accountIds: vm.accountIds,
    isActive: vm.isActive,
    order: vm.order,
  };
};

export const PortfolioSnapshotFormVMSchema = z.object({
  year: z.number().int().min(1900).max(3000),
  month: z.number().int().min(1).max(12),
  deposits: z.number().min(0, '入金不能小於 0'),
  withdrawals: z.number().min(0, '出金不能小於 0'),
});

export type PortfolioSnapshotFormVM = z.infer<typeof PortfolioSnapshotFormVMSchema>;

export const createDefaultPortfolioSnapshotFormVM = (): PortfolioSnapshotFormVM => {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    deposits: 0,
    withdrawals: 0,
  };
};

export const parsePortfolioSnapshotFormVM = (input: unknown): PortfolioSnapshotFormVM => {
  return PortfolioSnapshotFormVMSchema.parse(input);
};

export const mapPortfolioSnapshotVMToDomain = (
  vm: PortfolioSnapshotFormVM,
): { deposits: number; withdrawals: number } => {
  return {
    deposits: vm.deposits,
    withdrawals: vm.withdrawals,
  };
};

export const mapPortfolioSnapshotInputsToVM = (
  year: number,
  month: number,
  deposits: number | string,
  withdrawals: number | string,
): PortfolioSnapshotFormVM => {
  return parsePortfolioSnapshotFormVM({
    year,
    month,
    deposits: typeof deposits === 'string' ? parseFloat(deposits) || 0 : deposits,
    withdrawals: typeof withdrawals === 'string' ? parseFloat(withdrawals) || 0 : withdrawals,
  });
};
