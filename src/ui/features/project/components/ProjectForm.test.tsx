import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import ProjectForm from './ProjectForm';

describe('ProjectForm', () => {
  it('submits the mapped project through the form suite fields', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ProjectForm isOpen onClose={() => {}} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/名稱/), { target: { value: '生活費' } });
    fireEvent.click(screen.getByRole('button', { name: '儲存' }));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        id: '',
        project: { name: '生活費', order: 0, isActive: true },
      }),
    );
  });

  it('blocks submit and shows the error when the name is empty', async () => {
    const onSubmit = vi.fn();
    render(<ProjectForm isOpen onClose={() => {}} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: '儲存' }));

    await waitFor(() => expect(screen.getByText('專案名稱不能為空')).toBeInTheDocument());
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
