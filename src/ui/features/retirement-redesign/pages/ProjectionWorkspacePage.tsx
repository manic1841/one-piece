import { PageHeader } from '@/ui/components/PageHeader';
import { PageSection } from '@/ui/components/PageSection';
import { Button } from '@/ui/components/ui/button';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement-redesign/workspaceLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { OpeningNetWorthSection } from '@/ui/features/retirement-redesign/components/OpeningNetWorthSection';
import { WorkspaceSteps } from '@/ui/features/retirement-redesign/components/WorkspaceSteps';
import { useProjectionWorkspace } from '@/ui/features/retirement-redesign/hooks/useProjectionWorkspace';

const PLACEHOLDER_GROUPS = [
  {
    title: PROJECTION_WORKSPACE_LABELS.ASSUMPTIONS_SECTION,
    copy: PROJECTION_WORKSPACE_LABELS.ASSUMPTIONS_PLACEHOLDER,
  },
  {
    title: PROJECTION_WORKSPACE_LABELS.RULES_SECTION,
    copy: PROJECTION_WORKSPACE_LABELS.RULES_PLACEHOLDER,
  },
  {
    title: PROJECTION_WORKSPACE_LABELS.EVENTS_SECTION,
    copy: PROJECTION_WORKSPACE_LABELS.EVENTS_PLACEHOLDER,
  },
] as const;

/**
 * `/retirement/new` projection workspace shell. Both stages share this route
 * and one in-memory draft; only the stage flag decides editability.
 */
export default function ProjectionWorkspacePage() {
  const { userProfile } = useAuthState();
  const workspace = useProjectionWorkspace(userProfile?.householdId);
  const isPreview = workspace.stage === 'preview';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={PROJECTION_WORKSPACE_LABELS.TITLE}
        description={PROJECTION_WORKSPACE_LABELS.DESCRIPTION}
        actions={
          <>
            <Button variant="outline" size="sm" disabled>
              {PROJECTION_WORKSPACE_LABELS.APPLY_PLAN}
            </Button>
            <Button variant="outline" size="sm" disabled>
              {PROJECTION_WORKSPACE_LABELS.SAVE_AS_PLAN}
            </Button>
          </>
        }
      />

      <WorkspaceSteps stage={workspace.stage} />

      <div className="space-y-2">
        <OpeningNetWorthSection
          opening={workspace.opening}
          stage={workspace.stage}
          loading={workspace.openingLoading}
          error={workspace.openingError}
          hasClosedPeriod={workspace.hasClosedPeriod}
          canUseReportValue={workspace.canUseReportValue}
          setAmount={workspace.setOpeningAmount}
          enterManual={workspace.enterManual}
          useManualValue={workspace.useManualValue}
          useReportValue={workspace.useReportValue}
          retry={workspace.retryOpening}
        />

        {PLACEHOLDER_GROUPS.map((group, index) => (
          <PageSection
            key={group.title}
            number={`0${index + 1}`}
            title={group.title}
            spacing="compact"
          >
            <p className="text-sm text-muted-foreground">{group.copy}</p>
          </PageSection>
        ))}
      </div>

      {isPreview && (
        <p className="text-sm text-muted-foreground">
          {PROJECTION_WORKSPACE_LABELS.PREVIEW_READONLY_NOTE}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {isPreview ? (
          <>
            <Button variant="outline" onClick={workspace.backToSetup}>
              {PROJECTION_WORKSPACE_LABELS.BACK_TO_SETUP}
            </Button>
            <Button disabled>{PROJECTION_WORKSPACE_LABELS.SAVE}</Button>
          </>
        ) : (
          <Button onClick={workspace.goToPreview}>{PROJECTION_WORKSPACE_LABELS.PREVIEW}</Button>
        )}
      </div>
    </div>
  );
}
