import { type QueryConstraint } from 'firebase/firestore';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getHouseholdsByUserUseCase } from '@/application/household/use_cases/getHouseholdsByUserUseCase';
import { listAllLedgerCodesUseCase } from '@/application/ledger/use_cases/listAllLedgerCodesUseCase';
import { listAllocationTemplatesUseCase } from '@/application/ledger/use_cases/listAllocationTemplatesUseCase';
import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { listProjectSnapshotsUseCase } from '@/application/project/use_cases/listProjectSnapshotsUseCase';
import { listProjectsUseCase } from '@/application/project/use_cases/listProjectsUseCase';
import { listReportsUseCase } from '@/application/report/use_cases/listReportsUseCase';
import { allocationTemplateRepository } from '@/infra/repositories/allocationTemplateRepository';
import { customLedgerCodeRepository } from '@/infra/repositories/customLedgerCodeRepository';
import { householdRepository } from '@/infra/repositories/householdRepository';
import { portfolioRepository } from '@/infra/repositories/portfolioRepository';
import { portfolioSnapshotRepository } from '@/infra/repositories/portfolioSnapshotRepository';
import { projectRepository } from '@/infra/repositories/projectRepository';
import { projectSnapshotRepository } from '@/infra/repositories/projectSnapshotRepository';
import { reportRepository } from '@/infra/repositories/reportRepository';
import {
  HOUSEHOLD_LIST_LIMIT,
  LEDGER_CODE_LIST_LIMIT,
  MASTER_LIST_LIMIT,
  REPORT_LIST_LIMIT,
  SNAPSHOT_HISTORY_LIMIT,
} from '@/shared/readLimits';
import { limitOf } from '@/test/queryConstraints';

vi.mock('@/application/household/householdPermissionService', () => ({
  householdPermissionService: { assertReadPermission: vi.fn(), isUserMember: vi.fn() },
}));

vi.mock('@/infra/repositories/projectRepository', () => ({ projectRepository: { list: vi.fn() } }));
vi.mock('@/infra/repositories/projectSnapshotRepository', () => ({
  projectSnapshotRepository: { list: vi.fn() },
}));
vi.mock('@/infra/repositories/portfolioRepository', () => ({
  portfolioRepository: { list: vi.fn() },
}));
vi.mock('@/infra/repositories/portfolioSnapshotRepository', () => ({
  portfolioSnapshotRepository: { list: vi.fn() },
}));
vi.mock('@/infra/repositories/reportRepository', () => ({ reportRepository: { list: vi.fn() } }));
vi.mock('@/infra/repositories/householdRepository', () => ({
  householdRepository: { list: vi.fn() },
}));
vi.mock('@/infra/repositories/allocationTemplateRepository', () => ({
  allocationTemplateRepository: { list: vi.fn() },
}));
vi.mock('@/infra/repositories/customLedgerCodeRepository', () => ({
  customLedgerCodeRepository: { list: vi.fn(), listActive: vi.fn() },
}));

const auth = { uid: 'user-1', email: 'user@example.com', isGlobalAdmin: false };
const labelResolver = (code: string): string => code;

/** 每個清單讀取都要帶上限；`limit` 必須是最後一個條件。 */
const expectCappedAt = (constraints: QueryConstraint[], expected: number): void => {
  expect(constraints.map(limitOf).filter((value) => value !== undefined)).toEqual([expected]);
};

describe('unbounded list reads now carry a cap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(householdRepository.list).mockResolvedValue([]);
    vi.mocked(allocationTemplateRepository.list).mockResolvedValue([]);
    vi.mocked(customLedgerCodeRepository.list).mockResolvedValue([]);
    vi.mocked(customLedgerCodeRepository.listActive).mockResolvedValue([]);
    vi.mocked(portfolioRepository.list).mockResolvedValue([]);
    vi.mocked(portfolioSnapshotRepository.list).mockResolvedValue([]);
    vi.mocked(projectRepository.list).mockResolvedValue([]);
    vi.mocked(projectSnapshotRepository.list).mockResolvedValue([]);
    vi.mocked(reportRepository.list).mockResolvedValue([]);
  });

  it('專案清單', async () => {
    await listProjectsUseCase.execute({ householdId: 'household-1' });

    expectCappedAt(vi.mocked(projectRepository.list).mock.calls[0]?.[1] ?? [], MASTER_LIST_LIMIT);
  });

  it('投資組合清單', async () => {
    await listPortfoliosUseCase.execute({ householdId: 'household-1', auth });

    expectCappedAt(vi.mocked(portfolioRepository.list).mock.calls[0]?.[1] ?? [], MASTER_LIST_LIMIT);
  });

  it('報表清單，且由新到舊截斷', async () => {
    await listReportsUseCase.execute({ householdId: 'household-1', auth });

    const constraints = vi.mocked(reportRepository.list).mock.calls[0]?.[1] ?? [];
    expect(constraints[0]?.type).toBe('orderBy');
    expectCappedAt(constraints, REPORT_LIST_LIMIT);
  });

  it('所屬家戶清單', async () => {
    await getHouseholdsByUserUseCase.execute({ uid: 'user-1' });

    expectCappedAt(
      vi.mocked(householdRepository.list).mock.calls[0]?.[1] ?? [],
      HOUSEHOLD_LIST_LIMIT,
    );
  });

  it('分攤範本清單', async () => {
    await listAllocationTemplatesUseCase.execute({ householdId: 'household-1' });

    expectCappedAt(
      vi.mocked(allocationTemplateRepository.list).mock.calls[0]?.[1] ?? [],
      MASTER_LIST_LIMIT,
    );
  });

  it('連停用科目一起載入的科目清單', async () => {
    await listAllLedgerCodesUseCase.execute({
      householdId: 'household-1',
      auth,
      includeInactive: true,
      labelResolver,
    });

    expectCappedAt(
      vi.mocked(customLedgerCodeRepository.list).mock.calls[0]?.[1] ?? [],
      LEDGER_CODE_LIST_LIMIT,
    );
  });

  it('只載入作用中科目時走 repository 自帶上限的那條路', async () => {
    await listAllLedgerCodesUseCase.execute({ householdId: 'household-1', auth, labelResolver });

    expect(customLedgerCodeRepository.listActive).toHaveBeenCalledWith('household-1');
  });

  it('投資組合快照清單', async () => {
    await listPortfolioSnapshotsUseCase.execute({
      householdId: 'household-1',
      portfolioId: 'portfolio-1',
      auth,
    });

    expectCappedAt(
      vi.mocked(portfolioSnapshotRepository.list).mock.calls[0]?.[1] ?? [],
      SNAPSHOT_HISTORY_LIMIT,
    );
  });

  it('投資組合快照只取最新一筆時收窄到 1', async () => {
    await listPortfolioSnapshotsUseCase.execute({
      householdId: 'household-1',
      portfolioId: 'portfolio-1',
      auth,
      latestOnly: true,
    });

    expectCappedAt(vi.mocked(portfolioSnapshotRepository.list).mock.calls[0]?.[1] ?? [], 1);
  });

  it('專案快照清單', async () => {
    await listProjectSnapshotsUseCase.execute({
      householdId: 'household-1',
      projectId: 'project-1',
    });

    expectCappedAt(
      vi.mocked(projectSnapshotRepository.list).mock.calls[0]?.[1] ?? [],
      SNAPSHOT_HISTORY_LIMIT,
    );
  });
});
