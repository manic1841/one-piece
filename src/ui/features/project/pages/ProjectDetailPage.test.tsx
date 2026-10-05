import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getProjectUseCase } from '@/application/project/use_cases/getProjectUseCase';
import { type Project } from '@/domains/project/schemas';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import {
  PROJECT_BALANCE_MISSING,
  PROJECT_DANGER_LABELS,
  PROJECT_DETAIL_LABELS,
} from '@/ui/constants/project/projectDetailLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useProjectCmds } from '@/ui/features/project/hooks/useProjectCmds';
import { useProjectDetailView } from '@/ui/features/project/hooks/useProjectDetailView';

import ProjectDetailPage from './ProjectDetailPage';

vi.mock('@/ui/contexts/useAuthState');
vi.mock('@/ui/components/confirm/useConfirm');
vi.mock('@/ui/features/project/hooks/useProjectCmds');
vi.mock('@/ui/features/project/hooks/useProjectDetailView');
vi.mock('@/application/debt/use_cases/listDebtAccountsUseCase', () => ({
  listDebtAccountsUseCase: {
    execute: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('@/application/project/use_cases/getProjectUseCase', () => ({
  getProjectUseCase: {
    execute: vi.fn().mockResolvedValue(null),
  },
}));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: 'p1' })),
  };
});

const mockUseAuth = vi.mocked(useAuthState);
const mockUseConfirm = vi.mocked(useConfirm);
const mockUseProjectCmds = vi.mocked(useProjectCmds);
const mockUseProjectDetailView = vi.mocked(useProjectDetailView);

const buildProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'p1',
  name: 'Renovation',
  order: 0,
  isActive: true,
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});

const learnViewResult = {
  monthGroups: [],
  totals: { income: 150000, expense: 90000, net: 60000 },
  latestSnapshot: null,
  loading: false,
  error: null,
  reload: vi.fn(),
};

const renderDetail = (project: Project) =>
  render(
    <MemoryRouter initialEntries={[`/projects/${project.id}`]}>
      <ProjectDetailPage project={project} />
    </MemoryRouter>,
  );

const renderDetailWithoutProject = () =>
  render(
    <MemoryRouter initialEntries={['/projects/p1']}>
      <ProjectDetailPage />
    </MemoryRouter>,
  );

describe('ProjectDetailPage lifecycle actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      userProfile: {
        uid: 'u1',
        email: 'user@example.com',
        householdId: 'h1',
      },
    } as never);
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(true) } as never);
    mockUseProjectCmds.mockReturnValue({
      updateProject: vi.fn().mockResolvedValue({ ok: true, value: true }),
    } as never);
    mockUseProjectDetailView.mockReturnValue(learnViewResult as never);
  });

  it('shows the 停用專案 action with the destructive tone for an active project', () => {
    renderDetail(buildProject());

    const button = screen.getByRole('button', { name: PROJECT_DETAIL_LABELS.DEACTIVATE_ACTION });
    expect(button.className).toContain('border-negative');
    expect(
      screen.queryByRole('button', { name: PROJECT_DETAIL_LABELS.ACTIVATE_ACTION }),
    ).not.toBeInTheDocument();
  });

  it('shows the 啟用專案 action with the outline tone and inactive glyph for an inactive project', () => {
    renderDetail(buildProject({ isActive: false }));

    const button = screen.getByRole('button', { name: PROJECT_DETAIL_LABELS.ACTIVATE_ACTION });
    expect(button.className).toContain('border-input');
    expect(
      screen.queryByRole('button', { name: PROJECT_DETAIL_LABELS.DEACTIVATE_ACTION }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(PROJECT_DETAIL_LABELS.INACTIVE_BADGE)).toBeInTheDocument();
  });

  it('deactivates via the existing update command and reflects the new state', async () => {
    const updateProject = vi.fn().mockResolvedValue({ ok: true, value: true });
    mockUseProjectCmds.mockReturnValue({ updateProject } as never);

    renderDetail(buildProject());

    fireEvent.click(screen.getByRole('button', { name: PROJECT_DETAIL_LABELS.DEACTIVATE_ACTION }));

    await waitFor(() => expect(updateProject).toHaveBeenCalledWith('p1', { isActive: false }));
    expect(
      await screen.findByRole('button', { name: PROJECT_DETAIL_LABELS.ACTIVATE_ACTION }),
    ).toBeInTheDocument();
  });

  it('activates an inactive project via the existing update command', async () => {
    const updateProject = vi.fn().mockResolvedValue({ ok: true, value: true });
    mockUseProjectCmds.mockReturnValue({ updateProject } as never);

    renderDetail(buildProject({ isActive: false }));

    fireEvent.click(screen.getByRole('button', { name: PROJECT_DETAIL_LABELS.ACTIVATE_ACTION }));

    await waitFor(() => expect(updateProject).toHaveBeenCalledWith('p1', { isActive: true }));
    expect(
      await screen.findByRole('button', { name: PROJECT_DETAIL_LABELS.DEACTIVATE_ACTION }),
    ).toBeInTheDocument();
  });
});

