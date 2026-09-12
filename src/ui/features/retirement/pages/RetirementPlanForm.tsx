import React, { useState } from 'react';

import { useParams } from 'react-router-dom';

import { useAuth } from '@/infra/contexts/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import AssumptionsForm from '@/ui/features/retirement/components/AssumptionsForm';
import { EventTabContent } from '@/ui/features/retirement/components/detail/EventTabContent';
import { ExpenseTabContent } from '@/ui/features/retirement/components/detail/ExpenseTabContent';
import { IncomeTabContent } from '@/ui/features/retirement/components/detail/IncomeTabContent';
import { ProjectionResultsContent } from '@/ui/features/retirement/components/detail/ProjectionResultsContent';
import { RetirementPlanHeader } from '@/ui/features/retirement/components/detail/RetirementPlanHeader';
import { useRetirementPlanDetailPage } from '@/ui/features/retirement/hooks/useRetirementPlanDetailPage';

const RetirementPlanForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useAuth();
  const {
    plan,
    headerVM,
    assumptionsVM,
    incomeItems,
    expenseItems,
    eventItems,
    projectionVM,
    loading,
    isEditingName,
    editedName,
    setEditedName,
    setIsEditingName,
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
    handleCancelEditName,
    handleAddIncome,
    handleUpdateIncome,
    handleDeleteIncome,
    handleImportIncomeFromTransactions,
  } = useRetirementPlanDetailPage(id, userProfile?.householdId, userProfile?.email);

  const [activeTab, setActiveTab] = useState('assumptions');

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!plan) {
    return <div className="p-8">Plan not found</div>;
  }

  if (!headerVM) {
    return <div className="p-8">Plan not found</div>;
  }

  if (!assumptionsVM) {
    return <div className="p-8">Plan not found</div>;
  }

  return (
    <div className="space-y-6">
      {staleIncomeSyncBanner && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTitle>收入樣本年度可更新</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>
              {staleIncomeSyncBanner.staleCount} 筆收入資料仍使用舊年度，建議更新至{' '}
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
        isEditingName={isEditingName}
        editedName={editedName}
        setEditedName={setEditedName}
        setIsEditingName={setIsEditingName}
        handleSaveName={handleSaveName}
        handleCancelEditName={handleCancelEditName}
        handleRecalculate={handleRecalculate}
        handleToggleAutoUpdate={handleToggleAutoUpdate}
        handleDelete={handleDelete}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="assumptions" className="space-y-4">
          <AssumptionsForm
            assumptions={assumptionsVM}
            onSave={handleUpdatePlan}
            retirementTransition={plan.retirementTransition}
          />
        </TabsContent>

        <TabsContent value="income" className="space-y-6">
          <IncomeTabContent
            currentYear={plan.currentYear}
            incomeItems={incomeItems}
            handleAddIncome={handleAddIncome}
            handleUpdateIncome={handleUpdateIncome}
            handleDeleteIncome={handleDeleteIncome}
            handleImportIncomeFromTransactions={handleImportIncomeFromTransactions}
            householdId={userProfile?.householdId || ''}
          />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <ExpenseTabContent
            currentYear={plan.currentYear}
            expenseItems={expenseItems}
            incomes={plan.incomes}
            handleAddExpense={handleAddExpense}
            handleUpdateExpense={handleUpdateExpense}
            handleDeleteExpense={handleDeleteExpense}
            handleImportDebtRepayments={handleImportDebtRepayments}
          />
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <EventTabContent
            currentYear={plan.currentYear}
            incomes={plan.incomes}
            eventItems={eventItems}
            handleAddEvent={handleAddEvent}
            handleUpdateEvent={handleUpdateEvent}
            handleDeleteEvent={handleDeleteEvent}
          />
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <ProjectionResultsContent projectionVM={projectionVM} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RetirementPlanForm;
