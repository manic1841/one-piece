import { z } from 'zod';

import { optionalText } from '@/shared/schemas/coerce';

export type TradeDrawerSide = 'BUY' | 'SELL';

/**
 * Form VM for the trade drawer (ADR-0064). Type is a required choice between
 * the two sides; Amount is a required positive money value; Description and
 * Project are optional text (取消必填限制). The blank-input semantics come from
 * the shared coerce helpers: Amount errors on blank, Description stays missing.
 */
export const TradeDrawerSchema = z.object({
  side: z.enum(['BUY', 'SELL'], { error: '請選擇交易類型' }),
  amount: z
    .union([z.string(), z.number()])
    .transform((value) => (typeof value === 'string' ? value.trim() : value))
    .refine((value) => value !== '' && Number.isFinite(Number(value)), { error: '請輸入金額' })
    .transform((value) => Number(value))
    .refine((value) => value > 0, { error: '金額必須大於零' }),
  description: optionalText(),
  projectId: optionalText(),
});

export type TradeDrawerInput = z.input<typeof TradeDrawerSchema>;
export type TradeDrawerVM = z.output<typeof TradeDrawerSchema>;

export type TradeDrawerForm = {
  values: TradeDrawerInput;
  errors: Partial<Record<keyof TradeDrawerInput, { message?: string }>>;
  setValue: (name: keyof TradeDrawerInput, value: string) => void;
  isSubmitting: boolean;
  handleSubmit: (event?: React.BaseSyntheticEvent) => void | Promise<void>;
  reset: (values: TradeDrawerInput) => void;
};

export const createEmptyTradeDrawerInput = (side: TradeDrawerSide = 'BUY'): TradeDrawerInput => ({
  side,
  amount: '',
  description: '',
  projectId: '',
});

export const mapTradeDrawerVMToDraft = (
  vm: TradeDrawerVM,
): { side: TradeDrawerSide; amount: number; description?: string; projectId: string | null } => ({
  side: vm.side,
  amount: vm.amount,
  description: vm.description,
  projectId: vm.projectId === undefined || vm.projectId === '' ? null : vm.projectId,
});
