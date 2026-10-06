import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type AllocationTemplateFormVM,
  createDefaultAllocationTemplateFormVM,
} from '@/ui/features/setting/viewmodels/allocationTemplateForm.vm';

import { AllocationTemplateSettings } from './AllocationTemplateSettings';

vi.mock('@/ui/features/setting/hooks/useAllocationTemplateSettings', () => ({
  useAllocationTemplateSettings: vi.fn(),
}));

const makeForm = () =>
  renderHook(() =>
    useForm<AllocationTemplateFormVM>({ defaultValues: createDefaultAllocationTemplateFormVM() }),
  ).result.current;

const allocationFormBase = (overrides: Record<string, unknown> = {}) => ({
  form: makeForm(),
  fields: [],
  appendItem: vi.fn(),
  removeItem: vi.fn(),
  reset: vi.fn(),
  submit: vi.fn().mockResolvedValue(undefined),
  totalPercentage: 0,
  error: '',
  isSubmitting: false,
  ...overrides,
});

const hookReturn = (overrides: Record<string, unknown> = {}) => ({
  loading: false,
  error: '',
  templates: [],
  selectedTemplate: null,
  activeProjects: [
    { id: 'p1', name: 'Home Down Payment', isActive: true },
    { id: 'p2', name: 'Travel Fund', isActive: true },
  ],
  availableProjects: [
    { id: 'p1', name: 'Home Down Payment', isActive: true },
    { id: 'p2', name: 'Travel Fund', isActive: true },
  ],
  selectedTemplateId: null,
  selectedProjectId: '',
  setSelectedProjectId: vi.fn(),
  resetForm: vi.fn(),
  editTemplate: vi.fn(),
  addProjectItem: vi.fn(),
  saveTemplate: vi.fn().mockResolvedValue(undefined),
  deleteTemplate: vi.fn().mockResolvedValue(undefined),
  allocationForm: allocationFormBase(),
  ...overrides,
});

const mockHook = async (overrides: Record<string, unknown> = {}) => {
  const { useAllocationTemplateSettings } = await import(
    '@/ui/features/setting/hooks/useAllocationTemplateSettings'
  );
  const value = hookReturn(overrides);
  vi.mocked(useAllocationTemplateSettings).mockReturnValue(value as never);
  return value;
};

describe('AllocationTemplateSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the create title and empty list copy', async () => {
    await mockHook();

    render(<AllocationTemplateSettings />);

    expect(screen.getByText('Create Template')).toBeInTheDocument();
    expect(screen.getByText('No allocation items yet.')).toBeInTheDocument();
    expect(screen.getByText('No templates yet.')).toBeInTheDocument();
  });

  it('flags an incomplete total and shows the edit title while editing', async () => {
    await mockHook({
      selectedTemplateId: 't1',
      allocationForm: allocationFormBase({
        fields: [
          { id: 'r1', projectId: 'p1', percentage: '60' },
          { id: 'r2', projectId: 'p2', percentage: '30' },
        ],
        totalPercentage: 90,
      }),
    });

    render(<AllocationTemplateSettings />);

    expect(screen.getByText('Edit Template')).toBeInTheDocument();
    expect(screen.getByText('Total 90.0%')).toBeInTheDocument();
  });

  it('lists existing templates with their allocation breakdown', async () => {
    await mockHook({
      templates: [
        {
          id: 't1',
          name: 'Charles Salary',
          ledgerCode: 'income:salary:charles',
          isDefault: true,
          items: [{ projectId: 'p1', percentage: 100 }],
        },
      ],
    });

    render(<AllocationTemplateSettings />);

    expect(screen.getByText('Charles Salary')).toBeInTheDocument();
    expect(screen.getByText('income:salary:charles')).toBeInTheDocument();
    expect(screen.getByText('Home Down Payment 100%')).toBeInTheDocument();
    expect(screen.getByText('default')).toBeInTheDocument();
  });

  it('binds save and delete to the hook and surfaces the error line', async () => {
    const value = await mockHook({ selectedTemplateId: 't1', error: '儲存失敗' });

    render(<AllocationTemplateSettings />);

    fireEvent.click(screen.getByRole('button', { name: /Save Template/ }));
    fireEvent.click(screen.getByRole('button', { name: /Delete template/ }));

    expect(value.saveTemplate).toHaveBeenCalledTimes(1);
    expect(value.deleteTemplate).toHaveBeenCalledTimes(1);
    expect(screen.getByText('儲存失敗')).toBeInTheDocument();
  });

  it('hides the delete action when no template is selected', async () => {
    await mockHook();

    render(<AllocationTemplateSettings />);

    expect(screen.queryByRole('button', { name: /Delete template/ })).not.toBeInTheDocument();
  });
});
