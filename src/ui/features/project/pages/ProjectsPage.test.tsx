import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { PROJECTS_PAGE_LABELS } from '@/ui/constants/project/projectPageLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useProjectPage } from '@/ui/features/project/hooks/useProjectPage';

import ProjectsPage from './ProjectsPage';

vi.mock('@/ui/features/project/hooks/useProjectPage');
vi.mock('@/ui/contexts/useAuthState', async () => {
  const actual = await vi.importActual<typeof import('@/ui/contexts/useAuthState')>(
    '@/ui/contexts/useAuthState',
  );
  return {
    ...actual,
    useAuthState: vi.fn(),
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
const mockUseNavigate = vi.mocked(useNavigate);
const mockUseAuth = vi.mocked(useAuthState);

const authProfile = {
  user: { uid: 'u1', email: 'u1@onepiece.test' } as never,
  userProfile: { householdId: 'h1', email: 'u1@onepiece.test' } as never,
  isAdmin: false,
  loading: false,
  logout: vi.fn().mockResolvedValue(undefined),
  loginWithGoogle: vi.fn().mockResolvedValue(undefined),
  refreshProfile: vi.fn().mockResolvedValue(undefined),
};

const rowVM = {
  id: 'pr1',
  name: 'Kitchen Remodel',
  isActive: true,
  income: 150000,
  expense: 90000,
  net: 60000,
};

const controllerBase = {
  loading: false,
  error: null,
  rows: [rowVM],
  activeCount: 1,
  reload: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  isFormOpen: false,
  openForm: vi.fn(),
  closeForm: vi.fn(),
  showInactive: false,
  setShowInactive: vi.fn(),
  reorderRows: vi.fn(),
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProjectsPage />
    </MemoryRouter>,
  );

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue(authProfile as never);
    mockUseNavigate.mockReturnValue(vi.fn());
  });

  it('renders the shared data-table with Chinese column headers', async () => {
    mockUseProjectPage.mockReturnValue(controllerBase as never);

    renderPage();

    expect(screen.getByText('名稱')).toBeInTheDocument();
    expect(screen.getAllByText('狀態').length).toBeGreaterThan(0);
    expect(screen.getAllByText('收入').length).toBeGreaterThan(0);
    expect(screen.getAllByText('支出').length).toBeGreaterThan(0);
    expect(screen.getAllByText('淨現金流').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kitchen Remodel').length).toBe(2);
    expect((await screen.findAllByText('進行中')).length).toBeGreaterThan(0);
  });

  it('navigates to the project detail route on row click', async () => {
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);
    mockUseProjectPage.mockReturnValue(controllerBase as never);

    renderPage();

    fireEvent.click(await screen.findByTestId('project-row-pr1'));
    expect(navigate).toHaveBeenCalledWith('/projects/pr1');
  });

  it('renders mobile rows inside a MobileDataList with Chinese field labels', async () => {
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);
    mockUseProjectPage.mockReturnValue(controllerBase as never);

    renderPage();

    const mobileRow = await screen.findByTestId('project-row-mobile-pr1');
    expect(mobileRow.textContent).toContain('Kitchen Remodel');
    expect(mobileRow.textContent).toContain('淨現金流');
    expect(mobileRow.textContent).toContain('NT$60,000');

    const list = mobileRow.closest('div.md\\:hidden') ?? mobileRow.parentElement;
    expect(list?.className).toContain('md:hidden');

    fireEvent.click(mobileRow);
    expect(navigate).toHaveBeenCalledWith('/projects/pr1');
  });

  it('exposes the keyboard equivalent for row navigation on desktop and mobile', async () => {
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);
    mockUseProjectPage.mockReturnValue(controllerBase as never);

    renderPage();

    const desktopRow = await screen.findByTestId('project-row-pr1');
    expect(desktopRow).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(desktopRow, { key: 'Enter' });
    expect(navigate).toHaveBeenCalledWith('/projects/pr1');

    navigate.mockClear();
    const mobileRow = await screen.findByTestId('project-row-mobile-pr1');
    expect(mobileRow).toHaveAttribute('role', 'button');
    expect(mobileRow).toHaveAttribute('tabindex', '0');
    fireEvent.keyDown(mobileRow, { key: ' ' });
    expect(navigate).toHaveBeenCalledWith('/projects/pr1');
  });

  it('hides the desktop scroll area on mobile via the shared container', async () => {
    mockUseProjectPage.mockReturnValue(controllerBase as never);

    renderPage();

    const tableCell = await screen.findByTestId('project-row-pr1');
    const scrollArea = tableCell.closest('div.hidden');
    expect(scrollArea).not.toBeNull();
    expect(scrollArea!.className).toContain('hidden');
    expect(scrollArea!.className).toContain('md:block');
  });

  it('renders the loading skeleton with a status role', () => {
    mockUseProjectPage.mockReturnValue({ ...controllerBase, loading: true } as never);

    renderPage();

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(PROJECTS_PAGE_LABELS.LOADING_LABEL)).toBeInTheDocument();
  });

  it('renders an error alert with a working retry action', () => {
    const reload = vi.fn();
    mockUseProjectPage.mockReturnValue({
      ...controllerBase,
      error: new Error('boom'),
      reload,
    } as never);

    renderPage();

    expect(screen.getByText(PROJECTS_PAGE_LABELS.LOAD_ERROR)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /重試/ }));
    expect(reload).toHaveBeenCalled();
  });

  it('renders the empty state and create action when there are no projects', () => {
    const openForm = vi.fn();
    mockUseProjectPage.mockReturnValue({ ...controllerBase, rows: [], openForm } as never);

    renderPage();

    expect(screen.getByText(PROJECTS_PAGE_LABELS.EMPTY_TITLE)).toBeInTheDocument();
    const createButtons = screen.getAllByRole('button', {
      name: PROJECTS_PAGE_LABELS.CREATE_ACTION,
    });
    fireEvent.click(createButtons[createButtons.length - 1]);
    expect(openForm).toHaveBeenCalled();
  });

  it('exposes the view filter in the content area and switches it', () => {
    const setShowInactive = vi.fn();
    mockUseProjectPage.mockReturnValue({ ...controllerBase, setShowInactive } as never);

    renderPage();

    expect(
      screen.getByRole('group', { name: PROJECTS_PAGE_LABELS.FILTER_LABEL }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '僅進行中' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: '含停用' }));
    expect(setShowInactive).toHaveBeenCalledWith(true);
  });

  it('shows only the create action in the header', () => {
    mockUseProjectPage.mockReturnValue(controllerBase as never);

    renderPage();

    expect(screen.queryByRole('button', { name: /New Project/i })).toBeNull();
    expect(
      screen.getByRole('button', { name: PROJECTS_PAGE_LABELS.CREATE_ACTION }),
    ).toBeInTheDocument();
  });
});

describe('ProjectsPage drag reorder', () => {
  const rowA = {
    id: 'pr1',
    name: 'Kitchen Remodel',
    isActive: true,
    income: 0,
    expense: 0,
    net: 0,
  };
  const rowB = { id: 'pr2', name: 'Garage Build', isActive: true, income: 0, expense: 0, net: 0 };

  beforeEach(() => {
    mockUseAuth.mockReturnValue(authProfile as never);
    mockUseNavigate.mockReturnValue(vi.fn());
    mockUseProjectPage.mockReturnValue({
      ...controllerBase,
      rows: [rowA, rowB],
    } as never);
  });

  it('renders a grip handle on every row (desktop and mobile)', async () => {
    renderPage();

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
    const navigate = vi.fn();
    mockUseNavigate.mockReturnValue(navigate);

    renderPage();

    fireEvent.click(await screen.findByTestId('project-row-pr1'));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/projects/pr1'));
  });
});
