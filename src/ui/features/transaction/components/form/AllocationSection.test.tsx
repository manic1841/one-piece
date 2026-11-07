import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import { Form } from '@/ui/components/form';
import { type TransactionAllocationFormValues } from '@/ui/features/transaction/viewmodels/transactionForm.vm';

import { AllocationSection } from './AllocationSection';

const projects = [
  { id: 'project-1', name: '日常開銷' },
  { id: 'project-2', name: '旅遊基金' },
  { id: 'project-3', name: '教育基金' },
];

const defaults = (
  overrides: Partial<TransactionAllocationFormValues> = {},
): TransactionAllocationFormValues => ({
  amount: '1000',
  projectId: '',
  allocationItems: [],
  ...overrides,
});

function Harness({
  values,
  availableProjects = projects,
}: {
  values?: Partial<TransactionAllocationFormValues>;
  availableProjects?: typeof projects;
}) {
  const form = useForm<TransactionAllocationFormValues>({ defaultValues: defaults(values) });

  return (
    <Form {...form}>
      <AllocationSection projects={availableProjects} />
    </Form>
  );
}

const chip = (label: string) => screen.getByRole('button', { name: label });
const openEditor = () => fireEvent.click(screen.getByTestId('project-mode-toggle'));
/** Read-mode rows, in render order: `專案名稱` immediately followed by its share. */
const rowTexts = () => screen.getAllByRole('listitem').map((row) => row.textContent);
const barSegments = () =>
  Array.from(screen.getByTestId('allocation-bar').children).map(
    (slice) => (slice as HTMLElement).style.width,
  );

