import React from 'react';

import { NumberInput, parseOptionalAmount } from '@/ui/components/data-table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/ui/components/ui/accordion';
import { Label } from '@/ui/components/ui/label';
import { MONTHLY_CLOSE_LABELS } from '@/ui/constants/monthlyClose';
import { formatCurrency, formatPercentage } from '@/ui/utils';
import { cn } from '@/ui/utils/cn';

import type { PortfolioCashFlowSectionVM } from '../viewmodels/portfolioCashFlow.vm';

interface CashFlowInputsProps {
  section: PortfolioCashFlowSectionVM;
  disabled: boolean;
  onDepositsChange: (value: number) => void;
  onWithdrawalsChange: (value: number) => void;
}

const CashFlowInputs: React.FC<CashFlowInputsProps> = ({
  section,
  disabled,
  onDepositsChange,
  onWithdrawalsChange,
}) => (
  <div className="grid grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {MONTHLY_CLOSE_LABELS.CASH_IN}
      </Label>
      <NumberInput
        disabled={disabled}
        placeholder="0"
        aria-label={`${MONTHLY_CLOSE_LABELS.CASH_IN} ${section.portfolioName}`}
        value={section.deposits?.toString() ?? ''}
        onChange={(event) => onDepositsChange(parseOptionalAmount(event.target.value) ?? 0)}
      />
    </div>
    <div className="space-y-2">
      <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {MONTHLY_CLOSE_LABELS.CASH_OUT}
      </Label>
      <NumberInput
        disabled={disabled}
        placeholder="0"
        aria-label={`${MONTHLY_CLOSE_LABELS.CASH_OUT} ${section.portfolioName}`}
        value={section.withdrawals?.toString() ?? ''}
        onChange={(event) => onWithdrawalsChange(parseOptionalAmount(event.target.value) ?? 0)}
      />
    </div>
  </div>
);

interface BalanceFieldsProps {
  section: PortfolioCashFlowSectionVM;
}

const BalanceFields: React.FC<BalanceFieldsProps> = ({ section }) => (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {MONTHLY_CLOSE_LABELS.SECURITIES_BALANCE}
      </p>
      <p className="font-mono text-sm tabular-nums text-foreground">
        {section.securitiesBalance === null ? '—' : formatCurrency(section.securitiesBalance)}
      </p>
    </div>
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {MONTHLY_CLOSE_LABELS.BANK_BALANCE}
      </p>
      <p className="font-mono text-sm tabular-nums text-foreground">
        {section.bankBalance === null ? '—' : formatCurrency(section.bankBalance)}
      </p>
    </div>
  </div>
);

interface ReturnFieldsProps {
  section: PortfolioCashFlowSectionVM;
}

const ReturnFields: React.FC<ReturnFieldsProps> = ({ section }) => (
  <div className="grid grid-cols-2 gap-4">
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {MONTHLY_CLOSE_LABELS.RETURN}
      </p>
      <p
        className={cn(
          'font-mono text-sm tabular-nums',
          section.gain > 0
            ? 'text-positive'
            : section.gain < 0
              ? 'text-negative'
              : 'text-foreground',
        )}
      >
        {formatCurrency(section.gain)}
      </p>
    </div>
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {MONTHLY_CLOSE_LABELS.RETURN_RATE}
      </p>
      <p
        className={cn(
          'font-mono text-sm tabular-nums',
          section.returnRate > 0
            ? 'text-positive'
            : section.returnRate < 0
              ? 'text-negative'
              : 'text-foreground',
        )}
      >
        {formatPercentage(section.returnRate, 2)}
      </p>
    </div>
  </div>
);

interface PortfolioCashFlowSectionProps {
  section: PortfolioCashFlowSectionVM;
  disabled: boolean;
  onDepositsChange: (portfolioId: string, value: number) => void;
  onWithdrawalsChange: (portfolioId: string, value: number) => void;
}

export const PortfolioCashFlowSection: React.FC<PortfolioCashFlowSectionProps> = ({
  section,
  disabled,
  onDepositsChange,
  onWithdrawalsChange,
}) => (
  <div className="space-y-5">
    <BalanceFields section={section} />
    <CashFlowInputs
      section={section}
      disabled={disabled}
      onDepositsChange={(value) => onDepositsChange(section.portfolioId, value)}
      onWithdrawalsChange={(value) => onWithdrawalsChange(section.portfolioId, value)}
    />
    <ReturnFields section={section} />
  </div>
);

interface PortfolioCashFlowAccordionProps {
  sections: PortfolioCashFlowSectionVM[];
  disabled: boolean;
  onDepositsChange: (portfolioId: string, value: number) => void;
  onWithdrawalsChange: (portfolioId: string, value: number) => void;
}

export const PortfolioCashFlowAccordion: React.FC<PortfolioCashFlowAccordionProps> = ({
  sections,
  disabled,
  onDepositsChange,
  onWithdrawalsChange,
}) => (
  <Accordion type="single" collapsible defaultValue={sections[0]?.portfolioId}>
    {sections.map((section) => (
      <AccordionItem key={section.portfolioId} value={section.portfolioId}>
        <AccordionTrigger>{section.portfolioName}</AccordionTrigger>
        <AccordionContent>
          <PortfolioCashFlowSection
            section={section}
            disabled={disabled}
            onDepositsChange={onDepositsChange}
            onWithdrawalsChange={onWithdrawalsChange}
          />
        </AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
);
