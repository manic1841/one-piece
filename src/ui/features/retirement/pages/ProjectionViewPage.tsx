import { useState } from 'react';

import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { DangerZone } from '@/ui/components/DangerZone';
import { EmptyState } from '@/ui/components/EmptyState';
import { InlineEditableTitle } from '@/ui/components/InlineEditableTitle';
import { PageHeader } from '@/ui/components/PageHeader';
import { Skeleton } from '@/ui/components/Skeleton';
import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/ui/tabs';
import {
  PROJECTION_VIEW_LABELS,
  RENAME_ERROR_LABELS,
} from '@/ui/constants/retirement/projectionLabels';
import { useAuthState } from '@/ui/contexts/useAuthState';
import { ProjectionOverviewTab } from '@/ui/features/retirement/components/ProjectionOverviewTab';
import { ProjectionSnapshotTab } from '@/ui/features/retirement/components/ProjectionSnapshotTab';
import { ProjectionTrendTab } from '@/ui/features/retirement/components/ProjectionTrendTab';
import { SaveAsPlanDialog } from '@/ui/features/retirement/components/SaveAsPlanDialog';
import { useProjectionView } from '@/ui/features/retirement/hooks/useProjectionView';
import { getTaskErrorMessage } from '@/ui/hooks/getErrorMessage';

type ViewTab = 'overview' | 'projection' | 'settings';

export default function ProjectionViewPage() {
  const { userProfile } = useAuthState();
  const { id } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const {
    view,
    loading,
    error,
    notFound,
    reload,
    rename,
    remove,
    saveAsPlanForm,
    submitSaveAsPlan,
  } = useProjectionView(userProfile?.householdId, id);
  const [saveAsPlanOpen, setSaveAsPlanOpen] = useState(false);
  const [tab, setTab] = useState<ViewTab>('overview');
  // Selection is owned by the page: switching tabs keeps it, missing years reset it.
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const selectedRowExists =
    view !== null &&
    selectedYear !== null &&
    view.projection.yearlyDetails.some((row) => row.year === selectedYear);
  const activeYear = selectedRowExists ? selectedYear : null;

  const openSaveAsPlan = () => {
    saveAsPlanForm.reset({ name: view?.name ?? '' });
    setSaveAsPlanOpen(true);
  };

  const handleSaveAsPlanSuccess = () => {
    setSaveAsPlanOpen(false);
    toast.success(PROJECTION_VIEW_LABELS.PLAN_SAVED);
  };

  const handleRename = async (name: string) => {
    const task = await rename(name);
    if (!task.ok) {
      toast.error(getTaskErrorMessage(task));
      return;
    }
    if (task.value.ok) return;

    toast.error(
      RENAME_ERROR_LABELS[task.value.code as keyof typeof RENAME_ERROR_LABELS] ??
        RENAME_ERROR_LABELS.WRITE_FAILED,
    );
  };

  const handleDelete = async () => {
    if (view === null) return;
    const confirmed = await confirm({
      title: PROJECTION_VIEW_LABELS.DELETE_TITLE,
      context: `${view.name} · ${view.periodText}`,
      consequence: PROJECTION_VIEW_LABELS.DELETE_CONSEQUENCE,
      confirmLabel: PROJECTION_VIEW_LABELS.DANGER_DELETE,
    });
    if (!confirmed) return;

    try {
      const task = await remove();
      if (!task.ok) {
        toast.error(getTaskErrorMessage(task));
        return;
      }
      navigate('/retirement');
    } catch {
      // `run` reports failures instead of throwing; keep a guard for the
      // navigation itself.
      toast.error(PROJECTION_VIEW_LABELS.DELETE_FAILED);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        crumb={PROJECTION_VIEW_LABELS.CRUMB}
        onBack={() => navigate('/retirement')}
        title={
          view === null ? (
            PROJECTION_VIEW_LABELS.LOADING
          ) : (
            <InlineEditableTitle value={view.name} onSave={handleRename} />
          )
        }
        meta={
          view === null ? undefined : (
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {view.createdAtText} · {view.periodText}
            </p>
          )
        }
        actions={
          view === null ? undefined : (
            <Button variant="outline" size="sm" onClick={openSaveAsPlan}>
              {PROJECTION_VIEW_LABELS.SAVE_AS_PLAN}
            </Button>
          )
        }
      />

      {loading && (
        <div role="status" className="space-y-3 py-2">
          <span className="sr-only">{PROJECTION_VIEW_LABELS.LOADING}</span>
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-12" />
          <Skeleton className="h-64" />
        </div>
      )}

      {!loading && error !== null && (
        <Alert variant="warning">
          <AlertDescription>{PROJECTION_VIEW_LABELS.LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={() => void reload()}>
            {PROJECTION_VIEW_LABELS.RETRY}
          </Button>
        </Alert>
      )}

      {!loading && error === null && notFound && (
        <EmptyState
          title={PROJECTION_VIEW_LABELS.NOT_FOUND_TITLE}
          description={PROJECTION_VIEW_LABELS.NOT_FOUND_DESCRIPTION}
          action={
            <Button onClick={() => navigate('/retirement')}>
              {PROJECTION_VIEW_LABELS.BACK_TO_LIST}
            </Button>
          }
        />
      )}

      {!loading && error === null && view !== null && (
        <>
          {view.isStale && (
            <Alert variant="warning" data-testid="stale-engine-warning">
              <AlertDescription className="flex flex-wrap items-center gap-3">
                <span>{PROJECTION_VIEW_LABELS.STALE_WARNING}</span>
                <Button asChild variant="text" className="ml-auto shrink-0">
                  <Link to={`/retirement/new?from=${view.id}`}>
                    {PROJECTION_VIEW_LABELS.RECALCULATE}
                  </Link>
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={tab} onValueChange={(next) => setTab(next as ViewTab)}>
            <TabsList aria-label={PROJECTION_VIEW_LABELS.TABS_LABEL} className="overflow-x-auto">
              <TabsTrigger value="overview">{PROJECTION_VIEW_LABELS.TAB_OVERVIEW}</TabsTrigger>
              <TabsTrigger value="projection">{PROJECTION_VIEW_LABELS.TAB_PROJECTION}</TabsTrigger>
              <TabsTrigger value="settings">{PROJECTION_VIEW_LABELS.TAB_SETTINGS}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <ProjectionOverviewTab
                view={view}
                onSelectYear={(year) => {
                  setSelectedYear(year);
                  setTab('projection');
                }}
              />
            </TabsContent>
            <TabsContent value="projection">
              <ProjectionTrendTab
                view={view}
                selectedYear={activeYear}
                onSelectYear={setSelectedYear}
              />
            </TabsContent>
            <TabsContent value="settings">
              <ProjectionSnapshotTab view={view} />
            </TabsContent>
          </Tabs>

          <DangerZone
            actionLabel={PROJECTION_VIEW_LABELS.DANGER_DELETE}
            onAction={() => void handleDelete()}
          />
        </>
      )}

      {saveAsPlanOpen && view !== null && (
        <SaveAsPlanDialog
          form={saveAsPlanForm}
          submit={() => submitSaveAsPlan(handleSaveAsPlanSuccess)}
          onCancel={() => setSaveAsPlanOpen(false)}
        />
      )}
    </div>
  );
}
