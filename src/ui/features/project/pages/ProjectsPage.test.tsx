import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/infra/contexts/useAuth';
import { useProjectPage } from '@/ui/features/project/hooks/useProjectPage';
import { useProjectQueries } from '@/ui/features/project/hooks/useProjects';
import { type Project } from '@/domains/project/schemas';

vi.mock('@/ui/features/project/hooks/useProjectPage');
vi.mock('@/ui/features/project/hooks/useProjects');
vi.mock('@/infra/contexts/useAuth', async () => {
  const actual = await vi.importActual<typeof import('@/infra/contexts/useAuth')>(
    '@/infra/contexts/useAuth',
  );
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});
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
const mockUseAuth = vi.mocked(useAuth);

import ProjectsPage from './ProjectsPage';

const authProfile = {
  currentUser: { uid: 'u1', email: 'u1@onepiece.test' } as never,
  userProfile: { householdId: 'h1', email: 'u1@onepiece.test' } as never,
  isAdmin: false,
  loading: false,
  logout: vi.fn().mockResolvedValue(undefined),
  loginWithGoogle: vi.fn().mockResolvedValue(undefined),
  refreshProfile: vi.fn().mockResolvedValue(undefined),
};

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
  handleReorder: vi.fn(),
  isSettingsOpen: false,
  openSettings: vi.fn(),
  closeSettings: vi.fn(),
  isMonthlySettlementView: false,
  openMonthlySettlement: vi.fn(),
  closeMonthlySettlement: vi.fn(),
};

describe('ProjectsPage table', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue(authProfile as never);
  });

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
    expect(screen.getAllByText('Kitchen Remodel').length).toBe(2);
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

    fireEvent.click(await screen.findByTestId('project-row-pr1'));
    expect(navigate).toHaveBeenCalledWith('/projects/pr1');
  });

  it('renders mobile compact rows with name + net cash flow and income/expense metadata', async () => {
    mockUseProjectPage.mockReturnValue(controllerBase as never);
    mockUseProjectQueries.mockReturnValue({
      getProjectBalance: vi.fn(),
      getProjectRecords: vi.fn(),
      getProjectSnapshots: vi.fn().mockResolvedValue([
        { id: 's1', year: 2026, month: 8, openingBalance: 0, income: 100000, expense: 60000, closingBalance: 40000 },
        { id: 's2', year: 2026, month: 9, openingBalance: 40000, income: 50000, expense: 30000, closingBalance: 60000 },
      ]),
    });
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    );

    const compactRow = await screen.findByTestId('project-row-mobile-pr1');
    expect(compactRow.className).toContain('md:hidden');
    expect(compactRow.textContent).toContain('Kitchen Remodel');
    await screen.findByText('Income $150,000 · Expense $90,000');
    expect(compactRow.textContent).toContain('$60,000');

    fireEvent.click(compactRow);
    expect(navigate).toHaveBeenCalledWith('/projects/pr1');
  });

  it('keeps the desktop table hidden on mobile with no overflow-x-auto', async () => {
    mockUseProjectPage.mockReturnValue(controllerBase as never);
    mockUseProjectQueries.mockReturnValue({
      getProjectBalance: vi.fn(),
      getProjectRecords: vi.fn(),
      getProjectSnapshots: vi.fn().mockResolvedValue([]),
    });
    mockUseNavigate.mockReturnValue(vi.fn());

    const { container } = render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    );

    const tableCell = await screen.findByTestId('project-row-pr1');
    const desktopTable = tableCell.closest('table');
    expect(desktopTable).not.toBeNull();
    expect(desktopTable!.className).toContain('hidden');
    expect(desktopTable!.className).toContain('md:table');
    expect(container.querySelector('.overflow-x-auto')).toBeNull();
  });

  it('drops Settings from header actions, keeps Settlement + New Project in a wrapping row', () => {
    mockUseProjectPage.mockReturnValue(controllerBase as never);
    mockUseProjectQueries.mockReturnValue({
      getProjectBalance: vi.fn(),
      getProjectRecords: vi.fn(),
      getProjectSnapshots: vi.fn().mockResolvedValue([]),
    });
    mockUseNavigate.mockReturnValue(vi.fn());

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
    expect(screen.getByRole('button', { name: /Settlement/i })).not.toBeNull();
    expect(screen.getByRole('button', { name: /New Project/i })).not.toBeNull();

    const actionsRow = screen.getByRole('button', { name: /Settlement/i }).closest('div')!
      .parentElement!;
    expect(actionsRow.className).toContain('flex-wrap');
  });

  it('keeps project settings reachable via the overflow menu', async () => {
    mockUseProjectPage.mockReturnValue(controllerBase as never);
    mockUseProjectQueries.mockReturnValue({
      getProjectBalance: vi.fn(),
      getProjectRecords: vi.fn(),
      getProjectSnapshots: vi.fn().mockResolvedValue([]),
    });
    mockUseNavigate.mockReturnValue(vi.fn());

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole('button', { name: '更多專案操作' });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
    fireEvent.click(trigger);
    expect(await screen.findByRole('menuitem', { name: 'Settings' })).not.toBeNull();
    expect(screen.getByText('Settings')).not.toBeNull();
  });
});

