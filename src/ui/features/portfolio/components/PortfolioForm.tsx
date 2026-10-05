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
import { PORTFOLIO_FORM_LABELS } from '@/ui/constants/portfolio/labels';
import { usePortfolioForm } from '@/ui/features/portfolio/hooks/usePortfolioForm';
import {
  type Account,
  type PortfolioFormVM,
} from '@/ui/features/portfolio/viewmodels/portfolioForm.vm';

interface PortfolioFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PortfolioFormVM) => Promise<void>;
  accounts: Account[];
}

/**
 * Surface for the portfolio create dialog (ADR-0064). It only renders: the RHF
 * state, the account lists and the submit gate all live in `usePortfolioForm`.
 * There is no edit mode — rename and lifecycle live on the detail page.
 */
const PortfolioForm: React.FC<PortfolioFormProps> = ({ isOpen, onClose, onSubmit, accounts }) => {
  const { form, submit, securitiesOptions, bankOptions, error, isSubmitting } = usePortfolioForm({
    isOpen,
    accounts,
    onSubmit,
    onClose,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{PORTFOLIO_FORM_LABELS.CREATE_TITLE}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4 py-4" noValidate>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FormField name="name">
              <FormItem>
                <FormLabel required>{PORTFOLIO_FORM_LABELS.NAME}</FormLabel>
                <FormControl>
                  <TextInput placeholder={PORTFOLIO_FORM_LABELS.NAME_PLACEHOLDER} />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField name="securitiesAccountId">
              <FormItem>
                <FormLabel required>{PORTFOLIO_FORM_LABELS.SECURITIES_ACCOUNT}</FormLabel>
                <FormControl>
                  <SelectField
                    options={securitiesOptions}
                    placeholder={PORTFOLIO_FORM_LABELS.SECURITIES_PLACEHOLDER}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <FormField name="bankAccountId">
              <FormItem>
                <FormLabel required>{PORTFOLIO_FORM_LABELS.BANK_ACCOUNT}</FormLabel>
                <FormControl>
                  <SelectField
                    options={bankOptions}
                    placeholder={PORTFOLIO_FORM_LABELS.BANK_PLACEHOLDER}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            </FormField>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                {PORTFOLIO_FORM_LABELS.CANCEL}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? PORTFOLIO_FORM_LABELS.SAVING : PORTFOLIO_FORM_LABELS.SUBMIT}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PortfolioForm;
