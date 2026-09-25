import { householdPermissionService } from '@/application/household/householdPermissionService';
import {
  MonthlyCloseCommandError,
  MonthlyCloseCommandErrorCode,
} from '@/application/monthly_close/errors';
import {
  GetFinancialPeriodUseCase,
  ListFinancialPeriodsUseCase,
  SaveFinancialPeriodUseCase,
} from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import {
  CheckCloseReadinessUseCase,
  RunFinancialReportsUseCase,
} from '@/application/monthly_close/use_cases/financialReportsWorkflowUseCases';
import {
  type MonthlyCloseConfirmRequest,
  type MonthlyCloseStartRequest,
} from '@/application/monthly_close/use_cases/monthlyCloseRequests';
import { RecordDebtRepaymentsUseCase } from '@/application/monthly_close/use_cases/recordDebtRepaymentsUseCase';
import { RecordMonthSnapshotsUseCase } from '@/application/monthly_close/use_cases/recordMonthSnapshotsUseCase';
import { RecordPortfolioCashFlowsUseCase } from '@/application/monthly_close/use_cases/recordPortfolioCashFlowsUseCase';
import { SyncInvestmentFinancingTransactionsUseCase } from '@/application/monthly_close/use_cases/syncInvestmentFinancingTransactionsUseCase';
import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';
import { checkSettlementCompletenessUseCase } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { settleProjectsUseCase } from '@/application/settlement/use_cases/settleProjectsUseCase';
import { type AuthContext } from '@/application/types';
import {
  type CloseStageId,
  type FinancialPeriod,
  type FinancialPeriodCreate,
  initialStageStates,
} from '@/domains/financial_period/schemas';
import {
  closePeriodInState,
  confirmStageInState,
  isReconfirmableStage,
  isReopenablePeriod,
  markNeedsReviewInState,
  reconfirmStageInState,
  reopenPeriodInState,
  supersedeClosedPeriodInState,
} from '@/domains/financial_period/stateMachine';

export type {
  AccountBalanceInput,
  DebtRepaymentInput,
  FinancingInput,
  InvestmentFinancingInput,
  MonthlyCloseConfirmRequest,
  MonthlyCloseStartRequest,
  SecuritiesTradeInput,
} from '@/application/monthly_close/use_cases/monthlyCloseRequests';

export class MonthlyCloseWorkflowUseCase {
  private readonly getPeriod = new GetFinancialPeriodUseCase();
  private readonly savePeriod = new SaveFinancialPeriodUseCase();
  private readonly listPeriods = new ListFinancialPeriodsUseCase();
  private readonly syncInvestmentFinancing = new SyncInvestmentFinancingTransactionsUseCase();
  private readonly recordMonthSnapshots = new RecordMonthSnapshotsUseCase();
  private readonly recordPortfolioCashFlows = new RecordPortfolioCashFlowsUseCase();
  private readonly recordDebtRepayments = new RecordDebtRepaymentsUseCase();
  private readonly runFinancialReports = new RunFinancialReportsUseCase();
  private readonly checkCloseReadiness = new CheckCloseReadinessUseCase();

  async start(request: MonthlyCloseStartRequest): Promise<FinancialPeriod> {
    const { householdId, yearMonth, userEmail, auth } = request;
    await this.assertMember(householdId, auth);

    const existing = await this.getPeriod.execute({ householdId, yearMonth });
    if (existing) return existing;

    const period: FinancialPeriodCreate = {
      yearMonth,
      status: 'IN_PROGRESS',
      stages: initialStageStates(),
      reviewSourceStageId: null,
    };
    await this.savePeriod.execute({ householdId, period, userEmail });
    return {
      ...period,
      id: yearMonth,
      createdBy: userEmail,
      createdAt: new Date(),
      updatedBy: userEmail,
      updatedAt: new Date(),
    };
  }

