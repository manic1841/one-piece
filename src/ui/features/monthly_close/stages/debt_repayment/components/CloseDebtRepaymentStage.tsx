import React from 'react';

import { NumberInput, parseOptionalAmount } from '@/ui/components/data-table';
import { Label } from '@/ui/components/ui/label';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { CloseStageChrome } from '@/ui/features/monthly_close/components/CloseStageChrome';
import { CloseStageEvidenceList } from '@/ui/features/monthly_close/components/CloseStageEvidenceList';
import { CloseStageLoadError } from '@/ui/features/monthly_close/components/CloseStageLoadError';
import { closeMonthDate } from '@/ui/features/monthly_close/stages/debt_repayment/hooks/useDebtRepaymentStage';
import { NO_EVIDENCE } from '@/ui/features/monthly_close/viewmodels/closeEvidence.vm';
import { type DebtSectionMetaVM } from '@/ui/features/monthly_close/viewmodels/debtPayment.vm';
import {
  buildDebtPaymentSections,
  buildDebtPaymentTotal,
} from '@/ui/features/monthly_close/viewmodels/debtPayment.vm';
import { type DebtRepaymentInput } from '@/ui/features/monthly_close/viewmodels/monthlyClose.vm';
import { formatCurrency } from '@/ui/utils';

interface CloseDebtRepaymentStageProps {
  stepText: string;
  progressText: string;
  confirmedAtText: string | null;
  confirming: boolean;
  isReviewing: boolean;
  isConfirmable: boolean;
  isReadOnly: boolean;
  /** Canned copy when the prefill load failed; it does not block confirm. */
  loadErrorMessage?: string | null;
  debtAccounts: DebtSectionMetaVM[];
  yearMonth: string;
  repayments: DebtRepaymentInput[];
  setRepayments: (value: DebtRepaymentInput[]) => void;
  onConfirm: () => void;
  onBackToCurrent: () => void;
}

/**
 * DEBT_REPAYMENT step: per-debt payment inputs rendered inside the shared
 * chrome with the stage evidence above them.
 */
export const CloseDebtRepaymentStage: React.FC<CloseDebtRepaymentStageProps> = ({
  stepText,
  progressText,
  confirmedAtText,
  confirming,
  isReviewing,
  isConfirmable,
  isReadOnly,
  loadErrorMessage = null,
  debtAccounts,
  yearMonth,
  repayments,
  setRepayments,
  onConfirm,
  onBackToCurrent,
}) => {
  const sections = buildDebtPaymentSections({ debtAccounts, repayments });
  const total = buildDebtPaymentTotal(sections);

  const handleTotalPaymentChange = (debtAccountId: string, value: number) => {
    const next = repayments.filter((item) => item.debtAccountId !== debtAccountId);
    next.push({
      debtAccountId,
      totalPayment: value,
      date: closeMonthDate(yearMonth),
    });
    setRepayments(next);
  };

  return (
    <CloseStageChrome
      stepText={stepText}
      progressText={progressText}
      confirmedAtText={confirmedAtText}
      confirming={confirming}
      isReviewing={isReviewing}
      isConfirmable={isConfirmable}
      isReadOnly={isReadOnly}
      showActions
      onConfirm={onConfirm}
      onBackToCurrent={onBackToCurrent}
    >
      <CloseStageLoadError message={loadErrorMessage} />
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {MONTHLY_CLOSE_LABELS.EVIDENCE_LABEL}
        </p>
        <CloseStageEvidenceList evidence={NO_EVIDENCE} />
      </div>
      {debtAccounts.length === 0 ? (
        <p className="text-xs text-muted-foreground">{MONTHLY_CLOSE_LABELS.NO_DATA}</p>
      ) : (
        <div className="space-y-6">
          {sections.map((section, index) => (
            <React.Fragment key={section.debtAccountId}>
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">{section.debtAccountName}</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {MONTHLY_CLOSE_LABELS.INTEREST_RATE}
                    </p>
                    <p className="font-mono text-sm tabular-nums text-foreground">
                      {section.interestRate}%
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {MONTHLY_CLOSE_LABELS.PREVIOUS_BALANCE}
                    </p>
                    <p className="font-mono text-sm tabular-nums text-foreground">
                      {formatCurrency(section.openingBalance)}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {MONTHLY_CLOSE_LABELS.TOTAL_PAYMENT}
                  </Label>
                  <NumberInput
                    disabled={confirming || isReadOnly}
                    placeholder="0"
                    aria-label={`${MONTHLY_CLOSE_LABELS.TOTAL_PAYMENT} ${section.debtAccountName}`}
                    value={section.totalPayment > 0 ? section.totalPayment.toString() : ''}
                    onChange={(event) =>
                      handleTotalPaymentChange(
                        section.debtAccountId,
                        parseOptionalAmount(event.target.value) ?? 0,
                      )
                    }
                  />
                  {section.warning && <p className="text-[10px] text-warning">{section.warning}</p>}
                  {section.blockedReason && (
                    <p className="text-[10px] text-negative" role="alert">
                      {section.blockedReason}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {MONTHLY_CLOSE_LABELS.INTEREST}
                    </p>
                    <p className="font-mono text-sm tabular-nums text-foreground">
                      {formatCurrency(section.interest)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {MONTHLY_CLOSE_LABELS.PRINCIPAL}
                    </p>
                    <p className="font-mono text-sm tabular-nums text-foreground">
                      {formatCurrency(section.principal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {MONTHLY_CLOSE_LABELS.MONTHLY_DUE}
                    </p>
                    <p className="font-mono text-sm tabular-nums text-muted-foreground">
                      {formatCurrency(section.monthlyDue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {MONTHLY_CLOSE_LABELS.CLOSING_BALANCE}
                    </p>
                    <p className="font-mono text-sm tabular-nums text-foreground">
                      {formatCurrency(section.closingBalance)}
                    </p>
                  </div>
                </div>
              </div>
              {index < sections.length - 1 && <div className="border-t border-border" />}
            </React.Fragment>
          ))}
          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {MONTHLY_CLOSE_LABELS.DEBT_TOTAL}
            </p>
            <div className="flex items-center gap-4">
              <p className="font-mono text-sm tabular-nums text-foreground">
                {formatCurrency(total.principal)}
              </p>
              <p className="font-mono text-sm tabular-nums text-foreground">
                {formatCurrency(total.interest)}
              </p>
              <p className="font-mono text-sm tabular-nums text-foreground">
                {formatCurrency(total.total)}
              </p>
            </div>
          </div>
        </div>
      )}
    </CloseStageChrome>
  );
};
