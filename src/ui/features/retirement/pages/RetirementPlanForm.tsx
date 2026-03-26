import React from 'react';

import { useParams } from 'react-router-dom';

import { useAuth } from '@/infra/contexts/useAuth';
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
    handleUpdatePlan,
    handleToggleAutoUpdate,
    handleRecalculate,
    handleAddExpense,
    handleUpdateExpense,
    handleDeleteExpense,
    handleImportFromProjects,
    handleAddEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleDelete,
    handleSaveName,
    handleCancelEditName,
    handleAddIncome,
    handleUpdateIncome,
    handleDeleteIncome,
  } = useRetirementPlanDetailPage(id, userProfile?.householdId, userProfile?.email);

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

      <Tabs defaultValue="assumptions" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="assumptions">Assumptions</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
        </TabsList>

        <TabsContent value="assumptions" className="space-y-4">
          <AssumptionsForm assumptions={assumptionsVM} onSave={handleUpdatePlan} />
        </TabsContent>

        <TabsContent value="income" className="space-y-6">
          <IncomeTabContent
            currentYear={plan.currentYear}
            incomeItems={incomeItems}
            handleAddIncome={handleAddIncome}
            handleUpdateIncome={handleUpdateIncome}
            handleDeleteIncome={handleDeleteIncome}
          />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <ExpenseTabContent
            currentYear={plan.currentYear}
            expenseItems={expenseItems}
            handleAddExpense={handleAddExpense}
            handleUpdateExpense={handleUpdateExpense}
            handleDeleteExpense={handleDeleteExpense}
            handleImportFromProjects={handleImportFromProjects}
          />
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <EventTabContent
            currentYear={plan.currentYear}
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
