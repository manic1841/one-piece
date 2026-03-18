import type { Account, AccountSnapshotFormData } from '@/domains/account/types';
import { YearMonthPicker } from '@/ui/components/YearMonthPicker';
import { Card } from '@/ui/components/ui/card';
import { Label } from '@/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';

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
      <YearMonthPicker
        year={formData.year}
        month={formData.month}
        onYearChange={(year) => onUpdateFormData({ year })}
        onMonthChange={(month) => onUpdateFormData({ month })}
      />

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
