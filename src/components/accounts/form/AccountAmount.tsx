import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';

interface AccountAmountProps {
  currencyLabel?: string;
  amount: string;
  setAmount: (value: string) => void;
  readonly: boolean;
}

export const AccountAmount: React.FC<AccountAmountProps> = ({
  currencyLabel,
  amount,
  setAmount,
  readonly,
}) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="amount">Balance {currencyLabel}</Label>
      <Input
        id="amount"
        type="number"
        required
        step="0.01"
        placeholder="0.00"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        readOnly={readonly} // Read-only for investment accounts as it's calculated from holdings
        className={readonly ? 'bg-muted' : ''}
      />
      {readonly && (
        <p className="text-xs text-muted-foreground">
          Calculated automatically from holdings total value.
        </p>
      )}
    </div>
  );
};
