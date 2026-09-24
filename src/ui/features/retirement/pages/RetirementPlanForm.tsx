import React, { useState } from 'react';

import { Trash2 } from 'lucide-react';

import { useParams } from 'react-router-dom';

import { useAuthState } from '@/ui/contexts/useAuthState';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/ui/components/ui/accordion';
import { Button } from '@/ui/components/ui/button';
import { RetirementWorkspaceSectionLabels } from '@/ui/constants/retirement/retirementWorkspaceLabels';
import AssumptionsForm from '@/ui/features/retirement/components/AssumptionsForm';
import { CurrentFinancialState } from '@/ui/features/retirement/components/detail/CurrentFinancialState';
import { EventTabContent } from '@/ui/features/retirement/components/detail/EventTabContent';
import { ExpenseTabContent } from '@/ui/features/retirement/components/detail/ExpenseTabContent';
import { IncomeTabContent } from '@/ui/features/retirement/components/detail/IncomeTabContent';
import { ProjectionResultsContent } from '@/ui/features/retirement/components/detail/ProjectionResultsContent';
import { RetirementPlanHeader } from '@/ui/features/retirement/components/detail/RetirementPlanHeader';
import { useRetirementPlanDetailPage } from '@/ui/features/retirement/hooks/useRetirementPlanDetailPage';

const RetirementPlanForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useAuthState();
  const {
    plan,
    headerVM,
    assumptionsVM,
    incomeItems,
    expenseItems,
    eventItems,
    projectionVM,
    netWorthSource,
    loading,
    staleIncomeSyncBanner,
    handleApplyStaleIncomeSync,
    handleDismissStaleIncomeSync,
    handleUpdatePlan,
    handleToggleAutoUpdate,
    handleRecalculate,
    handleAddExpense,
    handleUpdateExpense,
    handleDeleteExpense,
    handleImportDebtRepayments,
    handleAddEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleDelete,
    handleSaveName,
    handleAddIncome,
    handleUpdateIncome,
    handleDeleteIncome,
    handleImportIncomeFromTransactions,
    handleImportExpensesFromLedger,
  } = useRetirementPlanDetailPage(id, userProfile?.householdId, userProfile?.email);

  const [expandedSections, setExpandedSections] = useState<string[]>(['overview']);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!plan || !headerVM || !assumptionsVM) {
    return <div className="p-8">Plan not found</div>;
  }

  return (
    <div className="space-y-6">
      {staleIncomeSyncBanner && (
        <Alert className="border-warning/40 bg-warning/5">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>
              收入樣本年度可更新：{staleIncomeSyncBanner.staleCount} 筆收入資料仍使用舊年度，建議更新至{' '}
              {staleIncomeSyncBanner.targetSampleYear} 年。
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleApplyStaleIncomeSync}>
                更新
              </Button>
              <Button size="sm" variant="outline" onClick={handleDismissStaleIncomeSync}>
                稍後
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <RetirementPlanHeader
        header={headerVM}
        handleSaveName={handleSaveName}
        handleRecalculate={handleRecalculate}
        handleToggleAutoUpdate={handleToggleAutoUpdate}
      />

      <Accordion
        type="multiple"
        value={expandedSections}
        onValueChange={setExpandedSections}
        className="w-full"
      >
        <AccordionItem value="overview">
          <AccordionTrigger>{RetirementWorkspaceSectionLabels.overview}</AccordionTrigger>
          <AccordionContent>
            <ProjectionResultsContent projectionVM={projectionVM} section="overview" />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="currentFinancialState">
          <AccordionTrigger>
            {RetirementWorkspaceSectionLabels.currentFinancialState}
          </AccordionTrigger>
          <AccordionContent>
            <CurrentFinancialState netWorthSource={netWorthSource} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="netWorth">
          <AccordionTrigger>{RetirementWorkspaceSectionLabels.netWorth}</AccordionTrigger>
          <AccordionContent>
            <ProjectionResultsContent projectionVM={projectionVM} section="netWorth" />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="cashFlow">
          <AccordionTrigger>{RetirementWorkspaceSectionLabels.cashFlow}</AccordionTrigger>
          <AccordionContent>
            <ProjectionResultsContent projectionVM={projectionVM} section="cashFlow" />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="assumptions">
          <AccordionTrigger>{RetirementWorkspaceSectionLabels.assumptions}</AccordionTrigger>
          <AccordionContent>
            <AssumptionsForm assumptions={assumptionsVM} onSave={handleUpdatePlan} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="income">
          <AccordionTrigger>{RetirementWorkspaceSectionLabels.income}</AccordionTrigger>
          <AccordionContent>
            <IncomeTabContent
              currentYear={plan.currentYear}
              planInflationRate={plan.inflationRate}
              incomeItems={incomeItems}
              handleAddIncome={handleAddIncome}
              handleUpdateIncome={handleUpdateIncome}
              handleDeleteIncome={handleDeleteIncome}
              handleImportIncomeFromTransactions={handleImportIncomeFromTransactions}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="expenses">
          <AccordionTrigger>{RetirementWorkspaceSectionLabels.expenses}</AccordionTrigger>
          <AccordionContent>
            <ExpenseTabContent
              currentYear={plan.currentYear}
              planInflationRate={plan.inflationRate}
              expenseItems={expenseItems}
              handleAddExpense={handleAddExpense}
              handleUpdateExpense={handleUpdateExpense}
              handleDeleteExpense={handleDeleteExpense}
              handleImportDebtRepayments={handleImportDebtRepayments}
              handleImportFromLedger={handleImportExpensesFromLedger}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="events">
          <AccordionTrigger>{RetirementWorkspaceSectionLabels.events}</AccordionTrigger>
          <AccordionContent>
            <EventTabContent
              currentYear={plan.currentYear}
              eventItems={eventItems}
              handleAddEvent={handleAddEvent}
              handleUpdateEvent={handleUpdateEvent}
              handleDeleteEvent={handleDeleteEvent}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <section className="space-y-3 border-t border-border pt-6">
        <p className="font-mono text-[11px] tracking-widest text-muted-foreground uppercase">
          DANGER ZONE
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => void handleDelete()}
        >
          <Trash2 size={14} />
          Delete plan
        </Button>
      </section>    </div>
  );
};

export default RetirementPlanForm;
