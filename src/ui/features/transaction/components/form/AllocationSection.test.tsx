import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AllocationSection } from './AllocationSection';

describe('AllocationSection', () => {
  const projects = [
    { id: 'project-1', name: '旅遊', icon: '✈️' },
    { id: 'project-2', name: '教育', icon: '📚' },
  ];

  it('starts with no allocation rows until user adds a project', () => {
    const onAllocationsChange = vi.fn();

    render(
      <AllocationSection
        projects={projects}
        allocations={[]}
        amount="1000"
        title="收入分配"
        onAllocationsChange={onAllocationsChange}
      />,
    );

    expect(screen.getByText('尚未加入分配專案。')).toBeInTheDocument();
    expect(screen.queryByTestId('allocation-row-project-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('allocation-row-project-2')).not.toBeInTheDocument();
  });

  it('adds selected project into allocation list', () => {
    const onAllocationsChange = vi.fn();

    render(
      <AllocationSection
        projects={projects}
        allocations={[]}
        amount="1000"
        title="收入分配"
        onAllocationsChange={onAllocationsChange}
      />,
    );

    fireEvent.change(screen.getByTestId('allocation-project-select'), {
      target: { value: 'project-1' },
    });
    fireEvent.click(screen.getByTestId('allocation-add-button'));

    expect(onAllocationsChange).toHaveBeenCalledWith([{ projectId: 'project-1', percentage: '' }]);
  });

  it('clears all allocations', () => {
    const onAllocationsChange = vi.fn();

    render(
      <AllocationSection
        projects={projects}
        allocations={[
          { projectId: 'project-1', percentage: '40' },
          { projectId: 'project-2', percentage: '60' },
        ]}
        amount="1000"
        title="支出分攤"
        tone="expense"
        onAllocationsChange={onAllocationsChange}
      />,
    );

    fireEvent.click(screen.getByTestId('allocation-clear-button'));

    expect(onAllocationsChange).toHaveBeenCalledWith([]);
  });
});
