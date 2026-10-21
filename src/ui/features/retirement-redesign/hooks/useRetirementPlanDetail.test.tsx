import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteRetirementPlan,
  getRetirementPlan,
  renameRetirementPlan,
} from '@/application/retirement/use_cases/retirementPlanLookup';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { useAuthIdentity } from '@/ui/hooks/useAuthIdentity';

import { useRetirementPlanDetail } from './useRetirementPlanDetail';

vi.mock('@/application/retirement/use_cases/retirementPlanLookup', () => ({
  getRetirementPlan: vi.fn(),
  renameRetirementPlan: vi.fn(),
  deleteRetirementPlan: vi.fn(),
}));

vi.mock('@/ui/components/confirm/useConfirm');
vi.mock('@/ui/hooks/useAuthIdentity');

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ id: 'plan-1' }),
  };
});

const mockUseConfirm = vi.mocked(useConfirm);
const mockUseAuthIdentity = vi.mocked(useAuthIdentity);
const mockGet = vi.mocked(getRetirementPlan);
const mockRename = vi.mocked(renameRetirementPlan);
const mockDelete = vi.mocked(deleteRetirementPlan);

const plan = {
  id: 'plan-1',
  name: 'Old name',
  assumptions: {
    birthYear: 1990,
    retirementAge: 60,
    lifeExpectancy: 85,
    inflationRate: 0.02,
    annualReturnRate: 0.05,
  },
  projectionRules: [],
  lifeEvents: [],
  createdBy: 'u1',
  updatedBy: 'u1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-02-01'),
};

const renderDetail = () =>
  renderHook(() => useRetirementPlanDetail('h1'), {
    wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
  });

describe('useRetirementPlanDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthIdentity.mockReturnValue({ uid: 'u1', email: 'user@example.com' });
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(true) } as never);
    mockGet.mockResolvedValue(plan as never);
  });

  it('updates the view with the renamed plan', async () => {
    const renamed = { ...plan, name: 'New name', updatedAt: new Date('2026-03-01') };
    mockRename.mockResolvedValue({ ok: true, plan: renamed });

    const { result } = renderDetail();
    await act(async () => {
      await result.current.reload();
    });

    await act(async () => {
      await result.current.rename('New name');
    });

    expect(mockRename).toHaveBeenCalledWith({
      householdId: 'h1',
      planId: 'plan-1',
      name: 'New name',
      userEmail: 'user@example.com',
      auth: { uid: 'u1', email: 'user@example.com' },
    });
    expect(result.current.plan?.name).toBe('New name');
    expect(result.current.plan?.updatedAt).toEqual(new Date('2026-03-01'));
  });

  it('does not delete when the confirm is cancelled', async () => {
    mockUseConfirm.mockReturnValue({ confirm: vi.fn().mockResolvedValue(false) } as never);

    const { result } = renderDetail();
    await act(async () => {
      await result.current.reload();
    });

    let deleted: boolean | undefined;
    await act(async () => {
      deleted = await result.current.remove();
    });

    expect(deleted).toBe(false);
    expect(mockDelete).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('deletes after confirmation and returns to the plan list', async () => {
    mockDelete.mockResolvedValue();

    const { result } = renderDetail();
    await act(async () => {
      await result.current.reload();
    });

    await act(async () => {
      await result.current.remove();
    });

    expect(mockDelete).toHaveBeenCalledWith({
      householdId: 'h1',
      planId: 'plan-1',
      auth: { uid: 'u1', email: 'user@example.com' },
    });
    expect(navigate).toHaveBeenCalledWith('/retirement/plans');
  });
});
