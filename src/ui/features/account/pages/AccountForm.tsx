import React, { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { type Account, type AccountCreate } from '@/domains/account/types/account';
import { AccountCategory, CurrencyType } from '@/domains/account/types/categories';
import { Button } from '@/ui/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/ui/components/ui/form';
import { Input } from '@/ui/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/components/ui/select';

import {
  AccountFormSchema,
  type AccountFormVM,
  mapAccountVMToDomain,
} from '../viewmodels/account.vm';

interface AccountFormProps {
  initialData?: Account | null;
  onSubmit: (data: AccountCreate) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const AccountForm: React.FC<AccountFormProps> = ({ initialData, onSubmit, onCancel, loading }) => {
  const form = useForm<AccountFormVM>({
    resolver: zodResolver(AccountFormSchema),
    defaultValues: {
      name: '',
      category: AccountCategory.BANK,
      currency: CurrencyType.TWD,
      order: 0,
    },
  });

  const handleFormSubmit = async (data: AccountFormVM) => {
    const domainData = mapAccountVMToDomain(data);
    await onSubmit(domainData);
  };

  useEffect(() => {
    if (initialData) {
      form.reset({
        name: initialData.name,
        category: initialData.category,
        currency: initialData.currency,
        order: initialData.order,
      });
    }
  }, [initialData, form]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 className="text-lg font-semibold text-gray-900">
          {initialData ? '編輯帳戶' : '新增帳戶'}
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>帳戶名稱</FormLabel>
                <FormControl>
                  <Input placeholder="例如：台銀、中信、富邦" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>帳戶類別</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇類別" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={AccountCategory.BANK}>銀行</SelectItem>
                      <SelectItem value={AccountCategory.SECURITIES}>券商</SelectItem>
                      <SelectItem value={AccountCategory.CASH}>現金</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>幣別</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="選擇幣別" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(CurrencyType).map((curr) => (
                        <SelectItem key={curr} value={curr}>
                          {curr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="order"
            render={({ field }) => (
              <FormItem>
                <FormLabel>顯示順序</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {initialData ? '儲存變更' : '建立帳戶'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default AccountForm;
