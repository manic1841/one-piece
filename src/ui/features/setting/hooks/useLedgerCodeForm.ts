import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { createCustomLedgerCodeUseCase } from '@/application/ledger/use_cases/createCustomLedgerCodeUseCase';
import {
  type LedgerCodeCandidate,
  type LedgerCodeViolation,
  depthTwoCodesOfType,
  validateNewLedgerCode,
} from '@/domains/ledger/ledgerCodeRules';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

import {
  LedgerCodeFormSchema,
  type LedgerCodeFormVM,
  createDefaultLedgerCodeFormVM,
} from '../viewmodels/ledgerCodeForm.vm';

/** Maps a domain violation to the message shown as the form root error. */
const describeViolation = (
  violation: LedgerCodeViolation,
  code: string,
  candidates: LedgerCodeCandidate[],
): string => {
  const type = code.split(':')[0];
  const parent = code.split(':').slice(0, 2).join(':');

  switch (violation) {
    case 'INVALID_SHAPE':
      return '科目代碼格式不正確：請輸入 category（如 property）或 category:detail（如 property:taipei），僅限小寫英數字與底線。';
    case 'UNKNOWN_TYPE':
      return `不支援的科目類型 ${type}。`;
    case 'DUPLICATE':
      return `科目代碼 ${code} 已存在。`;
    case 'PARENT_INACTIVE':
      return `父科目 ${parent} 已停用，請先啟用或改選其他 category。`;
    case 'PARENT_MISSING': {
      const available = depthTwoCodesOfType(candidates, type);
      return available.length > 0
        ? `父科目 ${parent} 不存在，請先建立它。此類型可用的 category：${available.join('、')}。`
        : `父科目 ${parent} 不存在，請先建立它。`;
    }
  }
};

interface UseLedgerCodeFormArgs {
  householdId?: string;
  userEmail?: string;
  candidates: LedgerCodeCandidate[];
  /** Reloads the code list after a successful create. */
  refresh: () => Promise<void>;
}

/**
 * Controller for the add-custom-ledger-code dialog (ADR-0064 / §4). The schema
 * owns shape presence; the domain rules remain the authority for the code itself
 * and surface as the form root error.
 */
export function useLedgerCodeForm({
  householdId,
  userEmail,
  candidates,
  refresh,
}: UseLedgerCodeFormArgs) {
  const auth = useAuthIdentity();

  const form = useForm<LedgerCodeFormVM>({
    resolver: zodResolver(LedgerCodeFormSchema),
    mode: 'onTouched',
    defaultValues: createDefaultLedgerCodeFormVM(),
  });
  const [error, setError] = useState('');

  /** @returns `true` when the code was created (the dialog may close); `false` on validation or write failure. */
  const submit = async (): Promise<boolean> => {
    let created = false;

    await form.handleSubmit(async (vm) => {
      if (!householdId || !userEmail) return;

      const parsed = LedgerCodeFormSchema.parse(vm);
      const code = `${parsed.type}:${parsed.code}`;
      const validation = validateNewLedgerCode(code, candidates);
      if (!validation.valid) {
        setError(describeViolation(validation.violation, code, candidates));
        return;
      }

      setError('');
      try {
        await createCustomLedgerCodeUseCase.execute({
          householdId,
          userEmail,
          auth,
          code,
          label: parsed.label,
        });
        form.reset({ type: parsed.type, code: '', label: '' });
        await refresh();
        created = true;
      } catch (err) {
        setError('新增失敗: ' + (err instanceof Error ? err.message : String(err)));
      }
    })();

    return created;
  };

  return {
    form,
    submit,
    error,
    isSubmitting: form.formState.isSubmitting,
  };
}
