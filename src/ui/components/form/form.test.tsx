import { zodResolver } from '@hookform/resolvers/zod';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  CurrencyInput,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  NumberInput,
  SelectField,
  TextInput,
} from './index';

describe('field components are RHF-free', () => {
  beforeAll(() => {
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView ?? (() => {});
    Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture ?? (() => false);
    Element.prototype.setPointerCapture = Element.prototype.setPointerCapture ?? (() => {});
    Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture ?? (() => {});
  });
  it('renders TextInput standalone and emits the value, not the event', () => {
    const onChange = vi.fn();
    render(<TextInput value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } });

    expect(onChange).toHaveBeenCalledWith('hello');
  });

  it('renders NumberInput standalone and emits a string', () => {
    const onChange = vi.fn();
    render(<NumberInput onChange={onChange} />);

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '42' } });

    expect(onChange).toHaveBeenCalledWith('42');
  });

  it('shares the numeric contract with the data-table input', () => {
    render(<NumberInput />);
    const input = screen.getByRole('spinbutton');

    expect(input.className).toContain('h-[34px]');
    expect(input.className).toContain('font-mono');
    expect(input.className).toContain('tabular-nums');
    expect(input.className).toContain('[appearance:textfield]');
  });

  it('renders a currency prefix without owning the symbol', () => {
    render(<CurrencyInput prefix="NT$" />);
    expect(screen.getByText('NT$')).toBeInTheDocument();
  });

  it('renders a select with options and a placeholder', () => {
    render(
      <SelectField
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
        ]}
        placeholder="選擇"
      />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('選擇')).toBeInTheDocument();
  });

  it('renders a noneLabel row for the empty value without emitting an empty Radix item', async () => {
    const onChange = vi.fn();
    render(
      <SelectField
        options={[
          { value: 'p1', label: 'Project A' },
          { value: 'p2', label: 'Project B' },
        ]}
        value="p1"
        onChange={onChange}
        placeholder="— 無 —"
        noneLabel="— 無 —"
      />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();

    const trigger = screen.getByRole('combobox');
    trigger.focus();
    fireEvent.click(trigger);
    await waitFor(() => expect(trigger).toHaveAttribute('data-state', 'open'));
    const option = await screen.findByRole('option', { name: '— 無 —' });
    fireEvent.click(option);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(''));
  });

  it('fails fast in DEV when an option carries an empty value without noneLabel', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<SelectField options={[{ value: '', label: '—' }]} />)).toThrow(
      /noneLabel/,
    );
    consoleError.mockRestore();
  });
});

const Schema = z.object({ name: z.string().min(1, '必填') });

function Harness({ onSubmit }: { onSubmit: (values: z.infer<typeof Schema>) => void }) {
  const form = useForm({
    resolver: zodResolver(Schema),
    defaultValues: { name: '' },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField name="name">
          <FormItem data-testid="item">
            <FormLabel required>名稱</FormLabel>
            <FormControl>
              <TextInput />
            </FormControl>
            <FormMessage />
          </FormItem>
        </FormField>
        <button type="submit">送出</button>
      </form>
    </Form>
  );
}

describe('Form glue', () => {
  it('groups a field with the shared spacing contract', () => {
    render(<Harness onSubmit={() => {}} />);
    expect(screen.getByTestId('item').className).toContain('space-y-2');
  });

  it('renders the required marker on the label', () => {
    render(<Harness onSubmit={() => {}} />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('injects the RHF binding and submits the parsed value', async () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '台銀' } });
    fireEvent.click(screen.getByRole('button', { name: '送出' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: '台銀' }, expect.anything()));
  });

  it('shows the first field error below the control and marks the input invalid', async () => {
    render(<Harness onSubmit={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: '送出' }));

    await waitFor(() => expect(screen.getByText('必填')).toBeInTheDocument());
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });
});
