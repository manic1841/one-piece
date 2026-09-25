import * as React from 'react';

import { Trash2 } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
  SelectField,
  TextInput,
  useFormField,
} from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/ui/components/ui/sheet';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { cn } from '@/ui/utils/cn';

import type {
  TradeDrawerInput,
  TradeDrawerSide,
  TradeDrawerVM,
} from '../viewmodels/tradeDrawer.vm';

export type TradeDrawerMode = 'ADD' | 'EDIT';

export interface TradeDrawerProps {
  open: boolean;
  /** Both sides are always offered; the drawer records which side was picked. */
  sides: readonly TradeDrawerSide[];
  sideLabels: Record<TradeDrawerSide, string>;
  title: string;
  /** RHF form from useTradeDrawerForm (ADR-0064); the drawer only renders. */
  form: UseFormReturn<TradeDrawerInput, unknown, TradeDrawerVM>;
  portfolios: { id: string; name: string }[];
  submitting: boolean;
  /** DELETE is offered for both loaded and unsaved rows; removal is local until confirm. */
  canDelete: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

const fieldLabelClass =
  'mb-1 block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground';

/**
 * 新增／編輯交易的 Drawer（ADR-0064）：Type 必選、Amount 必填（右對齊）、
 * Description 左對齊選填。編輯模式下放一個 DELETE（本機移除，確認時才刪
 * Firestore），表格維持乾淨。
 */
export const TradeDrawer: React.FC<TradeDrawerProps> = ({
  open,
  sides,
  sideLabels,
  title,
  form,
  portfolios,
  submitting,
  canDelete,
  onConfirm,
  onCancel,
  onDelete,
}) => {
  return (
    <Sheet open={open}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="rounded-t-2xl sm:max-w-md sm:rounded-none sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:rounded-l-2xl"
      >
        <SheetHeader>
          <SheetTitle className="font-mono text-sm font-semibold uppercase tracking-[0.08em] text-foreground">
            {title}
          </SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            noValidate
            className="mt-6 space-y-5"
          >
            <FormField name="side">
              <FormItem>
                <FormLabel className={fieldLabelClass}>{MONTHLY_CLOSE_LABELS.TYPE}</FormLabel>
                <div className="flex items-center gap-3">
                  {sides.map((side) => (
                    <SideButton
                      key={side}
                      side={side}
                      label={sideLabels[side]}
                      disabled={submitting}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField name="amount">
              <FormItem>
                <FormLabel className={fieldLabelClass}>{MONTHLY_CLOSE_LABELS.AMOUNT}</FormLabel>
                <FormControl>
                  <NumberInput
                    id="trade-draft-amount"
                    className="w-full"
                    min="0"
                    placeholder="0"
                    disabled={submitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField name="description">
              <FormItem>
                <FormLabel className={fieldLabelClass}>
                  {MONTHLY_CLOSE_LABELS.DESCRIPTION}
                </FormLabel>
                <FormControl>
                  <TextInput
                    id="trade-draft-description"
                    className="h-9 text-left"
                    disabled={submitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField name="projectId">
              <FormItem>
                <FormLabel className={fieldLabelClass}>{MONTHLY_CLOSE_LABELS.PROJECT}</FormLabel>
                <FormControl>
                  <SelectField
                    options={portfolios.map((portfolio) => ({
                      value: portfolio.id,
                      label: portfolio.name,
                    }))}
                    noneLabel={MONTHLY_CLOSE_LABELS.NO_PROJECT}
                    placeholder={MONTHLY_CLOSE_LABELS.NO_PROJECT}
                    disabled={submitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <div
              className={cn(
                'mt-8 flex items-center justify-between gap-3 border-t border-border pt-4',
              )}
            >
              {canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={submitting}
                  onClick={onDelete}
                  className="h-9 gap-1.5 px-3 text-negative hover:bg-negative/10"
                >
                  <Trash2 className="h-4 w-4" /> {MONTHLY_CLOSE_LABELS.DRAWER_DELETE}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={submitting}
                  onClick={onCancel}
                  className="h-9"
                >
                  {MONTHLY_CLOSE_LABELS.DRAWER_CANCEL}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="h-9 active:scale-[0.97]"
                >
                  {MONTHLY_CLOSE_LABELS.DRAWER_ADD}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
};

const SideButton = ({
  side,
  label,
  disabled,
}: {
  side: TradeDrawerSide;
  label: string;
  disabled: boolean;
}) => {
  const { field } = useFormField();
  return (
    <Button
      type="button"
      variant={field.value === side ? 'default' : 'outline'}
      size="sm"
      disabled={disabled}
      onClick={() => field.onChange(side)}
      className="h-9 px-5 font-mono text-xs"
    >
      {label}
    </Button>
  );
};
