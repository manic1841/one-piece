import { useState } from 'react';
import type { FormEvent } from 'react';

import { z } from 'zod';

import { useAuthState } from '@/ui/contexts/useAuthState';
import { useExchangeRate } from '@/ui/hooks/useExchangeRate';

import {
  type Account,
  AccountCategory,
  type AccountSnapshot,
  type CurrencyCode,
  type Holding,
} from '../viewmodels/account.vm';
import {
  AccountSnapshotFormSchema,
  mapAccountSnapshotVMToDomain,
} from '../viewmodels/accountSnapshot.vm';
import {
  type AccountSnapshotEditorFormVM,
  addHoldingToForm,
  applyDisplayFieldChange,
  applyImportedHoldings,
  createSnapshotEditorFormVM,
  removeHoldingFromForm,
  updateHoldingInForm,
} from '../viewmodels/accountSnapshotEditor.vm';
import { useAccountCmds } from './useAccountCmds';
import { useAccountSnapshotQueries } from './useAccountSnapshotQueries';

interface UseAccountSnapshotEditorFormOptions {
  account: Account;
  snapshot?: AccountSnapshot;
  onSaved: () => void;
}

/**
 * Controller for the account snapshot editor. It owns the form state, the data
 * orchestration (snapshot commands/queries, exchange rate) and the authoritative
 * `AccountSnapshotFormSchema.parse` gate that used to run inside the page
 * (Surface). The component now only renders.
 *
 * The field state is still hand-rolled: a full RHF conversion of this editor
 * (holdings array + sub-forms) is tracked with the sub-form migration, per
 * ADR-0064's gradual migration note.
 */
export const useAccountSnapshotEditorForm = ({
  account,
  snapshot,
  onSaved,
}: UseAccountSnapshotEditorFormOptions) => {
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId || '';
  const { recordSnapshot, loading } = useAccountCmds(householdId);
  const { getPreviousSnapshot } = useAccountSnapshotQueries(householdId);
  const { getRate, loading: fetchingRate } = useExchangeRate();

  const isSecurities = account.category === AccountCategory.SECURITIES;

  const [formData, setFormData] = useState<AccountSnapshotEditorFormVM>(
    createSnapshotEditorFormVM(snapshot),
  );
  const [error, setError] = useState<string | null>(null);
  const [importingHoldings, setImportingHoldings] = useState(false);

  const handleDisplayChange = (field: keyof typeof formData, value: number) => {
    setFormData((prev) =>
      applyDisplayFieldChange(prev, field, value, {
        isSecurities,
        currency: account.currency,
      }),
    );
  };

  const handleFetchRate = async () => {
    if (account.currency === 'TWD') return;
    setError(null);
    const rate = await getRate(account.currency as CurrencyCode, 'TWD');
    if (!rate.ok) {
      setError('取得匯率失敗，請稍後再試或手動輸入匯率');
      return;
    }
    handleDisplayChange('exchangeRate', rate.value);
  };

  const handleAddHolding = () => {
    setFormData((prev) => addHoldingToForm(prev));
  };

  const handleRemoveHolding = (index: number) => {
    setFormData((prev) =>
      removeHoldingFromForm(prev, index, {
        isSecurities,
        currency: account.currency,
      }),
    );
  };

  const handleUpdateHolding = (index: number, field: keyof Holding, value: string | number) => {
    setFormData((prev) =>
      updateHoldingInForm(prev, index, field, value, {
        isSecurities,
        currency: account.currency,
      }),
    );
  };

  const handleImportPreviousHoldings = async () => {
    if (!isSecurities) return;

    try {
      setError(null);
      setImportingHoldings(true);

      const previousSnapshot = await getPreviousSnapshot(account.id, formData.year, formData.month);
      if (!previousSnapshot?.holdings || previousSnapshot.holdings.length === 0) {
        setError('上個月沒有可導入的持倉資料');
        return;
      }

      setFormData((prev) =>
        applyImportedHoldings(prev, previousSnapshot.holdings || [], {
          isSecurities,
          currency: account.currency,
        }),
      );
    } catch {
      setError('導入上月持倉失敗，請稍後再試');
    } finally {
      setImportingHoldings(false);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setError(null);
      const validatedData = AccountSnapshotFormSchema.parse(formData);
      const domainData = mapAccountSnapshotVMToDomain(account.id, validatedData);
      await recordSnapshot(account.id, domainData);
      onSaved();
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0]?.message || '請檢查輸入資料是否正確');
      } else {
        setError('請檢查輸入資料是否正確');
      }
    }
  };

  return {
    formData,
    error,
    loading,
    importingHoldings,
    fetchingRate,
    isSecurities,
    handleDisplayChange,
    handleFetchRate,
    handleAddHolding,
    handleRemoveHolding,
    handleUpdateHolding,
    handleImportPreviousHoldings,
    submit,
  };
};
