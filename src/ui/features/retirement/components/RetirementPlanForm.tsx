import { type ReactNode } from 'react';

import { PageSection } from '@/ui/components/PageSection';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  TextInput,
  formMessageClass,
} from '@/ui/components/form';
import { PLAN_FORM_LABELS } from '@/ui/constants/retirement/planLabels';
import { type LedgerCodeItem } from '@/ui/features/ledger/hooks/useLedgerCodes';
import { AssumptionsSection } from '@/ui/features/retirement/components/AssumptionsSection';
import { LifeEventsSection } from '@/ui/features/retirement/components/LifeEventsSection';
import { ProjectionRulesSection } from '@/ui/features/retirement/components/ProjectionRulesSection';
import { type DebtAccountOption } from '@/ui/features/retirement/hooks/useDebtAccountOptions';
import { type PlanNameForm } from '@/ui/features/retirement/hooks/useSaveNameForm';
import {
  type PlanAssumptionsDraft,
  type PlanEventsDraft,
  type PlanFormPreviewVM,
  type PlanRulesDraft,
} from '@/ui/features/retirement/viewmodels/planForm.vm';
import { type SectionStates } from '@/ui/features/retirement/viewmodels/workspaceSectionState.vm';

/** The controller surface both the create and the edit page provide. */
export interface RetirementPlanFormController {
  form: PlanNameForm;
  assumptions: PlanAssumptionsDraft;
  rules: PlanRulesDraft;
  events: PlanEventsDraft;
  preview: PlanFormPreviewVM;
  undo: { canUndo: boolean; run: () => void };
  sectionState: SectionStates;
  rememberEvents: () => void;
}

interface RetirementPlanFormProps {
  controller: RetirementPlanFormController;
  submitting: boolean;
  /** Managers edit; everyone else reads the same form. */
  readOnly: boolean;
  ledgerCodes: LedgerCodeItem[];
  debtAccounts: DebtAccountOption[];
  /** Header block owned by the page (title, actions, state). */
  header: ReactNode;
}

/**
 * The plan form body shared by create and edit: the three input groups, no
 * opening balance, no start year. Only the page header differs between them.
 */
export function RetirementPlanForm({
  controller,
  submitting,
  readOnly,
  ledgerCodes,
  debtAccounts,
  header,
}: RetirementPlanFormProps) {
  const { form, assumptions, rules, events, preview, undo, sectionState, rememberEvents } =
    controller;
  const { errors } = form.formState;
  const rootMessage = errors.root?.message ?? null;

  return (
    <div className="space-y-6 pb-10">
      {header}

      {rootMessage !== null && (
        <p className={formMessageClass} role="alert">
          {rootMessage}
        </p>
      )}

      <Form {...form}>
        <PageSection
          number={PLAN_FORM_LABELS.DETAILS_NUMBER}
          title={PLAN_FORM_LABELS.DETAILS_SECTION}
          testId="section-plan-details"
        >
          <FormField name="name">
            <FormItem>
              <FormLabel>{PLAN_FORM_LABELS.NAME}</FormLabel>
              <FormControl>
                <TextInput
                  placeholder={PLAN_FORM_LABELS.NAME_PLACEHOLDER}
                  disabled={submitting || readOnly}
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
        bounds={preview.assumptionBounds}
        birthYearLocked={assumptions.birthYearLocked}
        readOnly={readOnly}
        ageRange={preview.ageRange}
        retirementYear={preview.retirementYear}
        onRetirementAgeChange={(value) => assumptions.setField('retirementAge', value)}
        onFieldChange={assumptions.setField}
        status={sectionState.assumptions?.status}
        hint={sectionState.assumptions?.hint}
      />

      <ProjectionRulesSection
        form={rules.form}
        rules={rules.rules}
        errors={rules.errors}
        readOnly={readOnly}
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

      <div id="life-events" className="scroll-mt-6">
        <LifeEventsSection
          form={events.form}
          events={events.events}
          errors={events.errors}
          readOnly={readOnly}
          focusRequest={events.focusRequest}
          projectionStartYear={preview.projectionStartYear}
          birthYear={preview.birthYear || preview.projectionStartYear}
          lifeExpectancy={preview.lifeExpectancy || 1}
          retirementYear={preview.retirementYear}
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
