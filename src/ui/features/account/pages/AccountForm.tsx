import React from 'react';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  SelectField,
  TextInput,
} from '@/ui/components/form';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { AccountCategoryOptions, CurrencyOptions } from '@/ui/constants/account/label';
import { ACCOUNT_FORM_LABELS } from '@/ui/constants/account/formLabels';

import { useAccountForm } from '../hooks/useAccountForm';
import type { AccountCreate } from '../viewmodels/account.vm';

interface AccountFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AccountCreate) => Promise<void>;
  title?: string;
}

const AccountForm: React.FC<AccountFormProps> = ({ isOpen, onClose, onSubmit, title }) => {
  const { form, submit, error, isSubmitting } = useAccountForm(onSubmit, onClose, isOpen);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{title || ACCOUNT_FORM_LABELS.CREATE_TITLE}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-6 py-4">
            {error && (
              <Alert variant="destructive" className="border-negative/20 bg-negative/10">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField name="name">
              <FormItem>
                <FormLabel required>{ACCOUNT_FORM_LABELS.NAME_LABEL}</FormLabel>
                <FormControl>
                  <TextInput placeholder={ACCOUNT_FORM_LABELS.NAME_PLACEHOLDER} />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField name="category">
                <FormItem>
                  <FormLabel required>{ACCOUNT_FORM_LABELS.CATEGORY_LABEL}</FormLabel>
                  <FormControl>
                    <SelectField
                      options={AccountCategoryOptions}
                      placeholder={ACCOUNT_FORM_LABELS.CATEGORY_PLACEHOLDER}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>

              <FormField name="currency">
                <FormItem>
                  <FormLabel required>{ACCOUNT_FORM_LABELS.CURRENCY_LABEL}</FormLabel>
                  <FormControl>
                    <SelectField
                      options={CurrencyOptions}
                      placeholder={ACCOUNT_FORM_LABELS.CURRENCY_PLACEHOLDER}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              </FormField>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={isSubmitting} type="button">
                {ACCOUNT_FORM_LABELS.CANCEL_ACTION}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? ACCOUNT_FORM_LABELS.SAVING_ACTION : ACCOUNT_FORM_LABELS.SAVE_ACTION}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AccountForm;
