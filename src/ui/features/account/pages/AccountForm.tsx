import React from 'react';

import { X } from 'lucide-react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
  SelectField,
  TextInput,
} from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { AccountCategoryOptions, CurrencyOptions } from '@/ui/constants/account/label';

import { useAccountForm } from '../hooks/useAccountForm';
import type { AccountCreate } from '../viewmodels/account.vm';

interface AccountFormProps {
  onSubmit: (data: AccountCreate) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const AccountForm: React.FC<AccountFormProps> = ({ onSubmit, onCancel, loading }) => {
  const { form, submit } = useAccountForm(onSubmit);

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50">
        <h3 className="text-lg font-semibold text-foreground">新增帳戶</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-muted-foreground hover:text-muted-foreground"
        >
          <X size={20} />
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={submit} className="p-6 space-y-4">
          <FormField name="name">
            <FormItem>
              <FormLabel required>帳戶名稱</FormLabel>
              <FormControl>
                <TextInput placeholder="例如：台銀、中信、富邦" />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField name="category">
              <FormItem>
                <FormLabel required>帳戶類別</FormLabel>
                <FormControl>
                  <SelectField options={AccountCategoryOptions} placeholder="選擇類別" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField name="currency">
              <FormItem>
                <FormLabel required>幣別</FormLabel>
                <FormControl>
                  <SelectField options={CurrencyOptions} placeholder="選擇幣別" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>
          </div>

          <FormField name="order">
            <FormItem>
              <FormLabel>顯示順序</FormLabel>
              <FormControl>
                <NumberInput />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              建立帳戶
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AccountForm;
