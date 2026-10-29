import { type RefObject } from 'react';

import { formMessageClass } from '@/ui/components/form';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { AssumptionsSection } from '@/ui/features/retirement/components/AssumptionsSection';
import { LifeEventsSection } from '@/ui/features/retirement/components/LifeEventsSection';
import { OpeningNetWorthSection } from '@/ui/features/retirement/components/OpeningNetWorthSection';
import { ProjectionRulesSection } from '@/ui/features/retirement/components/ProjectionRulesSection';
import { WorkspaceNotices } from '@/ui/features/retirement/components/WorkspaceNotices';
import {
  type ProjectionWorkspaceStage,
  type WorkspaceAssumptions,
  type WorkspaceCalc,
  type WorkspaceDerived,
  type WorkspaceEvents,
  type WorkspaceOpening,
  type WorkspaceRules,
  type WorkspaceSaveStatus,
  type WorkspaceUndo,
} from '@/ui/features/retirement/types/workspaceTypes';
import { type SectionStates } from '@/ui/features/retirement/viewmodels/workspaceSectionState.vm';

interface WorkspaceSetupSectionsProps {
  stage: ProjectionWorkspaceStage;
  opening: WorkspaceOpening;
  assumptions: WorkspaceAssumptions;
  rules: WorkspaceRules;
  events: WorkspaceEvents;
  startYear: number;
  setStartYear: (value: string) => void;
  setRetirementAge: (value: string) => void;
  setAssumptionField: WorkspaceAssumptions['setField'];
  derived: WorkspaceDerived;
  undo: WorkspaceUndo;
  calc: WorkspaceCalc;
  save: WorkspaceSaveStatus;
  /** Per-band state, so each blocker is explained where the work happens. */
  sectionState: SectionStates;
  ledgerCodes: Parameters<typeof ProjectionRulesSection>[0]['ledgerCodes'];
  debtAccounts: Parameters<typeof ProjectionRulesSection>[0]['debtAccounts'];
  lifeEventsRef: RefObject<HTMLDivElement | null>;
  revealYear: number | null;
}

/**
 * The setup stage body: the four numbered bands in their fixed order, then the
 * collected errors and the save confirmations. Preview is a separate component
 * (`WorkspacePreview`), so nothing here has to branch on the stage.
 */
export function WorkspaceSetupSections({
  stage,
  opening,
  assumptions,
  rules,
  events,
  startYear,
  setStartYear,
  setRetirementAge,
  setAssumptionField,
  derived,
  undo,
  calc,
  save,
  sectionState,
  ledgerCodes,
  debtAccounts,
  lifeEventsRef,
  revealYear,
}: WorkspaceSetupSectionsProps) {
  const rememberEvents = () => {
    const snapshot = events.snapshot();
    undo.push(() => events.replaceDrafts(snapshot));
  };

  /**
   * A drop settles on `movePhase`: it looks the owner up by phase id, so a drag
   * that leaves a row and comes back still lands, and a same-row drop is just a
   * range edit in place.
   */
  const changeRange = (
    phaseId: string,
    targetEventId: string,
    startYearValue: number,
    endYear: number,
  ) => {
    events.movePhase(phaseId, targetEventId, startYearValue, endYear);
  };

  return (
    <div className="grid">
      <OpeningNetWorthSection
        opening={opening.value}
        stage={stage}
        loading={opening.loading}
        error={opening.error}
        validationError={opening.validationError}
        hasClosedPeriod={opening.hasClosedPeriod}
        hasSnapshot={opening.hasSnapshot}
        startYear={startYear}
        startYearError={opening.startYearError}
        setStartYear={setStartYear}
        setAmount={opening.setOpeningAmount}
        commitAmount={opening.commitOpeningAmount}
        resetToSnapshot={opening.resetToSnapshot}
        retry={opening.reload}
        status={opening.validationError === undefined ? sectionState.baseline?.status : 'error'}
        hint={sectionState.baseline?.hint}
      />

      <AssumptionsSection
        form={assumptions.form}
        errors={assumptions.errors}
        bounds={derived.assumptionBounds}
        birthYearLocked={assumptions.birthYearLocked}
        readOnly={false}
        ageRange={derived.ageRange}
        retirementYear={derived.retirementYear}
        onRetirementAgeChange={setRetirementAge}
        onFieldChange={setAssumptionField}
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
          projectionStartYear={startYear}
          birthYear={derived.birthYear || startYear}
          lifeExpectancy={derived.lifeExpectancy || 1}
          retirementYear={derived.retirementYear}
          revealYear={revealYear}
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
          onRangeChange={changeRange}
          reparent={events.reparentPhase}
          status={sectionState.events?.status}
          hint={sectionState.events?.hint}
        />
      </div>

      {calc.calculated === null && calc.errorLabels.length > 0 && (
        <div className="space-y-1" role="alert" data-testid="projection-errors">
          {calc.errorLabels.map((error, index) => (
            <p key={`${error}-${index}`} className={formMessageClass}>
              {error}
            </p>
          ))}
        </div>
      )}

      {calc.calculateError !== null && (
        <Alert variant="destructive">
          <AlertDescription>{calc.calculateError}</AlertDescription>
        </Alert>
      )}

      <WorkspaceNotices savedAsPlan={save.savedAsPlan} savedId={save.savedId} />
    </div>
  );
}
