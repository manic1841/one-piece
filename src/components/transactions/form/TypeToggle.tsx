import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { type UnifiedRecord, FormType } from './types';

interface TypeToggleProps {
  type: FormType;
  onChanged?: <K extends keyof UnifiedRecord>(name: K, value: UnifiedRecord[K]) => void;
}

export const TypeToggle: React.FC<TypeToggleProps> = ({ type, onChanged }) => {
  return (
    <div className="space-y-2">
      <Label>Type</Label>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={type === FormType.expense ? 'default' : 'outline'}
          onClick={() => {
            onChanged?.('transactionType', FormType.expense);
          }}
          className={`flex-1 ${
            type === FormType.expense
              ? 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200'
              : ''
          }`}
        >
          支出
        </Button>
        <Button
          type="button"
          variant={type === FormType.income ? 'default' : 'outline'}
          onClick={() => {
            onChanged?.('transactionType', FormType.income);
          }}
          className={`flex-1 ${
            type === FormType.income
              ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200'
              : ''
          }`}
        >
          收入
        </Button>
        <Button
          type="button"
          variant={type === FormType.transfer ? 'default' : 'outline'}
          onClick={() => {
            onChanged?.('transactionType', FormType.transfer);
          }}
          className={`flex-1 ${
            type === FormType.transfer
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200'
              : ''
          }`}
        >
          轉帳
        </Button>
      </div>
    </div>
  );
};
