import { type ReactNode } from 'react';

import { ArrowLeft } from 'lucide-react';

import { EmptyState } from '@/ui/components/EmptyState';
import { Skeleton } from '@/ui/components/Skeleton';
import { Alert, AlertDescription } from '@/ui/components/ui/alert';
import { Button } from '@/ui/components/ui/button';

const SKELETON_ROWS = [0, 1, 2];

export interface PlanLoadStateLabels {
  LOADING: string;
  LOAD_ERROR: string;
  RETRY_ACTION: string;
  BACK_LABEL: string;
  NOT_FOUND_TITLE: string;
  NOT_FOUND_DESCRIPTION: string;
  NOT_FOUND_ACTION: string;
}

interface PlanLoadStatesProps {
  loading: boolean;
  errorMessage: string | null;
  notFound: boolean;
  reload: () => void;
  /** Back one level: used by the load-error branch. */
  onBack: () => void;
  /** The list. Defaults to `onBack`; a not-found page must not go back to itself. */
  onNotFoundBack?: () => void;
  labels: PlanLoadStateLabels;
  /** Rendered once the plan exists. */
  children: ReactNode;
}

/**
 * The three non-content states every plan page shares: loading skeleton, load
 * error with retry, and not found. The page owns only what happens on success.
 */
export function PlanLoadStates({
  loading,
  errorMessage,
  notFound,
  reload,
  onBack,
  onNotFoundBack = onBack,
  labels,
  children,
}: PlanLoadStatesProps) {
  if (loading) {
    return (
      <div role="status" className="space-y-6 pb-20">
        <span className="sr-only">{labels.LOADING}</span>
        {SKELETON_ROWS.map((row) => (
          <Skeleton key={row} className="h-16" />
        ))}
      </div>
    );
  }

  if (errorMessage !== null) {
    return (
      <div className="space-y-6 pb-20">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft size={16} aria-hidden="true" />
          {labels.BACK_LABEL}
        </Button>
        <Alert variant="warning">
          <AlertDescription>{labels.LOAD_ERROR}</AlertDescription>
          <Button variant="text" className="ml-auto shrink-0" onClick={reload}>
            {labels.RETRY_ACTION}
          </Button>
        </Alert>
      </div>
    );
  }

  if (notFound) {
    return (
      <EmptyState
        title={labels.NOT_FOUND_TITLE}
        description={labels.NOT_FOUND_DESCRIPTION}
        action={
          <Button variant="outline" onClick={onNotFoundBack}>
            {labels.NOT_FOUND_ACTION}
          </Button>
        }
      />
    );
  }

  return <>{children}</>;
}
