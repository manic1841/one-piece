import { useMemo, useState } from 'react';

import { checkLedgerCodeInUseUseCase } from '@/application/ledger/use_cases/checkLedgerCodeInUseUseCase';
import { createCustomLedgerCodeUseCase } from '@/application/ledger/use_cases/createCustomLedgerCodeUseCase';
import { updateCustomLedgerCodeUseCase } from '@/application/ledger/use_cases/updateCustomLedgerCodeUseCase';
import { type LedgerType } from '@/domains/ledger/schemas';
import { useAuth } from '@/infra/contexts/useAuth';
import { type LedgerCodeItem, useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
export { type LedgerCodeItem };

export function useLedgerCodeSettings() {
  const { userProfile, currentUser, isAdmin } = useAuth();
  const householdId = userProfile?.householdId;
  const userEmail = currentUser?.email;
  const auth = useMemo(
    () => ({
      uid: currentUser?.uid ?? '',
      email: currentUser?.email ?? '',
      isGlobalAdmin: isAdmin,
    }),
    [currentUser, isAdmin],
  );

  const { codes, loading, refresh } = useLedgerCodes(true);
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newType, setNewType] = useState<string>('expense');
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const groupedCodes = useMemo<{
    asset: LedgerCodeItem[];
    liability: LedgerCodeItem[];
    income: LedgerCodeItem[];
    expense: LedgerCodeItem[];
  }>(
    () => ({
      asset: codes.filter((code: LedgerCodeItem) => code.type === 'asset'),
      liability: codes.filter((code: LedgerCodeItem) => code.type === 'liability'),
      income: codes.filter((code: LedgerCodeItem) => code.type === 'income'),
      expense: codes.filter((code: LedgerCodeItem) => code.type === 'expense'),
    }),
    [codes],
  );

  const handleAdd = async () => {
    if (!householdId || !userEmail || !newCategory.trim() || !newLabel.trim()) return;

    const fullCode = `${newType}:${newCategory.toLowerCase().trim()}`;

    if (codes.find((code: LedgerCodeItem) => code.code === fullCode)) {
      setError(`科目代碼 ${fullCode} 已存在。`);
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await createCustomLedgerCodeUseCase.execute({
        householdId,
        userEmail,
        auth,
        data: {
          code: fullCode,
          label: newLabel.trim(),
          type: newType as LedgerType,
          isCustom: true,
          isActive: true,
          createdBy: userEmail,
        },
      });

      setNewCategory('');
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
      const inUse = await checkLedgerCodeInUseUseCase.execute({
        householdId,
        ledgerCode: item.code,
        auth,
      });
      if (inUse) {
        alert('該科目已在交易中使用，無法停用。');
        return;
      }
    }

    try {
      await updateCustomLedgerCodeUseCase.execute({
        householdId,
        ledgerCode: item.code,
        userEmail,
        auth,
        data: { isActive: !item.isActive },
      });
      await refresh();
    } catch (err) {
      alert('更新失敗: ' + (err instanceof Error ? err.message : String(err)));
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
      alert('更新失敗: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return {
    groupedCodes,
    loading,
    newLabel,
    setNewLabel,
    newCategory,
    setNewCategory,
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