  /**
   * Reopen (ADR-0066): a closed or cascade-demoted period's finalize decision
   * is withdrawn, its Financial Reports and Close Period stages reset to
   * PENDING, and later closed periods are demoted to NEEDS_REVIEW because they
   * may rest on pre-correction history. Guards run before any side effect.
   */
  async reopen(request: MonthlyCloseStartRequest): Promise<FinancialPeriod> {
    const { householdId, yearMonth, userEmail, auth } = request;
    await this.assertMember(householdId, auth);

    const current = await this.getPeriod.execute({ householdId, yearMonth });
    if (!current) {
      throw new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.PERIOD_NOT_STARTED,
        'nothing to reopen: the period has not started closing',
      );
    }
    if (!isReopenablePeriod(current)) {
      throw new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.PERIOD_NOT_REOPENABLE,
        'only a closed or cascade-demoted period can be reopened',
      );
    }

    const reopened = reopenPeriodInState(current);
    const demoted = await this.supersedeLaterClosedPeriods(householdId, yearMonth);

    // One batch commit (ADR-0066): the reopen and its cascade are all-or-nothing.
    await this.savePeriod.saveAll({
      householdId,
      periods: [reopened, ...demoted].map((period) => this.toPeriodCreate(period)),
      userEmail,
    });

    return reopened;
  }

  /** Cascade (ADR-0066): only CLOSED periods after the reopened one; manual recovery. */
  private async supersedeLaterClosedPeriods(
    householdId: string,
    reopenedYearMonth: string,
  ): Promise<FinancialPeriod[]> {
    const periods = await this.listPeriods.execute({ householdId });
    return periods
      .filter((period) => period.yearMonth > reopenedYearMonth && period.status === 'CLOSED')
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
      .map((period) => supersedeClosedPeriodInState(period));
  }

  /**
   * Single-phase stage confirmation (ADR-0052): the confirmation idempotently
   * creates that stage's data from the submitted inputs, then marks the stage
   * complete. Stage order is UI guidance only; the system does not enforce it.
   */
  async confirmStage(request: MonthlyCloseConfirmRequest): Promise<FinancialPeriod> {
    const { householdId, yearMonth, userEmail, auth, stageId } = request;
    await this.assertMember(householdId, auth);

    const current = await this.getPeriod.execute({ householdId, yearMonth });
    if (!current) {
      throw new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.PERIOD_NOT_STARTED,
        'start the closing workflow before confirming stages',
      );
    }

    this.assertStageConfirmable(current, stageId);

    if (
      current.status === 'NEEDS_REVIEW' &&
      current.reviewSourceStageId === 'COMPLETENESS_CHECK' &&
      stageId === 'COMPLETENESS_CHECK'
    ) {
      // ADR-0052: resolving the review means completing the stage confirmation,
      // which returns the workflow to IN_PROGRESS without re-running the check.
      return this.completeConfirm(current, stageId, userEmail, householdId);
    }

    if (stageId === 'COMPLETENESS_CHECK') {
      const paused = await this.runCompletenessCheck(
        householdId,
        yearMonth,
        auth,
        current,
        userEmail,
      );
      if (paused) return paused;
    }

    if (stageId === 'FINANCIAL_REPORTS' || stageId === 'CLOSE_PERIOD') {
      if (current.status === 'NEEDS_REVIEW') {
        throw new MonthlyCloseCommandError(
          MonthlyCloseCommandErrorCode.NEEDS_REVIEW_BLOCKED,
          'resolve the review before confirming this stage',
        );
      }
    }

    await this.runStageAction(yearMonth, auth, request);

    return this.completeConfirm(current, stageId, userEmail, householdId);
  }

  private async completeConfirm(
    current: FinancialPeriod,
    stageId: CloseStageId,
    userEmail: string,
    householdId: string,
  ): Promise<FinancialPeriod> {
    const isReconfirm =
      isReconfirmableStage(stageId) && current.stages[stageId]?.status === 'COMPLETED';
    let period = isReconfirm
      ? reconfirmStageInState(current, stageId, userEmail, new Date())
      : confirmStageInState(current, stageId, userEmail, new Date());

    if (stageId === 'CLOSE_PERIOD') {
      period = closePeriodInState(period, userEmail, new Date());
    }

    await this.savePeriod.execute({
      householdId,
      period: this.toPeriodCreate(period),
      userEmail,
    });
    return period;
  }

  private toPeriodCreate(period: FinancialPeriod): FinancialPeriodCreate {
    return {
      yearMonth: period.yearMonth,
      status: period.status,
      stages: period.stages,
      reviewSourceStageId: period.reviewSourceStageId ?? null,
    };
  }

  /**
   * Guards run before any side effect: a CLOSED period or an already-completed
   * stage must not commit data creation (issue #100 acceptance criteria).
   */
  private assertStageConfirmable(period: FinancialPeriod, stageId: CloseStageId): void {
    if (period.status === 'CLOSED') {
      throw new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.PERIOD_CLOSED,
        'period is closed',
      );
    }
    if (period.stages[stageId]?.status === 'COMPLETED' && !isReconfirmableStage(stageId)) {
      throw new MonthlyCloseCommandError(
        MonthlyCloseCommandErrorCode.STAGE_ALREADY_COMPLETED,
        'stage already confirmed',
      );
    }
  }

  /**
   * Completeness Check is the only NEEDS_REVIEW source (ADR-0052). Zero-activity
   * anomalies pause the workflow without completing the stage, so the same
   * confirmation acts as the resolution path once the user has reviewed.
   */
  private async runCompletenessCheck(
    householdId: string,
    yearMonth: string,
    auth: AuthContext,
    current: FinancialPeriod,
    userEmail: string,
  ): Promise<FinancialPeriod | null> {
    const { anomalies } = await checkSettlementCompletenessUseCase.execute({
      householdId,
      year: this.yearOf(yearMonth),
      month: this.monthOf(yearMonth),
      auth,
    });
    if (anomalies.length === 0) return null;

    const period = markNeedsReviewInState(current, 'COMPLETENESS_CHECK');
    await this.savePeriod.execute({
      householdId,
      period: this.toPeriodCreate(period),
      userEmail,
    });
    return period;
  }

  private async runStageAction(
    yearMonth: string,
    auth: AuthContext,
    request: MonthlyCloseConfirmRequest,
  ): Promise<void> {
    const { householdId, userEmail, stageId } = request;

    switch (stageId) {
      case 'ACCOUNT_BALANCE': {
        await this.recordMonthSnapshots.execute({
          householdId,
          year: this.yearOf(yearMonth),
          month: this.monthOf(yearMonth),
          accountBalances: request.accountBalances ?? [],
          userEmail,
          auth,
        });
        return;
      }
      case 'TRANSACTION_VALIDATION': {
        await validateMonthTransactionsUseCase.execute({
          householdId,
          year: this.yearOf(yearMonth),
          month: this.monthOf(yearMonth),
          auth,
        });
        return;
      }
      case 'SECURITIES_TRADE': {
        const securities = request.securities;
        const financing = request.financing;
        await this.syncInvestmentFinancing.execute({
          householdId,
          userEmail,
          auth,
          securities: securities ?? { buys: [], sells: [] },
          financing: financing ?? { shareholderFinancing: [], dividendPayout: [] },
          removedTransactionIds: request.removedTransactionIds,
        });
        return;
      }
      case 'PORTFOLIO_CASH_FLOW': {
        await this.recordPortfolioCashFlows.execute({
          householdId,
          year: this.yearOf(yearMonth),
          month: this.monthOf(yearMonth),
          portfolioCashFlows: request.portfolioCashFlows ?? {},
          userEmail,
          auth,
        });
        return;
      }
      case 'PROJECT_SETTLEMENT': {
        await settleProjectsUseCase.execute({ householdId, yearMonth, userEmail, auth });
        return;
      }
      case 'DEBT_REPAYMENT': {
        await this.recordDebtRepayments.execute({
          householdId,
          yearMonth,
          repayments: request.repayments ?? [],
          userEmail,
          auth,
        });
        return;
      }
      case 'COMPLETENESS_CHECK': {
        return;
      }
      case 'FINANCIAL_REPORTS': {
        await this.runFinancialReports.execute({
          householdId,
          auth,
          year: this.yearOf(yearMonth),
          month: this.monthOf(yearMonth),
        });
        return;
      }
      case 'CLOSE_PERIOD': {
        await this.checkCloseReadiness.execute({ householdId, yearMonth });
        return;
      }
    }
  }

  private yearOf(yearMonth: string): number {
    return Number(yearMonth.slice(0, 4));
  }

  private monthOf(yearMonth: string): number {
    return Number(yearMonth.slice(5, 7));
  }

  private async assertMember(householdId: string, auth: AuthContext): Promise<void> {
    await householdPermissionService.assertReadPermission(
      householdId,
      auth.uid,
      auth.isGlobalAdmin,
    );
  }
}

export const monthlyCloseWorkflowUseCase = new MonthlyCloseWorkflowUseCase();
