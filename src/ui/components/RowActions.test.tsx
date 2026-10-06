import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RowActions } from './RowActions';

describe('RowActions', () => {
  it('renders the edit node and deletes through the labelled button', () => {
    const onDelete = vi.fn();
    render(
      <RowActions
        edit={<button type="button">Edit</button>}
        onDelete={onDelete}
        deleteLabel="Delete Salary"
      />,
    );

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Salary' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('renders only the delete button when there is no edit node', () => {
    render(<RowActions onDelete={() => undefined} deleteLabel="Delete" />);

    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
