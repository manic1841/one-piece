import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { useProjectPage } from '@/ui/features/project/hooks/useProjectPage';
import { useProjectQueries } from '@/ui/features/project/hooks/useProjects';
import { type Project } from '@/domains/project/schemas';

vi.mock('@/ui/features/project/hooks/useProjectPage');
vi.mock('@/ui/features/project/hooks/useProjects');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

const mockUseProjectPage = vi.mocked(useProjectPage);
const mockUseProjectQueries = vi.mocked(useProjectQueries);
const mockUseNavigate = vi.mocked(useNavigate);

import ProjectsPage from './ProjectsPage';

const project: Project = {
  id: 'pr1',
  name: 'Kitchen Remodel',
  isActive: true,
  order: 0,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-09-01'),
} as never;

const controllerBase = {
  loading: false,
  error: null,
  projects: [project],
  reload: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  editClick: vi.fn(),
  deleteClick: vi.fn(),
  editing: undefined,
  isFormOpen: false,
  openForm: vi.fn(),
  closeForm: vi.fn(),
  isSettlementDialogOpen: false,
  openSettleDialog: vi.fn(),
  closeSettleDialog: vi.fn(),
  selectedProject: undefined,
  setSelectedProject: vi.fn(),
  selectProject: vi.fn(),
  unselectProject: vi.fn(),
  isReorderMode: false,
  toggleReorderMode: vi.fn(),
  moveProjectUp: vi.fn(),
  moveProjectDown: vi.fn(),
  saveOrder: vi.fn(),
  isSettingsOpen: false,
  openSettings: vi.fn(),
  closeSettings: vi.fn(),
  isMonthlySettlementView: false,
  openMonthlySettlement: vi.fn(),
  closeMonthlySettlement: vi.fn(),
};

describe('ProjectsPage table', () => {
  it('renders Name | Status | Income | Expense | Net Cash Flow columns', () => {
    mockUseProjectPage.mockReturnValue(controllerBase as never);
    mockUseProjectQueries.mockReturnValue({
      getProjectBalance: vi.fn(),
      getProjectRecords: vi.fn(),
      getProjectSnapshots: vi.fn().mockResolvedValue([
        { id: 's1', year: 2026, month: 8, openingBalance: 0, income: 100000, expense: 60000, closingBalance: 40000 },
        { id: 's2', year: 2026, month: 9, openingBalance: 40000, income: 50000, expense: 30000, closingBalance: 60000 },
      ]),
    });
    mockUseNavigate.mockReturnValue(vi.fn());

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Income')).toBeInTheDocument();
    expect(screen.getByText('Expense')).toBeInTheDocument();
    expect(screen.getByText('Net Cash Flow')).toBeInTheDocument();
    expect(screen.getByText('Kitchen Remodel')).toBeInTheDocument();
  });

  it('navigates to the project detail route on row click', async () => {
    mockUseProjectPage.mockReturnValue(controllerBase as never);
    mockUseProjectQueries.mockReturnValue({
      getProjectBalance: vi.fn(),
      getProjectRecords: vi.fn(),
      getProjectSnapshots: vi.fn().mockResolvedValue([]),
    });
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    );

    fireEvent.click(await screen.findByText('Kitchen Remodel'));
    expect(navigate).toHaveBeenCalledWith('/projects/pr1');
  });
});
