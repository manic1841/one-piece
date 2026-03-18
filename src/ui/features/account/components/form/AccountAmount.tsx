import React from 'react';

import { Input } from '@/ui/components/ui/input';
import { Label } from '@/ui/components/ui/label';

interface AccountAmountProps {
  currencyLabel?: string;
  amount: string;
  setAmount: (value: string) => void;
  originalAmount?: string;
  setOriginalAmount?: (value: string) => void;
  exchangeRate?: string;
  setExchangeRate?: (value: string) => void;
  currency?: string;
  fetchingRate?: boolean;
  fetchExchangeRate?: () => void;
  readonly: boolean;
}

export const AccountAmount: React.FC<AccountAmountProps> = ({
  currencyLabel,
  amount,
  setAmount,
  originalAmount,
  setOriginalAmount,
  exchangeRate,
  setExchangeRate,
  currency,
  fetchingRate,
  fetchExchangeRate,
  readonly,
}) => {
  const isForeignCurrency = currency && currency !== 'TWD' && !readonly;
  return (
    <div className="space-y-2">
      {isForeignCurrency && setOriginalAmount && setExchangeRate && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="originalAmount">Foreign Amount {currencyLabel}</Label>
            <Input
              id="originalAmount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={originalAmount || ''}
              onChange={(e) => setOriginalAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="exchangeRate">Exchange Rate</Label>
              {fetchExchangeRate && (
                <button
                  type="button"
                  onClick={fetchExchangeRate}
                  disabled={fetchingRate}
                  className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {fetchingRate ? 'Fetching...' : 'Fetch Rate'}
                </button>
              )}
            </div>
            <Input
              id="exchangeRate"
              type="number"
              step="0.0001"
              placeholder="0.00"
              value={exchangeRate || ''}
              onChange={(e) => setExchangeRate(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="space-y-2 mt-4">
        <Label htmlFor="amount">Balance (TWD)</Label>
        <Input
          id="amount"
          type="number"
          required
          step="0.01"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          readOnly={Boolean(readonly || isForeignCurrency)} // Auto-calculated if isForeignCurrency
          className={readonly || isForeignCurrency ? 'bg-muted' : ''}
        />
        {readonly && (
          <p className="text-xs text-muted-foreground mt-1">
            Calculated automatically from holdings total value.
          </p>
        )}
        {isForeignCurrency && (
          <p className="text-xs text-muted-foreground mt-1">
            TWD amount is auto-calculated: Foreign Amount ? Exchange Rate
          </p>
        )}
      </div>
    </div>
  );
};
