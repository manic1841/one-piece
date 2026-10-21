import { useEffect, useRef } from 'react';

import { useBlocker } from 'react-router-dom';

import { useConfirm } from '@/ui/components/confirm/useConfirm';
import { PROJECTION_WORKSPACE_LABELS } from '@/ui/constants/retirement/workspaceLabels';

/**
 * Blocks both ways out of a dirty workspace: in-app navigation asks through
 * `useConfirm`, a refresh or tab close uses the browser dialog (which has no
 * confirm UI of ours).
 */
export function useWorkspaceLeaveGuard(dirty: boolean) {
  const { confirm } = useConfirm();
  const promptingRef = useRef(false);

  const blocker = useBlocker(dirty);

  useEffect(() => {
    if (blocker.state !== 'blocked' || promptingRef.current) return;
    promptingRef.current = true;

    void confirm({
      title: PROJECTION_WORKSPACE_LABELS.LEAVE_TITLE,
      context: PROJECTION_WORKSPACE_LABELS.LEAVE_CONTEXT,
      consequence: PROJECTION_WORKSPACE_LABELS.LEAVE_CONSEQUENCE,
      confirmLabel: PROJECTION_WORKSPACE_LABELS.LEAVE_CONFIRM,
      cancelLabel: PROJECTION_WORKSPACE_LABELS.LEAVE_CANCEL,
    }).then((confirmed) => {
      promptingRef.current = false;
      if (confirmed) blocker.proceed();
      else blocker.reset();
    });
  }, [blocker, confirm]);

  useEffect(() => {
    if (!dirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);
}
