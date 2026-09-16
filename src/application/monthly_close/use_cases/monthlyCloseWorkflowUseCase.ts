import { batchRecordSnapshotsUseCase } from '@/application/account/use_cases/batchRecordSnapshotsUseCase';
import { createDebtPaymentUseCase } from '@/application/debt/use_cases/createDebtPaymentUseCase';
import { householdPermissionService } from '@/application/household/householdPermissionService';
import { createTransactionUseCase } from '@/application/ledger/use_cases/createTransactionUseCase';
import { MonthlyCloseCommandError, MonthlyCloseCommandErrorCode } from '@/application/monthly_close/errors';
import {
  GetFinancialPeriodUseCase,
  SaveFinancialPeriodUseCase,
} from '@/application/monthly_close/use_cases/financialPeriodAccessUseCases';
import { createPortfolioSnapshotUseCase } from '@/application/portfolio/use_cases/createPortfolioSnapshotUseCase';
import { listPortfolioSnapshotsUseCase } from '@/application/portfolio/use_cases/listPortfolioSnapshotsUseCase';
import { listPortfoliosUseCase } from '@/application/portfolio/use_cases/listPortfoliosUseCase';
import { generateFinancialReportsUseCase } from '@/application/report/use_cases/generateFinancialReportsUseCase';
import { getReportPersistenceStateUseCase } from '@/application/report/use_cases/getReportPersistenceStateUseCase';
import { checkSettlementCompletenessUseCase } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { settleDebtAccountsUseCase } from '@/application/settlement/use_cases/settleDebtAccountsUseCase';
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
  markNeedsReviewInState,
} from '@/domains/financial_period/stateMachine';

export interface AccountBalanceInput {
  accountId: string;
  amount: number;
}

export interface SecuritiesTradeInput {
  amount: number;
  date: Date;
  description?: string;
}

export interface DebtRepaymentInput {
  debtAccountId: string;
  totalPayment: number;
  date: Date;
  description?: string;
  projectId?: string | null;
}

export interface MonthlyCloseStartRequest {
  householdId: string;
  yearMonth: string;
  userEmail: string;
  auth: AuthContext;
}

export interface MonthlyCloseConfirmRequest extends MonthlyCloseStartRequest {
  stageId: CloseStageId;
  accountBalances?: AccountBalanceInput[];
  securities?: {
    buys: SecuritiesTradeInput[];
    sells: SecuritiesTradeInput[];
  };
  portfolioCashFlows?: Record<string, { deposits: number; withdrawals: number }>;
  repayments?: DebtRepaymentInput[];
}

export class MonthlyCloseWorkflowUseCase {
  private readonly getPeriod = new GetFinancialPeriodUseCase();
  private readonly savePeriod = new SaveFinancialPeriodUseCase();

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
        const balances = request.accountBalances ?? [];
        if (balances.length === 0) {
          throw new MonthlyCloseCommandError(
            MonthlyCloseCommandErrorCode.STAGE_INPUT_REQUIRED,
            'at least one account balance is required',
          );
        }
        await batchRecordSnapshotsUseCase.execute({
          householdId,
          snapshots: balances.map((input) => ({
            accountId: input.accountId,
            data: {
              accountId: input.accountId,
              year: this.yearOf(yearMonth),
              month: this.monthOf(yearMonth),
              amount: input.amount,
            },
          })),
          userEmail,
          auth,
        });
        return;
      }
      case 'SECURITIES_TRADE': {
        const securities = request.securities;
        if (!securities || (securities.buys.length === 0 && securities.sells.length === 0)) {
          throw new MonthlyCloseCommandError(
            MonthlyCloseCommandErrorCode.STAGE_INPUT_REQUIRED,
            'at least one securities trade is required',
          );
        }
        for (const buy of securities.buys) {
          await this.createSecuritiesTransaction(householdId, userEmail, 'SECURITY_BUY', buy);
        }
        for (const sell of securities.sells) {
          await this.createSecuritiesTransaction(householdId, userEmail, 'SECURITY_SELL', sell);
        }
        return;
      }
      case 'PORTFOLIO_CASH_FLOW': {
        const portfolios = await listPortfoliosUseCase.execute({ householdId, auth });
        const cashFlows = request.portfolioCashFlows ?? {};
        for (const portfolio of portfolios) {
          const existingSnapshots = await listPortfolioSnapshotsUseCase.execute({
            householdId,
            portfolioId: portfolio.id,
            year: this.yearOf(yearMonth),
            month: this.monthOf(yearMonth),
          });
          if (existingSnapshots.length > 0) continue;

          await createPortfolioSnapshotUseCase.execute({
            householdId,
            portfolioId: portfolio.id,
            year: this.yearOf(yearMonth),
            month: this.monthOf(yearMonth),
            cashFlow: cashFlows[portfolio.id] ?? { deposits: 0, withdrawals: 0 },
            userEmail,
            auth,
          });
        }
        return;
      }
      case 'PROJECT_SETTLEMENT': {
        await settleProjectsUseCase.execute({ householdId, yearMonth, userEmail, auth });
        return;
      }
      case 'DEBT_REPAYMENT': {
        for (const repayment of request.repayments ?? []) {
          await createDebtPaymentUseCase.execute({
            householdId,
            userEmail,
            auth,
            debtAccountId: repayment.debtAccountId,
            idempotencyKey: `monthly-close:${yearMonth}:${repayment.debtAccountId}:${repayment.totalPayment}:${repayment.date.toISOString()}`,
            totalPayment: repayment.totalPayment,
            date: repayment.date,
            description: repayment.description,
            projectId: repayment.projectId,
          });
        }
        await settleDebtAccountsUseCase.execute({ householdId, yearMonth, userEmail, auth });
        return;
      }
      case 'COMPLETENESS_CHECK': {
        return;
      }
      case 'FINANCIAL_REPORTS': {
        await generateFinancialReportsUseCase.execute({
          householdId,
          auth,
          year: this.yearOf(yearMonth),
          month: this.monthOf(yearMonth),
        });
        return;
      }
      case 'CLOSE_PERIOD': {
        const persistence = await getReportPersistenceStateUseCase.execute({
          householdId,
          yearMonth,
        });
        if (!persistence.isPersisted) {
          throw new MonthlyCloseCommandError(
            MonthlyCloseCommandErrorCode.REPORTS_NOT_PERSISTED,
            'all three reports must be persisted before closing',
          );
        }
        return;
      }
    }
  }

  private async createSecuritiesTransaction(
    householdId: string,
    userEmail: string,
    intent: 'SECURITY_BUY' | 'SECURITY_SELL',
    trade: SecuritiesTradeInput,
  ): Promise<void> {
    const [debitCode, creditCode] =
      intent === 'SECURITY_BUY'
        ? ['asset:investment', 'asset:cash']
        : ['asset:cash', 'asset:investment'];
    await createTransactionUseCase.execute({
      householdId,
      userEmail,
      data: {
        date: trade.date,
        description: trade.description,
        intent,
        intentType: 'INVESTMENT',
        amount: trade.amount,
        projectId: null,
        allocationId: null,
        createdBy: userEmail,
        entries: [
          { ledgerCode: debitCode, debit: trade.amount, credit: 0 },
          { ledgerCode: creditCode, debit: 0, credit: trade.amount },
        ],
      },
    });
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
