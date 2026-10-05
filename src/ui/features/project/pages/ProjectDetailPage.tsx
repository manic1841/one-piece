import { ArrowRight, Power } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { InlineEditableTitle } from '@/ui/components/InlineEditableTitle';
import { PageHeader } from '@/ui/components/PageHeader';
import { Skeleton } from '@/ui/components/Skeleton';
import { StatusGlyph } from '@/ui/components/StatusGlyph';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';
import { PROJECT_DETAIL_LABELS } from '@/ui/constants/project/projectDetailLabels';
import ProjectDetail from '@/ui/features/project/components/ProjectDetail';
import { useProjectDetailPage } from '@/ui/features/project/hooks/useProjectDetailPage';
import { type Project } from '@/ui/features/project/viewmodels/projectForm.vm';

interface ProjectDetailPageProps {
  project?: Project;
}

const SKELETON_ROWS = [0, 1, 2];

export default function ProjectDetailPage({ project }: ProjectDetailPageProps) {
  const navigate = useNavigate();
  const {
    activeProject,
    projectDebt,
    isActive,
    monthGroups,
    summary,
    loading,
    error,
    notFound,
    reload,
    handleRename,
    handleToggleActive,
    handleDelete,
  } = useProjectDetailPage({ project });

  const backToList = () => navigate('/projects');

  if (loading) {
    return (
      <div role="status" className="space-y-6 pb-20">
        <span className="sr-only">{PROJECT_DETAIL_LABELS.LOADING_LABEL}</span>
        {SKELETON_ROWS.map((row) => (
          <Skeleton key={row} className="h-16" />
        ))}
      </div>
    );
  }

  if (notFound || !activeProject) {
    return (
      <EmptyState
        title={PROJECT_DETAIL_LABELS.NOT_FOUND_TITLE}
        description={PROJECT_DETAIL_LABELS.NOT_FOUND_DESCRIPTION}
        action={
          <Button variant="outline" onClick={backToList}>
            {PROJECT_DETAIL_LABELS.NOT_FOUND_ACTION}
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <PageHeader
        title={<InlineEditableTitle value={activeProject.name} onSave={handleRename} />}
        crumb={PROJECT_DETAIL_LABELS.CRUMB}
        onBack={backToList}
        badge={!isActive ? <StatusGlyph type="inactive" /> : undefined}
        actions={
          isActive ? (
            <Button variant="destructive" onClick={() => void handleToggleActive()}>
              <Power size={16} />
              {PROJECT_DETAIL_LABELS.DEACTIVATE_ACTION}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void handleToggleActive()}>
              {PROJECT_DETAIL_LABELS.ACTIVATE_ACTION}
            </Button>
          )
        }
      />

      {error && (
        <Alert variant="warning">
          <AlertDescription>{error}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={() => void reload()}>
            {PROJECT_DETAIL_LABELS.RETRY_ACTION}
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </Alert>
      )}

      <ProjectDetail
        summary={summary}
        projectDebt={projectDebt}
        monthGroups={monthGroups}
        onDelete={() => void handleDelete()}
      />
    </div>
  );
}
