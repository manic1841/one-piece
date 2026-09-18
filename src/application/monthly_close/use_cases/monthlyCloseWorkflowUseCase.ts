import { householdPermissionService } from '@/application/household/householdPermissionService';
import { MonthlyCloseCommandError, MonthlyCloseCommandErrorCode } from '@/application/monthly_close/errors';
import {
  GetFinancialPeriodUseCase,
  SaveFinancialPeriodUseCase,
} from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import {
  CheckCloseReadinessUseCase,
  RunFinancialReportsUseCase,
} from '@/application/monthly_close/use_cases/financialReportsWorkflowUseCases';
import { CreateInvestmentFinancingTransactionsUseCase } from '@/application/monthly_close/use_cases/createInvestmentFinancingTransactionsUseCase';
import { RecordDebtRepaymentsUseCase } from '@/application/monthly_close/use_cases/recordDebtRepaymentsUseCase';
import { RecordMonthSnapshotsUseCase } from '@/application/monthly_close/use_cases/recordMonthSnapshotsUseCase';
import { RecordPortfolioCashFlowsUseCase } from '@/application/monthly_close/use_cases/recordPortfolioCashFlowsUseCase';
import { checkSettlementCompletenessUseCase } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { settleProjectsUseCase } from '@/application/settlement/use_cases/settleProjectsUseCase';
import { validateMonthTransactionsUseCase } from '@/application/monthly_close/use_cases/validateMonthTransactionsUseCase';
import { type AuthContext } from '@/application/types';
import {
  type CloseStageId,
  type FinancialPeriod,
  type FinancialPeriodCreate,
  initialStageStates,
} from '@/domains/financial_period/schemas';
import {
  type MonthlyCloseConfirmRequest,
  type MonthlyCloseStartRequest,
} from '@/application/monthly_close/use_cases/monthlyCloseRequests';
import {
  closePeriodInState,
  confirmStageInState,
  markNeedsReviewInState,
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
  private readonly createInvestmentFinancing = new CreateInvestmentFinancingTransactionsUseCase();
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

    if (current.status === 'NEEDS_REVIEW' && current.reviewSourceStageId === 'COMPLETENESS_CHECK' && stageId === 'COMPLETENESS_CHECK') {
      // ADR-0052: resolving the review means completing the stage confirmation,
      // which returns the workflow to IN_PROGRESS without re-running the check.
      return this.completeConfirm(current, stageId, userEmail, householdId);
    }

    if (stageId === 'COMPLETENESS_CHECK') {
      const paused = await this.runCompletenessCheck(householdId, yearMonth, auth, current, userEmail);
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
    let period = confirmStageInState(current, stageId, userEmail, new Date());

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
      throw new MonthlyCloseCommandError(MonthlyCloseCommandErrorCode.PERIOD_CLOSED, 'period is closed');
    }
    if (period.stages[stageId]?.status === 'COMPLETED') {
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
        const hasSecurities = Boolean(securities && (securities.buys.length > 0 || securities.sells.length > 0));
        const hasFinancing = Boolean(
          financing && (financing.shareholderFinancing.length > 0 || financing.dividendPayout.length > 0),
        );
        if (!hasSecurities && !hasFinancing) {
          throw new MonthlyCloseCommandError(
            MonthlyCloseCommandErrorCode.STAGE_INPUT_REQUIRED,
            'at least one securities trade or financing entry is required',
          );
        }
        await this.createInvestmentFinancing.execute({
          householdId,
          userEmail,
          auth,
          securities,
          financing,
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
    await householdPermissionService.assertReadPermission(householdId, auth.uid, auth.isGlobalAdmin);
  }
}

export const monthlyCloseWorkflowUseCase = new MonthlyCloseWorkflowUseCase();
