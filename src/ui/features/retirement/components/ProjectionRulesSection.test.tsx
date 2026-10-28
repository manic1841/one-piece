import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { useRuleDrafts } from '@/ui/features/retirement/hooks/useRuleDrafts';

import { ProjectionRulesSection } from './ProjectionRulesSection';

function Harness() {
  const rules = useRuleDrafts(vi.fn());
  return (
    <ProjectionRulesSection
      form={rules.form}
      rules={rules.rules}
      errors={{}}
      readOnly={false}
      ledgerCodes={[]}
      debtAccounts={[]}
      add={rules.add}
      remove={rules.remove}
      replace={rules.replace}
      toggle={rules.toggle}
      update={rules.update}
      setRuleType={rules.setRuleType}
      setMethod={rules.setMethod}
      setSourceType={rules.setSourceType}
    />
  );
}

/** The dialog is a Radix modal, so background rows are only reachable once it closes. */
async function confirm(name: string) {
  fireEvent.change(screen.getByLabelText(/Rule name/), { target: { value: name } });
  fireEvent.click(screen.getByTestId('rule-confirm'));
  await waitFor(() => expect(screen.queryByTestId('rule-inspector')).not.toBeInTheDocument());
}

describe('ProjectionRulesSection', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
  });

  // Regression: the dialog rebinds `rules.0.*` → `rules.1.*`, and RHF used to
  // unset the old path on rebind, silently dropping the first rule.
  it('keeps every rule across two adds', async () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'ADD RULE' }));
    await confirm('Salary');
    fireEvent.click(screen.getByRole('button', { name: 'ADD RULE' }));

    expect(screen.getAllByTestId('rule-row')).toHaveLength(2);
    expect(screen.getByTestId('income-rule-status')).toHaveTextContent('2');
  });

  it('drops an unconfirmed new rule on cancel', async () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'ADD RULE' }));
    expect(screen.getAllByTestId('rule-row')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.queryAllByTestId('rule-row')).toHaveLength(0);
    // Both sides are empty, so the whole-section empty state replaces the groups.
    expect(screen.getByText(/No projection rules yet/)).toBeInTheDocument();
  });

  it('keeps one ADD: the empty state owns it, the header gets it back with a rule', async () => {
    render(<Harness />);

    // Empty: the centred empty state carries the only ADD, both buttons say the same.
    expect(screen.getAllByRole('button', { name: 'ADD RULE' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'ADD RULE' }));
    await confirm('Salary');

    expect(screen.queryByText(/No projection rules yet/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'ADD RULE' })).toHaveLength(1);
    // Only the expense side is empty now, so it keeps the plain line.
    expect(screen.getByText(/No expense rules yet/)).toBeInTheDocument();
  });

  it('restores an edited rule on cancel and keeps it on confirm', async () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'ADD RULE' }));
    await confirm('Salary');

    fireEvent.click(screen.getByRole('button', { name: /Salary/ }));
    fireEvent.change(screen.getByLabelText(/Rule name/), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: /Salary/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Salary/ }));
    fireEvent.change(screen.getByLabelText(/Rule name/), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByTestId('rule-confirm'));
    await waitFor(() => expect(screen.queryByTestId('rule-inspector')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Renamed/ })).toBeInTheDocument();
  });

  it('refuses to confirm while the name is blank', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: 'ADD RULE' }));

    expect(screen.getByTestId('rule-confirm')).toBeDisabled();
  });
});
