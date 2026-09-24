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
  useFormField,
} from '@/ui/components/form';
import { Button } from '@/ui/components/ui/button';
import { Checkbox } from '@/ui/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/ui/components/ui/dialog';
import { usePortfolioForm } from '@/ui/features/portfolio/hooks/usePortfolioForm';
import {
  type Account,
  type Portfolio,
  type PortfolioFormVM,
} from '@/ui/features/portfolio/viewmodels/portfolioForm.vm';

interface PortfolioFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PortfolioFormVM) => Promise<void>;
  accounts: Account[];
  portfolio?: Portfolio;
}

/**
 * A Radix checkbox is not a native value/onChange input, so `FormControl` cannot
 * inject the binding; the field is wired through `useFormField` instead.
 */
const ActiveField: React.FC = () => {
  const { field } = useFormField();

  return (
    <label className="flex items-center space-x-2 cursor-pointer">
      <Checkbox
        checked={Boolean(field.value)}
        onCheckedChange={(checked) => field.onChange(checked === true)}
        onBlur={field.onBlur}
      />
      <span className="text-sm font-normal">Active</span>
    </label>
  );
};

/**
 * Surface for the portfolio dialog (ADR-0064). It only renders: the RHF state,
 * the account lists and the submit gate all live in `usePortfolioForm`.
 */
const PortfolioForm: React.FC<PortfolioFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accounts,
  portfolio,
}) => {
  const { form, submit, securitiesOptions, bankOptions, error, isSubmitting } = usePortfolioForm({
    isOpen,
    accounts,
    portfolio,
    onSubmit,
    onClose,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{portfolio ? 'Edit Portfolio' : 'Create Portfolio'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4 py-4" noValidate>
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <FormField name="name">
              <FormItem>
                <FormLabel required>Name</FormLabel>
                <FormControl>
                  <TextInput placeholder="e.g., Retirement Fund" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField name="securitiesAccountId">
              <FormItem>
                <FormLabel required>Securities Account</FormLabel>
                <FormControl>
                  <SelectField
                    options={securitiesOptions}
                    placeholder="Select securities account"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField name="bankAccountId">
              <FormItem>
                <FormLabel required>Bank Account</FormLabel>
                <FormControl>
                  <SelectField options={bankOptions} placeholder="Select bank account" />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField name="isActive">
              <FormItem className="space-y-0">
                <ActiveField />
                <FormMessage />
              </FormItem>
            </FormField>

            {portfolio && <p className="text-xs text-muted-foreground">帳戶連結建立後不可變更</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : portfolio ? 'Save Changes' : 'Create Portfolio'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PortfolioForm;
