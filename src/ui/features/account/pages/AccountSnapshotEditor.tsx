import React from 'react';

import { Save, Upload } from 'lucide-react';

import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import type { Account, AccountSnapshot } from '@/ui/features/account/viewmodels/account.vm';

import { AccountAmount } from '../components/form/AccountAmount';
import { AccountHolding } from '../components/form/AccountHolding';
import { useAccountSnapshotEditorForm } from '../hooks/useAccountSnapshotEditorForm';

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
  const {
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
  } = useAccountSnapshotEditorForm({ account, snapshot, onSaved: onClose });

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

        {error && (
          <div className="p-3 bg-destructive/15 text-destructive rounded-md text-sm">{error}</div>
        )}

        <form onSubmit={submit} className="space-y-6">
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