describe('AllocationSection', () => {
  it('opens in read mode with no chips and no rows', () => {
    render(<Harness />);

    expect(screen.getByText('尚未指定專案')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '旅遊基金' })).toBeNull();
    expect(screen.queryByRole('list', { name: '專案分配' })).toBeNull();
    expect(screen.getByTestId('project-mode-toggle')).toHaveAttribute('aria-expanded', 'false');
  });

  it('reveals every project chip in edit mode', () => {
    render(<Harness />);
    openEditor();

    for (const project of projects) {
      expect(chip(project.name)).toHaveAttribute('aria-pressed', 'false');
    }
    expect(screen.getByTestId('project-mode-toggle')).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps a single selection in single mode (no allocation rows)', async () => {
    render(<Harness />);
    openEditor();

    fireEvent.click(chip('旅遊基金'));

    await waitFor(() => expect(chip('旅遊基金')).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.queryByTestId('allocation-row-project-2')).toBeNull();
    expect(rowTexts()).toEqual(['旅遊基金100%']);
  });

  it('upgrades to allocation rows when a second project is selected', async () => {
    render(<Harness />);
    openEditor();

    fireEvent.click(chip('旅遊基金'));
    fireEvent.click(chip('教育基金'));

    await waitFor(() => expect(screen.getByTestId('allocation-row-project-2')).toBeInTheDocument());
    expect(screen.getByTestId('allocation-row-project-3')).toBeInTheDocument();
    expect(screen.getByText('合計: 100.0%')).toBeInTheDocument();
  });

  it('renders the rows with the largest share first', () => {
    render(
      <Harness
        values={{
          allocationItems: [
            { projectId: 'project-1', percentage: '20' },
            { projectId: 'project-2', percentage: '50' },
            { projectId: 'project-3', percentage: '30' },
          ],
        }}
      />,
    );

    expect(rowTexts()).toEqual(['旅遊基金50%', '教育基金30%', '日常開銷20%']);
  });

  it('normalizes the bar by the total so an over-100 split still fits', () => {
    render(
      <Harness
        values={{
          allocationItems: [
            { projectId: 'project-1', percentage: '90' },
            { projectId: 'project-2', percentage: '30' },
          ],
        }}
      />,
    );

    const widths = barSegments();
    expect(widths).toEqual(['75%', '25%']);
  });

  it('reorders the read view when a percentage is edited', async () => {
    render(
      <Harness
        values={{
          allocationItems: [
            { projectId: 'project-1', percentage: '50' },
            { projectId: 'project-2', percentage: '50' },
          ],
        }}
      />,
    );
    openEditor();

    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '80' } });
    fireEvent.change(screen.getAllByRole('spinbutton')[1], { target: { value: '20' } });

    await waitFor(() => expect(rowTexts()).toEqual(['日常開銷80%', '旅遊基金20%']));
  });

  it('shows the allocated amount per row', () => {
    render(
      <Harness
        values={{
          amount: '2000',
          allocationItems: [{ projectId: 'project-1', percentage: '25' }],
        }}
      />,
    );
    openEditor();

    expect(screen.getByTestId('allocation-row-project-1')).toHaveTextContent('500');
  });

  it('names each percentage input and remove action after its project', () => {
    render(
      <Harness
        values={{
          allocationItems: [
            { projectId: 'project-2', percentage: '50' },
            { projectId: 'project-3', percentage: '50' },
          ],
        }}
      />,
    );
    openEditor();

    expect(screen.getByRole('spinbutton', { name: '旅遊基金 分配比例' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移除 教育基金' })).toBeInTheDocument();
  });

  it('hides the allocation rows when a selection drops back to one', async () => {
    render(<Harness />);
    openEditor();

    fireEvent.click(chip('旅遊基金'));
    fireEvent.click(chip('教育基金'));
    fireEvent.click(chip('教育基金')); // toggle the second off

    await waitFor(() => expect(screen.queryByTestId('allocation-row-project-3')).toBeNull());
    expect(screen.queryByTestId('allocation-row-project-2')).toBeNull();
    expect(chip('旅遊基金')).toHaveAttribute('aria-pressed', 'true');
  });

  it('drops a project from the split via its row remove action', async () => {
    render(<Harness />);
    openEditor();

    fireEvent.click(chip('旅遊基金'));
    fireEvent.click(chip('教育基金'));

    const removeButtons = screen.getAllByRole('button', { name: /^移除/ });
    expect(removeButtons).toHaveLength(2);
    fireEvent.click(removeButtons[0]);

    // One left → back to single mode, rows hidden.
    await waitFor(() => expect(screen.queryByTestId('allocation-row-project-3')).toBeNull());
    expect(screen.queryByTestId('allocation-row-project-2')).toBeNull();
  });

  it('keeps the edited percentages when another project is added', async () => {
    render(
      <Harness
        values={{
          allocationItems: [
            { projectId: 'project-1', percentage: '70' },
            { projectId: 'project-2', percentage: '20' },
          ],
        }}
      />,
    );
    openEditor();

    fireEvent.click(chip('教育基金'));

    await waitFor(() =>
      expect(screen.getByRole('spinbutton', { name: '日常開銷 分配比例' })).toHaveValue(70),
    );
    expect(screen.getByRole('spinbutton', { name: '旅遊基金 分配比例' })).toHaveValue(20);
    expect(screen.getByRole('spinbutton', { name: '教育基金 分配比例' })).toHaveValue(10);
  });

  it('keeps a deactivated project as a removable row', () => {
    render(
      <Harness
        values={{ allocationItems: [{ projectId: 'project-retired', percentage: '100' }] }}
      />,
    );
    openEditor();

    expect(rowTexts()).toEqual(['已停用專案100%']);
    expect(screen.getByTestId('allocation-row-project-retired')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移除 已停用專案' })).toBeInTheDocument();
  });

  it('still shows a deactivated selection when no project is selectable', async () => {
    render(
      <Harness
        availableProjects={[]}
        values={{ allocationItems: [{ projectId: 'project-retired', percentage: '100' }] }}
      />,
    );

    expect(rowTexts()).toEqual(['已停用專案100%']);

    openEditor();
    fireEvent.click(screen.getByRole('button', { name: '移除 已停用專案' }));

    await waitFor(() => expect(screen.queryByTestId('allocation-row-project-retired')).toBeNull());
  });
});
