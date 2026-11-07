import { fireEvent, render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { Form, FormField, FormItem } from '@/ui/components/form';
import { type TransactionFormCategoryOption } from '@/ui/features/transaction/types/transaction';

import { ExpenseCategoryPicker } from './ExpenseCategoryPicker';
import { MORE_EXPENSE_INTENTS, QUICK_EXPENSE_INTENTS } from './expenseCategoryGroups';

const categories: TransactionFormCategoryOption[] = [
  ...QUICK_EXPENSE_INTENTS,
  ...MORE_EXPENSE_INTENTS,
].map((intent) => ({ value: intent, label: intent }));

function Harness() {
  const form = useForm({ defaultValues: { intent: '' } });
  return (
    <Form {...form}>
      <FormField name="intent">
        <FormItem>
          <ExpenseCategoryPicker categories={categories} />
        </FormItem>
      </FormField>
    </Form>
  );
}

const chip = (label: string) => screen.getByRole('button', { name: label });
const moreToggle = () => screen.getByTestId('expense-more-toggle');

describe('ExpenseCategoryPicker', () => {
  it('shows the curated quick set and hides the rest until expanded', () => {
    render(<Harness />);

    for (const intent of QUICK_EXPENSE_INTENTS) {
      expect(chip(intent)).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'VEHICLE' })).toBeNull();

    fireEvent.click(moreToggle());
    expect(chip('VEHICLE')).toBeInTheDocument();
  });

  it('pins a selected hidden item into the visible row', () => {
    render(<Harness />);

    fireEvent.click(moreToggle());
    fireEvent.click(chip('VEHICLE'));

    // Collapse the more section; the chosen item must stay visible.
    fireEvent.click(moreToggle());
    expect(chip('VEHICLE')).toBeInTheDocument();
  });
});
