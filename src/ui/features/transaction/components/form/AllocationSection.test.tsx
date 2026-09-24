import { useEffect } from 'react';

import { fireEvent, render, screen, within } from '@testing-library/react';
import { type UseFormReturn, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { Form } from '@/ui/components/form';
import { type TransactionAllocationFormValues } from '@/ui/features/transaction/viewmodels/transactionForm.vm';

import { AllocationSection } from './AllocationSection';

const projects = [
  { id: 'project-1', name: '旅遊', icon: '✈️' },
  { id: 'project-2', name: '教育', icon: '📚' },
];

function renderSection(
  allocationItems: TransactionAllocationFormValues['allocationItems'] = [],
  amount = '1000',
) {
  const holder: { form?: UseFormReturn<TransactionAllocationFormValues> } = {};

  const Harness = () => {
    const form = useForm<TransactionAllocationFormValues>({
      defaultValues: { amount, allocationItems },
    });

    useEffect(() => {
      holder.form = form;
    }, [form]);

    return (
      <Form {...form}>
        <AllocationSection projects={projects} title="收入分配" />
      </Form>
    );
  };

  render(<Harness />);

  if (!holder.form) throw new Error('Form harness did not render');
  return holder.form;
}

describe('AllocationSection', () => {
  it('starts with no allocation rows until the user adds a project', () => {
    const form = renderSection();

    expect(screen.getByText('尚未加入分配專案。')).toBeInTheDocument();
    expect(screen.queryByTestId('allocation-row-project-1')).not.toBeInTheDocument();
    expect(form.getValues('allocationItems')).toEqual([]);
  });

  it('appends the selected project as a row with a blank percentage', () => {
    const form = renderSection();

    fireEvent.change(screen.getByTestId('allocation-project-select'), {
      target: { value: 'project-1' },
    });
    fireEvent.click(screen.getByTestId('allocation-add-button'));

    expect(form.getValues('allocationItems')).toEqual([{ projectId: 'project-1', percentage: '' }]);
    expect(screen.getByTestId('allocation-row-project-1')).toBeInTheDocument();
  });

  it('clears every allocation row', () => {
    const form = renderSection([
      { projectId: 'project-1', percentage: '40' },
      { projectId: 'project-2', percentage: '60' },
    ]);

    fireEvent.click(screen.getByTestId('allocation-clear-button'));

    expect(form.getValues('allocationItems')).toEqual([]);
    expect(screen.queryByTestId('allocation-row-project-1')).not.toBeInTheDocument();
  });

  it('removes a single row without touching the others', () => {
    const form = renderSection([
      { projectId: 'project-1', percentage: '40' },
      { projectId: 'project-2', percentage: '60' },
    ]);

    fireEvent.click(
      within(screen.getByTestId('allocation-row-project-1')).getByRole('button', { name: '移除' }),
    );

    expect(form.getValues('allocationItems')).toEqual([
      { projectId: 'project-2', percentage: '60' },
    ]);
  });

  it('shows the running percentage total', () => {
    renderSection([{ projectId: 'project-1', percentage: '40' }]);

    expect(screen.getByText('合計: 40.0%')).toBeInTheDocument();
  });
});