describe('ProjectDetailPage states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      userProfile: { uid: 'u1', email: 'user@example.com', householdId: 'h1' },
    } as never);
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(true) } as never);
    mockUseProjectCmds.mockReturnValue({
      updateProject: vi.fn().mockResolvedValue({ ok: true, value: true }),
    } as never);
  });

  it('renders the loading skeleton while the project view is loading', () => {
    mockUseProjectDetailView.mockReturnValue({
      ...learnViewResult,
      loading: true,
    } as never);

    renderDetail(buildProject());

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(PROJECT_DETAIL_LABELS.LOADING_LABEL)).toBeInTheDocument();
  });

  it('renders the error alert with a retry action when the view fails', () => {
    const reload = vi.fn();
    mockUseProjectDetailView.mockReturnValue({
      ...learnViewResult,
      error: PROJECT_DETAIL_LABELS.LOAD_ERROR,
      reload,
    } as never);

    renderDetail(buildProject());

    expect(screen.getByText(PROJECT_DETAIL_LABELS.LOAD_ERROR)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /重試/ }));
    expect(reload).toHaveBeenCalled();
  });

  it('renders the not-found empty state with a back-to-list action', async () => {
    mockUseProjectDetailView.mockReturnValue(learnViewResult as never);

    renderDetailWithoutProject();

    expect(await screen.findByText(PROJECT_DETAIL_LABELS.NOT_FOUND_TITLE)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: PROJECT_DETAIL_LABELS.NOT_FOUND_ACTION }),
    ).toBeInTheDocument();
  });

  it('shows a retry error, not the not-found state, when the project fetch fails', async () => {
    mockUseProjectDetailView.mockReturnValue(learnViewResult as never);
    vi.mocked(getProjectUseCase.execute).mockRejectedValueOnce(new Error('offline'));

    renderDetailWithoutProject();

    expect(await screen.findByText(PROJECT_DETAIL_LABELS.LOAD_ERROR)).toBeInTheDocument();
    expect(screen.queryByText(PROJECT_DETAIL_LABELS.NOT_FOUND_TITLE)).not.toBeInTheDocument();
  });

  it('renders the summary metrics and the cash-flow panel', () => {
    mockUseProjectDetailView.mockReturnValue(learnViewResult as never);

    renderDetail(buildProject());

    expect(screen.getByText(PROJECT_DETAIL_LABELS.SUMMARY_SECTION_TITLE)).toBeInTheDocument();
    expect(screen.getByText('NT$150,000')).toBeInTheDocument();
    expect(screen.getByText('NT$90,000')).toBeInTheDocument();
    expect(screen.getByText(PROJECT_DETAIL_LABELS.CASH_FLOW_SECTION_TITLE)).toBeInTheDocument();
    expect(screen.getByText(PROJECT_DETAIL_LABELS.CASH_FLOW_EMPTY_HINT)).toBeInTheDocument();
  });

  it('takes the summary balance from the latest snapshot, never from the period net', () => {
    mockUseProjectDetailView.mockReturnValue(learnViewResult as never);
    const { unmount } = renderDetail(buildProject());

    expect(screen.getByText(PROJECT_BALANCE_MISSING)).toBeInTheDocument();
    unmount();

    mockUseProjectDetailView.mockReturnValue({
      ...learnViewResult,
      latestSnapshot: { closingBalanceText: 'NT$40,000' },
    } as never);
    renderDetail(buildProject());

    expect(screen.getByText('NT$40,000')).toBeInTheDocument();
    expect(screen.queryByText(PROJECT_BALANCE_MISSING)).not.toBeInTheDocument();
  });
});

describe('ProjectDetailPage danger zone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      userProfile: { uid: 'u1', email: 'user@example.com', householdId: 'h1' },
    } as never);
    mockUseProjectDetailView.mockReturnValue(learnViewResult as never);
  });

  it('deletes the project from the danger zone after confirmation', async () => {
    const deleteProject = vi.fn().mockResolvedValue({ ok: true, value: true });
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(true) } as never);
    mockUseProjectCmds.mockReturnValue({
      updateProject: vi.fn(),
      deleteProject,
    } as never);

    renderDetail(buildProject());

    fireEvent.click(screen.getByRole('button', { name: PROJECT_DANGER_LABELS.DELETE }));

    await waitFor(() => expect(deleteProject).toHaveBeenCalledWith('p1'));
  });

  it('does not delete when the confirmation is dismissed', async () => {
    const deleteProject = vi.fn().mockResolvedValue({ ok: true, value: true });
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(false) } as never);
    mockUseProjectCmds.mockReturnValue({
      updateProject: vi.fn(),
      deleteProject,
    } as never);

    renderDetail(buildProject());

    fireEvent.click(screen.getByRole('button', { name: PROJECT_DANGER_LABELS.DELETE }));

    await waitFor(() => expect(deleteProject).not.toHaveBeenCalled());
  });
});
