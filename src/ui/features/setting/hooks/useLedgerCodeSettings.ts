import { useMemo, useState } from 'react';

import { checkLedgerCodeInUseUseCase } from '@/application/ledger/use_cases/checkLedgerCodeInUseUseCase';
import { updateCustomLedgerCodeUseCase } from '@/application/ledger/use_cases/updateCustomLedgerCodeUseCase';
import { type LedgerCodeCandidate, parseLedgerCode } from '@/domains/ledger/ledgerCodeRules';
import {
  SETTINGS_LEDGER_TYPE_ORDER,
  type SettingsLedgerType,
} from '@/ui/constants/setting/settingsLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { type LedgerCodeItem, useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { useLedgerCodeForm } from '@/ui/features/setting/hooks/useLedgerCodeForm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

export { type LedgerCodeItem };

export interface LedgerCodeRow {
  item: LedgerCodeItem;
  isDetail: boolean;
  parentLabel?: string;
}

type GroupedLedgerCodeRows = Record<SettingsLedgerType, LedgerCodeRow[]>;

/** Details are listed right after their parent, one indent deeper. */
const buildGroupedRows = (codes: LedgerCodeItem[]): GroupedLedgerCodeRows => {
  // 每個類型都在迴圈內被指派，類型清單是單一來源，不會漏鍵。
  const grouped = {} as GroupedLedgerCodeRows;

  for (const type of SETTINGS_LEDGER_TYPE_ORDER) {
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
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');

  const candidates = useMemo<LedgerCodeCandidate[]>(
    () => codes.map(({ code, type, isActive }) => ({ code, type, isActive })),
    [codes],
  );

  const groupedRows = useMemo(() => buildGroupedRows(codes), [codes]);

  // 新增科目的表單狀態（RHF）由專屬 Controller hook 擁有；本 hook 只留列表／
  // 停用／就地改名的非表單職責（ADR-0064、§4）。
  const ledgerCodeForm = useLedgerCodeForm({ householdId, userEmail, candidates, refresh });

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
    editingCode,
    editValue,
    setEditValue,
    error,
    handleToggleActive,
    startEdit,
    cancelEdit,
    saveEdit,
    ledgerCodeForm,
  };
}
