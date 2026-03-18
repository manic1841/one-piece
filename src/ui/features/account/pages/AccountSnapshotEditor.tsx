import React, { useState } from 'react';

import { Save } from 'lucide-react';

import { type Account } from '@/domains/account/types/account';
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

interface AccountSnapshotEditorProps {
  account: Account;
  isOpen?: boolean;
  onClose: () => void;
}

const AccountSnapshotEditor: React.FC<AccountSnapshotEditorProps> = ({
  account,
  isOpen = true,
  onClose,
}) => {
  const { userProfile } = useAuth();
  const householdId = userProfile?.householdId || '';
  const { recordSnapshot, loading } = useAccountCmds(householdId);

  const today = new Date();
  const [formData, setFormData] = useState({
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    amount: 0,
    originalAmount: 0,
    exchangeRate: 1,
  });
  const [error, setError] = useState<string | null>(null);

  const handleDisplayChange = (field: keyof typeof formData, value: number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
      <DialogContent className="max-w-md">
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

          <div className="space-y-2">
            <Label>月底餘額 (折合台幣)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                NT$
              </span>
              <Input
                type="number"
                className="pl-12 text-lg font-bold"
                placeholder="0"
                value={formData.amount}
                onChange={(e) => handleDisplayChange('amount', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          {account.currency !== 'TWD' && (
            <div className="p-4 bg-blue-50 rounded-lg space-y-4">
              <div className="space-y-2">
                <Label>原始金額 ({account.currency})</Label>
                <Input
                  type="number"
                  value={formData.originalAmount || ''}
                  onChange={(e) =>
                    handleDisplayChange('originalAmount', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>匯率 (1 {account.currency} = ? TWD)</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={formData.exchangeRate || ''}
                  onChange={(e) =>
                    handleDisplayChange('exchangeRate', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
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