describe('ProjectsPage drag reorder', () => {
  const projectA: Project = { ...project, id: 'pr1', order: 0 } as never;
  const projectB: Project = { ...project, id: 'pr2', name: 'Garage Build', order: 1 } as never;

  const setupDrag = (projects: Project[]) => {
    const navigate = vi.fn();
    mockUseAuth.mockReturnValue(authProfile as never);
    mockUseProjectPage.mockReturnValue({
      ...controllerBase,
      projects,
    } as never);
    mockUseProjectQueries.mockReturnValue({
      getProjectBalance: vi.fn(),
      getProjectRecords: vi.fn(),
      getProjectSnapshots: vi.fn().mockResolvedValue([]),
    });
    mockUseNavigate.mockReturnValue(navigate);

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    );

    return navigate;
  };

  it('renders a grip handle on every row (desktop and mobile)', async () => {
    setupDrag([projectA, projectB]);

    const gripsA = await screen.findAllByTestId('project-grip-pr1');
    expect(gripsA).toHaveLength(2);
    for (const grip of gripsA) {
      expect(grip.tagName).toBe('BUTTON');
      expect(grip.getAttribute('aria-label')).toContain('Kitchen Remodel');
    }

    const gripsB = await screen.findAllByTestId('project-grip-pr2');
    expect(gripsB).toHaveLength(2);
    expect(gripsB[0].getAttribute('aria-label')).toContain('Garage Build');
  });

  it('navigates on row click while the grip is present', async () => {
    const navigate = setupDrag([projectA]);

    fireEvent.click(await screen.findByTestId('project-row-pr1'));
    expect(navigate).toHaveBeenCalledWith('/projects/pr1');
  });

  it('does not navigate when the grip handle is clicked', async () => {
    setupDrag([projectA]);

    const grips = await screen.findAllByTestId('project-grip-pr1');
    fireEvent.click(grips[0]);
    expect(mockUseProjectPage().handleReorder as unknown as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
  });

  it('persists the new order through the controller after a keyboard drag', async () => {
    const handleReorder = vi.fn();
    mockUseAuth.mockReturnValue(authProfile as never);
    mockUseProjectPage.mockReturnValue({
      ...controllerBase,
      projects: [projectA, projectB],
      handleReorder,
    } as never);
    mockUseProjectQueries.mockReturnValue({
      getProjectBalance: vi.fn(),
      getProjectRecords: vi.fn(),
      getProjectSnapshots: vi.fn().mockResolvedValue([]),
    });
    mockUseNavigate.mockReturnValue(vi.fn());

    render(
      <MemoryRouter>
        <ProjectsPage />
      </MemoryRouter>,
    );

    const rowA = await screen.findByTestId('project-row-pr1');
    const rowB = await screen.findByTestId('project-row-pr2');

    // jsdom reports zero rects; give the rows real geometry so dnd-kit
    // collision detection can resolve a drop target.
    vi.spyOn(rowA, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, bottom: 48, right: 400, width: 400, height: 48, toJSON: () => ({}),
    } as DOMRect);
    vi.spyOn(rowB, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 48, top: 48, left: 0, bottom: 96, right: 400, width: 400, height: 48, toJSON: () => ({}),
    } as DOMRect);

    const grip = screen.getAllByTestId('project-grip-pr1')[0];
    fireEvent.keyDown(grip, { key: ' ', code: 'Space' });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    fireEvent.keyDown(document, { key: 'ArrowDown', code: 'ArrowDown' });
    fireEvent.keyDown(document, { key: ' ', code: 'Space' });

    await waitFor(() => {
      expect(handleReorder).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'pr2' }),
        expect.objectContaining({ id: 'pr1' }),
      ]);
    });
  });
});
