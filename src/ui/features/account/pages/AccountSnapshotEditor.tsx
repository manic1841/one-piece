import React, { useState } from 'react';

import { Save, Upload } from 'lucide-react';
import { z } from 'zod';

import type { Holding } from '@/domains/account/schemas';
import { type Account, type AccountSnapshot } from '@/domains/account/types/account';
import { AccountCategory } from '@/domains/account/types/categories';
import type { CurrencyCode } from '@/domains/exchange_rate/types';
import { useAuth } from '@/infra/contexts/useAuth';
import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';

import { AccountAmount } from '../components/form/AccountAmount';
import { AccountHolding } from '../components/form/AccountHolding';
import { useExchangeRate } from '../hooks/useExchangeRate';
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

interface AccountSnapshotEditorProps {
  account: Account;
  isOpen?: boolean;
  snapshot?: AccountSnapshot;
  onClose: () => void;
}

const AccountSnapshotEditor: React.FC<AccountSnapshotEditorProps> = ({
  account,
  isOpen = true,
  snapshot,
  onClose,
}) => {
  const { userProfile } = useAuth();
  const householdId = userProfile?.householdId || '';
  const { recordSnapshot, getPreviousSnapshot, loading } = useAccountCmds(householdId);
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
    const rate = await getRate(account.currency as CurrencyCode, 'TWD');
    handleDisplayChange('exchangeRate', rate);
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      const validatedData = AccountSnapshotFormSchema.parse(formData);
      const domainData = mapAccountSnapshotVMToDomain(account.id, validatedData);
      await recordSnapshot(account.id, domainData);
      onClose();
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0]?.message || '請檢查輸入資料是否正確');
      } else {
        setError('請檢查輸入資料是否正確');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="w-[min(95vw,1200px)] max-w-5xl max-h-[90vh] overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>
            輸入月底餘額 - {account.name} ({account.currency})
          </DialogTitle>
        </DialogHeader>

        {error && <div className="p-3 bg-red-100 text-red-600 rounded-md text-sm">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-6">
          <YearMonthPicker
            year={formData.year}
            month={formData.month}
            onYearChange={(year) =>
              handleDisplayChange('year', parseInt(year) || new Date().getFullYear())
            }
            onMonthChange={(month) => handleDisplayChange('month', parseInt(month) || 1)}
            className="grid grid-cols-2 gap-4"
          />

          <AccountAmount
            currency={account.currency}
            currencyLabel={account.currency}
            amount={formData.amount.toString()}
            setAmount={(val) => handleDisplayChange('amount', parseFloat(val) || 0)}
            originalAmount={formData.originalAmount.toString()}
            setOriginalAmount={(val) => handleDisplayChange('originalAmount', parseFloat(val) || 0)}
            exchangeRate={formData.exchangeRate.toString()}
            setExchangeRate={(val) => handleDisplayChange('exchangeRate', parseFloat(val) || 0)}
            fetchExchangeRate={handleFetchRate}
            fetchingRate={fetchingRate}
            readonly={isSecurities && formData.holdings && formData.holdings.length > 0}
          />

          {isSecurities && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleImportPreviousHoldings}
                  disabled={importingHoldings || loading}
                  className="gap-2"
                >
                  <Upload size={16} />
                  {importingHoldings ? '導入中...' : '導入上月持倉'}
                </Button>
              </div>
              <AccountHolding
                holdings={formData.holdings || []}
                onAddHolding={handleAddHolding}
                onRemoveHolding={handleRemoveHolding}
                onUpdateHolding={handleUpdateHolding}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              取消
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Save size={18} />
              儲存餘額
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AccountSnapshotEditor;
