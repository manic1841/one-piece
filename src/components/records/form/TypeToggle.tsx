import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { type Record } from '@/domains/record/record';
import { FormType } from '@/domains/record/formType';

interface TypeToggleProps {
  type: FormType;
  onChanged?: <K extends keyof Record>(name: K, value: Record[K]) => void;
}

export const TypeToggle: React.FC<TypeToggleProps> = ({ type, onChanged }) => {
  return (
    <div className="space-y-2">
      <Label>Type</Label>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={type === FormType.EXPENSE ? 'default' : 'outline'}
          onClick={() => {
            onChanged?.('formType', FormType.EXPENSE);
          }}
          className={`flex-1 ${
            type === FormType.EXPENSE
              ? 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200'
              : ''
          }`}
        >
          支出
        </Button>
        <Button
          type="button"
          variant={type === FormType.INCOME ? 'default' : 'outline'}
          onClick={() => {
            onChanged?.('formType', FormType.INCOME);
          }}
          className={`flex-1 ${
            type === FormType.INCOME
              ? 'bg-green-100 text-green-700 hover:bg-green-200 border-green-200'
              : ''
          }`}
        >
          收入
        </Button>
        <Button
          type="button"
          variant={type === FormType.TRANSFER ? 'default' : 'outline'}
          onClick={() => {
            onChanged?.('formType', FormType.TRANSFER);
          }}
          className={`flex-1 ${
            type === FormType.TRANSFER
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
