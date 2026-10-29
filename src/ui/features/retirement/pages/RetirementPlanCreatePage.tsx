import { useRef } from 'react';

import { useNavigate } from 'react-router-dom';

import { PageHeader } from '@/ui/components/PageHeader';
import { PageSection } from '@/ui/components/PageSection';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  TextInput,
} from '@/ui/components/form';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { PLAN_CREATE_LABELS } from '@/ui/constants/retirement/planCreateLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { useLedgerCodes } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { AssumptionsSection } from '@/ui/features/retirement/components/AssumptionsSection';
import { LifeEventsSection } from '@/ui/features/retirement/components/LifeEventsSection';
import { ProjectionRulesSection } from '@/ui/features/retirement/components/ProjectionRulesSection';
import { useDebtAccountOptions } from '@/ui/features/retirement/hooks/useDebtAccountOptions';
import { useRetirementPlanCreate } from '@/ui/features/retirement/hooks/useRetirementPlanCreate';

/**
 * `/retirement/plans/new`, the plan form. A plan is a template, so it has the
 * three input groups and a name but no opening balance, start year or preview:
 * nothing here is calculated. Starting from a plan already in the workspace
 * stays the faster route; this page is for authoring one directly.
 */
export default function RetirementPlanCreatePage() {
  const navigate = useNavigate();
  const { userProfile } = useAuthState();
  const householdId = userProfile?.householdId;
  const { form, submit, assumptions, rules, events, derived, undo, sectionState, rememberEvents } =
    useRetirementPlanCreate(householdId);
  const { codes: ledgerCodes } = useLedgerCodes();
  const { accounts: debtAccounts } = useDebtAccountOptions(householdId);
  const lifeEventsRef = useRef<HTMLDivElement>(null);
  const { errors, isSubmitting } = form.formState;
  const rootMessage = errors.root?.message ?? null;

  const backToList = () => void navigate('/retirement/plans');

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        crumb={PLAN_CREATE_LABELS.CRUMB}
        onBack={backToList}
        backLabel={PLAN_CREATE_LABELS.BACK_TO_LIST}
        title={PLAN_CREATE_LABELS.TITLE}
        description={PLAN_CREATE_LABELS.DESCRIPTION}
        actions={
          <Button onClick={() => void submit()} disabled={isSubmitting}>
            {isSubmitting ? PLAN_CREATE_LABELS.CREATING : PLAN_CREATE_LABELS.CREATE}
          </Button>
        }
      />

      {rootMessage !== null && (
        <Alert variant="warning">
          <AlertDescription>{rootMessage}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <PageSection
          number={PLAN_CREATE_LABELS.DETAILS_NUMBER}
          title={PLAN_CREATE_LABELS.DETAILS_SECTION}
          testId="section-plan-details"
        >
          <FormField name="name">
            <FormItem>
              <FormLabel>{PLAN_CREATE_LABELS.NAME}</FormLabel>
              <FormControl>
                <TextInput
                  placeholder={PLAN_CREATE_LABELS.NAME_PLACEHOLDER}
                  disabled={isSubmitting}
                  onChange={() => form.clearErrors('root')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>
        </PageSection>
      </Form>

      <AssumptionsSection
        form={assumptions.form}
        errors={assumptions.errors}
        bounds={derived.assumptionBounds}
        birthYearLocked={assumptions.birthYearLocked}
        readOnly={false}
        ageRange={derived.ageRange}
        retirementYear={derived.retirementYear}
        onRetirementAgeChange={(value) => assumptions.setField('retirementAge', value)}
        onFieldChange={assumptions.setField}
        status={sectionState.assumptions?.status}
        hint={sectionState.assumptions?.hint}
      />

      <ProjectionRulesSection
        form={rules.form}
        rules={rules.rules}
        errors={rules.errors}
        readOnly={false}
        ledgerCodes={ledgerCodes}
        debtAccounts={debtAccounts}
        add={rules.add}
        remove={rules.remove}
        replace={rules.replace}
        toggle={rules.toggle}
        update={rules.update}
        setRuleType={rules.setRuleType}
        setMethod={rules.setMethod}
        setSourceType={rules.setSourceType}
        status={sectionState.rules?.status}
        hint={sectionState.rules?.hint}
      />

      <div id="life-events" ref={lifeEventsRef} className="scroll-mt-6">
        <LifeEventsSection
          form={events.form}
          events={events.events}
          errors={events.errors}
          readOnly={false}
          focusRequest={events.focusRequest}
          projectionStartYear={derived.projectionStartYear}
          birthYear={derived.birthYear || derived.projectionStartYear}
          lifeExpectancy={derived.lifeExpectancy || 1}
          retirementYear={derived.retirementYear}
          revealYear={null}
          canUndo={undo.canUndo}
          onUndo={undo.run}
          remove={events.remove}
          toggle={events.toggle}
          update={events.update}
          setType={events.setType}
          addPhase={events.addPhase}
          addPhaseAt={events.addPhaseAt}
          addEventWithPhase={events.addEventWithPhase}
          removePhase={events.removePhase}
          updatePhase={events.updatePhase}
          onGestureStart={rememberEvents}
          onRangeChange={events.movePhase}
          reparent={events.reparentPhase}
          status={sectionState.events?.status}
          hint={sectionState.events?.hint}
        />
      </div>
    </div>
  );
}
