import { useMemo, useState } from 'react';

import { checkLedgerCodeInUseUseCase } from '@/application/ledger/use_cases/checkLedgerCodeInUseUseCase';
import { createCustomLedgerCodeUseCase } from '@/application/ledger/use_cases/createCustomLedgerCodeUseCase';
import { updateCustomLedgerCodeUseCase } from '@/application/ledger/use_cases/updateCustomLedgerCodeUseCase';
import {
  type LedgerCodeCandidate,
  type LedgerCodeViolation,
  depthTwoCodesOfType,
  parseLedgerCode,
  validateNewLedgerCode,
} from '@/domains/ledger/ledgerCodeRules';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { type LedgerCodeItem, useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

export { type LedgerCodeItem };

export interface LedgerCodeRow {
  item: LedgerCodeItem;
  isDetail: boolean;
  parentLabel?: string;
}

type GroupedLedgerCodeRows = {
  asset: LedgerCodeRow[];
  liability: LedgerCodeRow[];
  income: LedgerCodeRow[];
  expense: LedgerCodeRow[];
};

const GROUPED_TYPES = ['asset', 'liability', 'income', 'expense'] as const;

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

/** Details are listed right after their parent, one indent deeper. */
const buildGroupedRows = (codes: LedgerCodeItem[]): GroupedLedgerCodeRows => {
  const grouped = { asset: [], liability: [], income: [], expense: [] } as GroupedLedgerCodeRows;

  for (const type of GROUPED_TYPES) {
    const items = codes.filter((code) => code.type === type);
    const bases = items.filter((item) => parseLedgerCode(item.code)?.depth === 2);
    const details = items.filter((item) => parseLedgerCode(item.code)?.depth === 3);
    const isChildOf = (detail: LedgerCodeItem, base: LedgerCodeItem) =>
      detail.code.startsWith(`${base.code}:`);

    const rows: LedgerCodeRow[] = [];
    for (const base of bases) {
      rows.push({ item: base, isDetail: false });
      for (const detail of details.filter((detail) => isChildOf(detail, base))) {
        rows.push({ item: detail, isDetail: true, parentLabel: base.label });
      }
    }
    // A detail whose parent is absent from the list is still shown, unindented.
    for (const orphan of details.filter(
      (detail) => !bases.some((base) => isChildOf(detail, base)),
    )) {
      rows.push({ item: orphan, isDetail: true });
    }
    grouped[type] = rows;
  }

  return grouped;
};

export function useLedgerCodeSettings() {
  const { userProfile, user } = useAuthState();
  const householdId = userProfile?.householdId;
  const userEmail = user?.email;
  const auth = useAuthIdentity();

  const { codes, loading, refresh } = useLedgerCodes(true);
  const [newLabel, setNewLabel] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newType, setNewType] = useState<string>('expense');
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const candidates = useMemo<LedgerCodeCandidate[]>(
    () => codes.map(({ code, type, isActive }) => ({ code, type, isActive })),
    [codes],
  );

  const groupedRows = useMemo(() => buildGroupedRows(codes), [codes]);

  const handleAdd = async () => {
    if (!householdId || !userEmail) return;

    const label = newLabel.trim();
    const suffix = newCode.trim().toLowerCase();
    if (!suffix || !label) return;

    const code = `${newType}:${suffix}`;
    const validation = validateNewLedgerCode(code, candidates);
    if (!validation.valid) {
      setError(describeViolation(validation.violation, code, candidates));
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await createCustomLedgerCodeUseCase.execute({
        householdId,
        userEmail,
        auth,
        code,
        label,
      });

      setNewCode('');
      setNewLabel('');
      await refresh();
    } catch (err) {
      setError('新增失敗: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (
    item: Pick<LedgerCodeItem, 'code' | 'isActive' | 'isCustom'>,
  ) => {
    if (!householdId || !userEmail || !item.isCustom) return;

    if (item.isActive) {
      const activeDetails = codes.filter(
        (code) => code.isActive && code.code.startsWith(`${item.code}:`),
      );
      if (activeDetails.length > 0) {
        setError(
          `此科目底下仍有啟用的明細科目（${activeDetails.map((code) => code.code).join('、')}），請先停用它們。`,
        );
        return;
      }

      const inUse = await checkLedgerCodeInUseUseCase.execute({
        householdId,
        ledgerCode: item.code,
        auth,
      });
      if (inUse) {
        setError('該科目已在交易中使用，無法停用。');
        return;
      }
    }

    try {
      setError('');
      await updateCustomLedgerCodeUseCase.execute({
        householdId,
        ledgerCode: item.code,
        userEmail,
        auth,
        data: { isActive: !item.isActive },
      });
      await refresh();
    } catch (err) {
      setError('更新失敗: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const startEdit = (code: string, label: string) => {
    setEditingCode(code);
    setEditValue(label);
  };

  const cancelEdit = () => {
    setEditingCode(null);
    setEditValue('');
  };

  const saveEdit = async () => {
    if (!householdId || !userEmail || !editingCode) return;
    try {
      setError('');
      await updateCustomLedgerCodeUseCase.execute({
        householdId,
        ledgerCode: editingCode,
        userEmail,
        auth,
        data: { label: editValue.trim() },
      });
      cancelEdit();
      await refresh();
    } catch (err) {
      setError('更新失敗: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return {
    groupedRows,
    loading,
    newLabel,
    setNewLabel,
    newCode,
    setNewCode,
    newType,
    setNewType,
    editingCode,
    editValue,
    setEditValue,
    isSubmitting,
    error,
    handleAdd,
    handleToggleActive,
    startEdit,
    cancelEdit,
    saveEdit,
  };
}
