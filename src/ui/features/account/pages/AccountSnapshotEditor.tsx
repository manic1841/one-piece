import React, { useState } from 'react';

import { Save } from 'lucide-react';

import { type Account, type AccountSnapshot } from '@/domains/account/types/account';
import { useAuth } from '@/infra/contexts/useAuth';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';
import { useAccountCmds } from '@/ui/features/account/hooks/useAccountCmds';

import {
  AccountSnapshotFormSchema,
  mapAccountSnapshotVMToDomain,
} from '../viewmodels/accountSnapshot.vm';
import { AccountAmount } from '../components/form/AccountAmount';
import { AccountHolding } from '../components/form/AccountHolding';
import { useExchangeRate } from '../hooks/useExchangeRate';
import { AccountCategory } from '@/domains/account/types/categories';
import type { Holding } from '@/domains/account/schemas';
import type { CurrencyCode } from '@/domains/exchange_rate/types';

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
  const { recordSnapshot, loading } = useAccountCmds(householdId);
  const { getRate, loading: fetchingRate } = useExchangeRate();

  const isSecurities = account.category === AccountCategory.SECURITIES;

  const today = new Date();
  const [formData, setFormData] = useState({
    year: snapshot?.year ?? today.getFullYear(),
    month: snapshot?.month ?? today.getMonth() + 1,
    amount: snapshot?.amount ?? 0,
    originalAmount: snapshot?.originalAmount ?? 0,
    exchangeRate: snapshot?.exchangeRate ?? 1,
    holdings: snapshot?.holdings ?? [],
  });
  const [error, setError] = useState<string | null>(null);

  const handleDisplayChange = (field: keyof typeof formData, value: number) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (isSecurities && updated.holdings && updated.holdings.length > 0) {
        if (field === 'exchangeRate' && account.currency !== 'TWD') {
          updated.amount = updated.originalAmount * updated.exchangeRate;
        }
      } else {
        if (account.currency !== 'TWD' && (field === 'originalAmount' || field === 'exchangeRate')) {
          updated.amount = updated.originalAmount * updated.exchangeRate;
        }
      }
      return updated;
    });
  };

  const handleFetchRate = async () => {
    if (account.currency === 'TWD') return;
    const rate = await getRate(account.currency as CurrencyCode, 'TWD');
    handleDisplayChange('exchangeRate', rate);
  };

  const handleAddHolding = () => {
    setFormData((prev) => ({
      ...prev,
      holdings: [
        ...(prev.holdings || []),
        { symbol: '', name: '', quantity: 0, cost: 0, marketValue: 0 },
      ],
    }));
  };

  const handleRemoveHolding = (index: number) => {
    setFormData((prev) => {
      const newHoldings = [...(prev.holdings || [])];
      newHoldings.splice(index, 1);
      
      const updated = { ...prev, holdings: newHoldings };
      if (isSecurities) {
         const total = newHoldings.reduce((sum, h) => sum + (h.marketValue || 0), 0);
         if (account.currency !== 'TWD') {
             updated.originalAmount = total;
             updated.amount = total * updated.exchangeRate;
         } else {
             updated.amount = total;
         }
      }
      return updated;
    });
  };

  const handleUpdateHolding = (index: number, field: keyof Holding, value: string | number) => {
    setFormData((prev) => {
      const newHoldings = [...(prev.holdings || [])];
      let finalValue: string | number = value;
      if (['quantity', 'cost', 'marketValue', 'leverage'].includes(field)) {
        finalValue = typeof value === 'string' ? parseFloat(value) || 0 : value;
      }
      newHoldings[index] = { ...newHoldings[index], [field]: finalValue };
      
      const updated = { ...prev, holdings: newHoldings };
      if (isSecurities) {
         const total = newHoldings.reduce((sum, h) => sum + (h.marketValue || 0), 0);
         if (account.currency !== 'TWD') {
             updated.originalAmount = total;
             updated.amount = total * updated.exchangeRate;
         } else {
             updated.amount = total;
         }
      }
      return updated;
    });
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
      const error = err as { errors?: { message: string }[] };
      if (error.errors && error.errors.length > 0) {
        setError(error.errors[0].message);
      } else {
        setError('請檢查輸入資料是否正確');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            輸入月底餘額 - {account.name} ({account.currency})
          </DialogTitle>
        </DialogHeader>

        {error && <div className="p-3 bg-red-100 text-red-600 rounded-md text-sm">{error}</div>}

        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>年份</Label>
              <Input
                type="number"
                value={formData.year}
                onChange={(e) =>
                  handleDisplayChange('year', parseInt(e.target.value) || new Date().getFullYear())
                }
              />
            </div>
            <div className="space-y-2">
              <Label>月份</Label>
              <Input
                type="number"
                min={1}
                max={12}
                value={formData.month}
                onChange={(e) => handleDisplayChange('month', parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

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
            <AccountHolding
              holdings={formData.holdings || []}
              onAddHolding={handleAddHolding}
              onRemoveHolding={handleRemoveHolding}
              onUpdateHolding={handleUpdateHolding}
            />
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
