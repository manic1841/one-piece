import { Link } from 'react-router-dom';

import { EmptyState } from '@/ui/components/EmptyState';
import { Button } from '@/ui/components/ui/button';
import { RetirementWorkspaceLabels } from '@/ui/constants/retirement/retirementWorkspaceLabels';

/** 尚無投影結果時的空狀態：單一說明 + 前往每月關帳。 */
export const ProjectionEmptyState: React.FC = () => (
  <EmptyState
    title={RetirementWorkspaceLabels.projectionEmptyTitle}
    description={RetirementWorkspaceLabels.projectionEmptyDescription}
    action={
      <Button asChild size="sm" variant="outline">
        <Link to="/close">{RetirementWorkspaceLabels.goToClose}</Link>
      </Button>
    }
  />
);
