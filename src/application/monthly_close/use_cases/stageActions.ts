import { settleProjectsUseCase } from '@/application/settlement/use_cases/settleProjectsUseCase';
import { type CloseStageId, type FinancialPeriod } from '@/domains/financial_period/schemas';
import { isReadyToClose } from '@/domains/financial_period/stateMachine';

import { MonthlyCloseCommandError, MonthlyCloseCommandErrorCode } from '../errors';
import {
  CheckCloseReadinessUseCase,
  RunFinancialReportsUseCase,
} from './financialReportsWorkflowUseCases';
import { type MonthlyCloseConfirmRequest, type StageConfirmData } from './monthlyCloseRequests';
import { RecordDebtRepaymentsUseCase } from './recordDebtRepaymentsUseCase';
import { RecordMonthSnapshotsUseCase } from './recordMonthSnapshotsUseCase';
import { RecordPortfolioCashFlowsUseCase } from './recordPortfolioCashFlowsUseCase';
import { SyncInvestmentFinancingTransactionsUseCase } from './syncInvestmentFinancingTransactionsUseCase';

/**
 * One stage's confirm action. The request is this stage's own member and already
 * carries the confirm's identity (`householdId` / `yearMonth` / `userEmail` /
 * `auth`), so the payload is typed at the definition site — no switch, no `?? []`
 * defaults. `current` is the period as read before this confirm; only the
 * terminal guard reads it.
 */
export type CloseStageAction<S extends CloseStageId> = (
  request: Extract<MonthlyCloseConfirmRequest, { stageId: S }>,
  current: FinancialPeriod,
) => Promise<StageConfirmData<S>>;

const runFinancialReports = new RunFinancialReportsUseCase();
const checkCloseReadiness = new CheckCloseReadinessUseCase();
const recordMonthSnapshots = new RecordMonthSnapshotsUseCase();
const recordPortfolioCashFlows = new RecordPortfolioCashFlowsUseCase();
const recordDebtRepayments = new RecordDebtRepaymentsUseCase();
const syncInvestmentFinancing = new SyncInvestmentFinancingTransactionsUseCase();

const yearOf = (yearMonth: string): number => Number(yearMonth.slice(0, 4));
const monthOf = (yearMonth: string): number => Number(yearMonth.slice(5, 7));

/**
 * The stage-action registry: the single axis a new close stage extends. Each
 * entry creates that stage's data; the terminal steps (COMPLETENESS_CHECK is a
 * deliberate no-op, CLOSE_PERIOD only guards) are explicit entries so the map
 * stays total. The orchestrator keeps the permissions, state machine and cascade.
 */
export const closeStageActions: { [K in CloseStageId]: CloseStageAction<K> } = {
  ACCOUNT_BALANCE: async (request) => {
    await recordMonthSnapshots.execute({
      householdId: request.householdId,
      year: yearOf(request.yearMonth),
      month: monthOf(request.yearMonth),
      accountBalances: request.accountBalances,
      userEmail: request.userEmail,
      auth: request.auth,
    });
    return undefined;
  },
  SECURITIES_TRADE: async (request) => {
    const result = await syncInvestmentFinancing.execute({
      householdId: request.householdId,
      userEmail: request.userEmail,
      auth: request.auth,
      securities: request.securities,
      financing: request.financing,
      removedTransactionIds: request.removedTransactionIds,
    });
    return result;
  },
  PORTFOLIO_CASH_FLOW: async (request) => {
    await recordPortfolioCashFlows.execute({
      householdId: request.householdId,
      year: yearOf(request.yearMonth),
      month: monthOf(request.yearMonth),
      portfolioCashFlows: request.portfolioCashFlows,
      userEmail: request.userEmail,
      auth: request.auth,
    });
    return undefined;
  },
  PROJECT_SETTLEMENT: async (request) => {
    await settleProjectsUseCase.execute({
      householdId: request.householdId,
      yearMonth: request.yearMonth,
      userEmail: request.userEmail,
      auth: request.auth,
    });
    return undefined;
  },
  DEBT_REPAYMENT: async (request) => {
    await recordDebtRepayments.execute({
      householdId: request.householdId,
      yearMonth: request.yearMonth,
      repayments: request.repayments,
      userEmail: request.userEmail,
      auth: request.auth,
    });
    return undefined;
  },
  // Completeness is a read-only check: the stage creates nothing. It is an
  // explicit entry (not an omission) so the registry stays total.
  COMPLETENESS_CHECK: async () => undefined,
  FINANCIAL_REPORTS: async (request) => {
    await runFinancialReports.execute({
      householdId: request.householdId,
      auth: request.auth,
      year: yearOf(request.yearMonth),
      month: monthOf(request.yearMonth),
      labelResolver: request.labelResolver,
    });
    return undefined;
  },
  // The terminal guard: verifies reports are persisted and every walk stage is
  // complete before the close transition. It creates no data.
  CLOSE_PERIOD: async (request, current) => {
    await checkCloseReadiness.execute({
      householdId: request.householdId,
      yearMonth: request.yearMonth,
      period: current,
    });
    if (!isReadyToClose(current)) {
      throw new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.STAGES_INCOMPLETE,
        'every stage must be completed before closing',
      );
    }
    return undefined;
  },
};
