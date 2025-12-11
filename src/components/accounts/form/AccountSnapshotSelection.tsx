import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Account, AccountSnapshotFormData } from '@/domains/account/types';

interface AccountSnapshotSelectionProps {
  accounts?: Account[];
  formData: AccountSnapshotFormData;
  onUpdateFormData: (data: Partial<AccountSnapshotFormData>) => void;
  previousAmount?: number;
}

export const AccountSnapshotSelection: React.FC<AccountSnapshotSelectionProps> = ({
  accounts,
  formData,
  onUpdateFormData,
  previousAmount,
}) => {
  return (
    <>
      {/* Account Selection */}
      {accounts && (
        <div className="space-y-2">
          <Label htmlFor="account">Account</Label>
          <Select
            value={formData.accountId}
            onValueChange={(val) => onUpdateFormData({ accountId: val })}
          >
            <SelectTrigger id="account">
              <SelectValue placeholder="Select an account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Year & Month */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            type="number"
            required
            min="2000"
            max="2100"
            value={formData.year}
            onChange={(e) => onUpdateFormData({ year: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="month">Month</Label>
          <Select value={formData.month} onValueChange={(val) => onUpdateFormData({ month: val })}>
            <SelectTrigger id="month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <SelectItem key={m} value={m.toString()}>
                  {m}月
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Previous Balance Reference */}
      {previousAmount && formData.accountId && (
        <Card className="bg-blue-50 border-blue-200 p-3">
          <p className="text-sm text-blue-700">
            Previous month's balance:{' '}
            <span className="font-semibold">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: formData.currency,
              }).format(previousAmount)}
            </span>
          </p>
        </Card>
      )}
    </>
  );
};
