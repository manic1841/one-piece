import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Project } from '@/domains/project/schemas';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useProjectCmds } from '@/ui/features/project/hooks/useProjectCmds';
import { useProjectDetailView } from '@/ui/features/project/hooks/useProjectDetailView';

import ProjectDetailPage from './ProjectDetailPage';

vi.mock('@/ui/contexts/useAuthState');
vi.mock('@/ui/features/project/hooks/useProjectCmds');
vi.mock('@/ui/features/project/hooks/useProjectDetailView');
vi.mock('@/application/debt/use_cases/listDebtAccountsUseCase', () => ({
  listDebtAccountsUseCase: {
    execute: vi.fn().mockResolvedValue([]),
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

const renderDetail = (project: Project) => {
  return render(
    <MemoryRouter initialEntries={[`/projects/${project.id}`]}>
      <ProjectDetailPage project={project} />
    </MemoryRouter>,
  );
};

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
    mockUseProjectCmds.mockReturnValue({
      updateProject: vi.fn().mockResolvedValue({ ok: true, value: true }),
    } as never);
    mockUseProjectDetailView.mockReturnValue({
      items: [],
      history: [],
      selectedYearMonth: 'current',
      setSelectedYearMonth: vi.fn(),
      currentSnapshot: null,
    } as never);
  });

  it('shows the 停用 Project action for an active project with the inactive glyph absent', () => {
    renderDetail(buildProject());

    expect(screen.getByRole('button', { name: '停用 Project' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '啟用 Project' })).not.toBeInTheDocument();
    expect(screen.queryByText('INACTIVE')).toBeNull();
  });

  it('shows the 啟用 Project action and inactive glyph for an inactive project', () => {
    renderDetail(buildProject({ isActive: false }));

    expect(screen.getByRole('button', { name: '啟用 Project' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '停用 Project' })).not.toBeInTheDocument();
    expect(screen.getByText('INACTIVE')).toBeInTheDocument();
  });

  it('deactivates via the existing update command and reflects the new state', async () => {
    const updateProject = vi.fn().mockResolvedValue({ ok: true, value: true });
    mockUseProjectCmds.mockReturnValue({ updateProject } as never);

    renderDetail(buildProject());

    fireEvent.click(screen.getByRole('button', { name: '停用 Project' }));

    await waitFor(() => expect(updateProject).toHaveBeenCalledWith('p1', { isActive: false }));
    expect(await screen.findByRole('button', { name: '啟用 Project' })).toBeInTheDocument();
  });

  it('activates an inactive project via the existing update command', async () => {
    const updateProject = vi.fn().mockResolvedValue({ ok: true, value: true });
    mockUseProjectCmds.mockReturnValue({ updateProject } as never);

    renderDetail(buildProject({ isActive: false }));

    fireEvent.click(screen.getByRole('button', { name: '啟用 Project' }));

    await waitFor(() => expect(updateProject).toHaveBeenCalledWith('p1', { isActive: true }));
    expect(await screen.findByRole('button', { name: '停用 Project' })).toBeInTheDocument();
  });
});
