import { useEffect, useRef } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import {
  type TradeDrawerInput,
  TradeDrawerSchema,
  type TradeDrawerSide,
  type TradeDrawerVM,
  createEmptyTradeDrawerInput,
  mapTradeDrawerVMToDraft,
} from '../viewmodels/tradeDrawer.vm';

interface UseTradeDrawerFormOptions {
  isOpen: boolean;
  /** The row being edited; undefined seeds a blank ADD draft. */
  editRow?: {
    side: TradeDrawerSide;
    amount?: number;
    description?: string;
    projectId?: string | null;
  };
  /** A row just confirmed but not yet persisted; DELETE removes it locally. */
  onDraftConfirm: (draft: {
    side: TradeDrawerSide;
    amount: number;
    description?: string;
    projectId: string | null;
  }) => void;
}

/**
 * Controller for the trade drawer (ADR-0064). Owns the RHF state; the drawer
 * only renders. The resolver drives field-level display, and the explicit
 * `TradeDrawerSchema.parse` in the submit handler is the authoritative gate
 * before the caller receives the mapped draft.
 */
export const useTradeDrawerForm = ({
  isOpen,
  editRow,
  onDraftConfirm,
}: UseTradeDrawerFormOptions) => {
  const form = useForm<TradeDrawerInput, unknown, TradeDrawerVM>({
    resolver: zodResolver(TradeDrawerSchema),
    mode: 'onTouched',
    defaultValues: createEmptyTradeDrawerInput(),
  });

  // Seed only on the closed→open transition: the edit row's object identity is
  // not stable across renders, so resetting on every open render would wipe
  // in-progress typing.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      wasOpen.current = false;
      return;
    }
    if (wasOpen.current) return;
    wasOpen.current = true;
    form.reset({
      ...createEmptyTradeDrawerInput(),
      ...(editRow
        ? {
            side: editRow.side,
            amount: editRow.amount?.toString() ?? '',
            description: editRow.description ?? '',
            projectId: editRow.projectId ?? '',
          }
        : {}),
    });
  }, [isOpen, editRow, form]);

  const submit = form.handleSubmit(async (vm) => {
    onDraftConfirm(mapTradeDrawerVMToDraft(vm));
  });

  return { form, submit };
};
