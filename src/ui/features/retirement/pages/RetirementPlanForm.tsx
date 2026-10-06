import React, { useState } from 'react';

import { useParams } from 'react-router-dom';

import { DangerZone } from '@/ui/components/DangerZone';
import { EmptyState } from '@/ui/components/EmptyState';
import { PageSection } from '@/ui/components/PageSection';
import { Skeleton } from '@/ui/components/Skeleton';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import {
  RETIREMENT_WORKSPACE_TAB_ORDER,
  RetirementWorkspaceLabels,
  RetirementWorkspaceSectionLabels,
  type RetirementWorkspaceTabKey,
  RetirementWorkspaceTabLabels,
} from '@/ui/constants/retirement/retirementWorkspaceLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import AssumptionsForm from '@/ui/features/retirement/components/AssumptionsForm';
import { CurrentFinancialState } from '@/ui/features/retirement/components/detail/CurrentFinancialState';
import { EventTabContent } from '@/ui/features/retirement/components/detail/EventTabContent';
import { ExpenseTabContent } from '@/ui/features/retirement/components/detail/ExpenseTabContent';
import { IncomeTabContent } from '@/ui/features/retirement/components/detail/IncomeTabContent';
import { ProjectionEmptyState } from '@/ui/features/retirement/components/detail/ProjectionEmptyState';
import { RetirementOutcome } from '@/ui/features/retirement/components/detail/RetirementOutcome';
import { RetirementPlanHeader } from '@/ui/features/retirement/components/detail/RetirementPlanHeader';
import { RetirementRisks } from '@/ui/features/retirement/components/detail/RetirementRisks';
import { CashFlowChart } from '@/ui/features/retirement/components/projection/CashFlowChart';
import { NetWorthChart } from '@/ui/features/retirement/components/projection/NetWorthChart';
import { YearlyDetails } from '@/ui/features/retirement/components/projection/YearlyDetails';
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
    error,
    reload,
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

  const [activeTab, setActiveTab] = useState<RetirementWorkspaceTabKey>('overview');

  if (loading) {
    return (
      <div role="status" className="space-y-2 py-2">
        <span className="sr-only">{RetirementWorkspaceLabels.loading}</span>
        {[0, 1, 2, 3, 4].map((row) => (
          <Skeleton key={row} className="h-12" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="warning">
        <AlertDescription>{RetirementWorkspaceLabels.loadError}</AlertDescription>
        <Button variant="text" className="ml-auto shrink-0" onClick={() => void reload()}>
          {RetirementWorkspaceLabels.retryAction}
        </Button>
      </Alert>
    );
  }

  if (!plan || !headerVM || !assumptionsVM) {
    return (
      <EmptyState
        title={RetirementWorkspaceLabels.notFoundTitle}
        description={RetirementWorkspaceLabels.notFound}
      />
    );
  }

  return (
    <div className="space-y-8">
      {staleIncomeSyncBanner && (
        <Alert className="border-warning/40 bg-warning/5">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>
              {RetirementWorkspaceLabels.staleBannerPrefix}
              {staleIncomeSyncBanner.staleCount}
              {RetirementWorkspaceLabels.staleBannerMiddle}
              {staleIncomeSyncBanner.targetSampleYear}
              {RetirementWorkspaceLabels.staleBannerSuffix}
            </span>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleApplyStaleIncomeSync}>
                {RetirementWorkspaceLabels.staleApplyAction}
              </Button>
              <Button size="sm" variant="outline" onClick={handleDismissStaleIncomeSync}>
                {RetirementWorkspaceLabels.staleDismissAction}
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

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as RetirementWorkspaceTabKey)}
        className="space-y-6"
      >
        {/* Scroll container wraps the list so the underline trick (`-mb-px` on
            TabsTrigger) cannot be measured as vertical overflow — the trigger's
            border box stays inside TabsList's border box, so only width scrolls. */}
        <div className="overflow-x-auto">
          <TabsList className="min-w-max" aria-label={RetirementWorkspaceLabels.tabsAriaLabel}>
            {RETIREMENT_WORKSPACE_TAB_ORDER.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {RetirementWorkspaceTabLabels[tab]}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          {projectionVM ? (
            <>
              <PageSection title={RetirementWorkspaceSectionLabels.outcome}>
                <RetirementOutcome projection={projectionVM} />
              </PageSection>
              <PageSection title={RetirementWorkspaceSectionLabels.currentFinancialState}>
                <CurrentFinancialState netWorthSource={netWorthSource} />
              </PageSection>
              <PageSection title={RetirementWorkspaceSectionLabels.netWorth}>
                <NetWorthChart projection={projectionVM} />
              </PageSection>
              <PageSection title={RetirementWorkspaceSectionLabels.risks}>
                <RetirementRisks projection={projectionVM} />
              </PageSection>
            </>
          ) : (
            <ProjectionEmptyState />
          )}
        </TabsContent>

        <TabsContent value="projection" className="space-y-6">
          {projectionVM ? (
            <>
              <PageSection title={RetirementWorkspaceSectionLabels.cashFlow}>
                <CashFlowChart projection={projectionVM} />
              </PageSection>
              <PageSection>
                <YearlyDetails projection={projectionVM} />
              </PageSection>
            </>
          ) : (
            <ProjectionEmptyState />
          )}
        </TabsContent>

        <TabsContent value="planSetup" className="space-y-6">
          <PageSection title={RetirementWorkspaceSectionLabels.assumptions}>
            <AssumptionsForm assumptions={assumptionsVM} onSave={handleUpdatePlan} />
          </PageSection>

          <PageSection title={RetirementWorkspaceSectionLabels.income}>
            <IncomeTabContent
              currentYear={plan.currentYear}
              planInflationRate={plan.inflationRate}
              incomeItems={incomeItems}
              handleAddIncome={handleAddIncome}
              handleUpdateIncome={handleUpdateIncome}
              handleDeleteIncome={handleDeleteIncome}
              handleImportIncomeFromTransactions={handleImportIncomeFromTransactions}
            />
          </PageSection>

          <PageSection title={RetirementWorkspaceSectionLabels.expenses}>
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
          </PageSection>

          <PageSection title={RetirementWorkspaceSectionLabels.events}>
            <EventTabContent
              currentYear={plan.currentYear}
              eventItems={eventItems}
              handleAddEvent={handleAddEvent}
              handleUpdateEvent={handleUpdateEvent}
              handleDeleteEvent={handleDeleteEvent}
            />
          </PageSection>
        </TabsContent>
      </Tabs>

      <DangerZone
        actionLabel={RetirementWorkspaceLabels.deletePlanAction}
        onAction={() => void handleDelete()}
      />
    </div>
  );
};

export default RetirementPlanForm;
