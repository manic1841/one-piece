import React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CashFlowInputProps {
  deposits: string;
  setDeposits: (v: string) => void;
  withdrawals: string;
  setWithdrawals: (v: string) => void;
}

export const CashFlowInput: React.FC<CashFlowInputProps> = ({
  deposits,
  setDeposits,
  withdrawals,
  setWithdrawals,
}) => {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-semibold">Monthly Cash Flow (Capital Movement)</Label>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label
            htmlFor="deposits"
            className="text-[10px] uppercase text-muted-foreground font-bold"
          >
            Deposits (New Capital)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
              $
            </span>
            <Input
              id="deposits"
              type="number"
              min="0"
              step="0.01"
              className="pl-7"
              value={deposits}
              onChange={(e) => setDeposits(e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="withdrawals"
            className="text-[10px] uppercase text-muted-foreground font-bold"
          >
            Withdrawals (Capital Out)
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
              $
            </span>
            <Input
              id="withdrawals"
              type="number"
              min="0"
              step="0.01"
              className="pl-7"
              value={withdrawals}
              onChange={(e) => setWithdrawals(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
