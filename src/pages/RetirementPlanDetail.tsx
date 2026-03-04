import React from 'react';

import { useParams } from 'react-router-dom';

import AssumptionsForm from '@/components/retirement/AssumptionsForm';
import { EventTabContent } from '@/components/retirement/detail/EventTabContent';
import { ExpenseTabContent } from '@/components/retirement/detail/ExpenseTabContent';
import { IncomeTabContent } from '@/components/retirement/detail/IncomeTabContent';
import { ProjectionResultsContent } from '@/components/retirement/detail/ProjectionResultsContent';
import { RetirementPlanHeader } from '@/components/retirement/detail/RetirementPlanHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/useAuth';
import { useRetirementPlanDetailPage } from '@/hooks/pages/useRetirementPlanDetailPage';

const RetirementPlanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { userProfile } = useAuth();
  const {
    plan,
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

  return (
    <div className="space-y-6">
      <RetirementPlanHeader
        plan={plan}
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
          <AssumptionsForm plan={plan} onSave={handleUpdatePlan} />
        </TabsContent>

        <TabsContent value="income" className="space-y-6">
          <IncomeTabContent
            plan={plan}
            handleAddIncome={handleAddIncome}
            handleUpdateIncome={handleUpdateIncome}
            handleDeleteIncome={handleDeleteIncome}
          />
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <ExpenseTabContent
            plan={plan}
            handleAddExpense={handleAddExpense}
            handleUpdateExpense={handleUpdateExpense}
            handleDeleteExpense={handleDeleteExpense}
          />
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <EventTabContent
            plan={plan}
            handleAddEvent={handleAddEvent}
            handleUpdateEvent={handleUpdateEvent}
            handleDeleteEvent={handleDeleteEvent}
          />
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <ProjectionResultsContent plan={plan} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RetirementPlanDetail;
