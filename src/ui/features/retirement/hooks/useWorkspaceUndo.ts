import { useCallback, useRef, useState } from 'react';

const STACK_LIMIT = 20;

/**
 * Undo for timeline gestures only. A gesture pushes its restore callback once,
 * before writing the draft; undo pops and replays it. The stack is cleared by
 * save and plan apply.
 */
export function useWorkspaceUndo() {
  const stackRef = useRef<Array<() => void>>([]);
  const [canUndo, setCanUndo] = useState(false);

  const sync = useCallback(() => setCanUndo(stackRef.current.length > 0), []);

  const push = useCallback(
    (restore: () => void) => {
      stackRef.current.push(restore);
      if (stackRef.current.length > STACK_LIMIT) stackRef.current.shift();
      sync();
    },
    [sync],
  );

  const undo = useCallback(() => {
    stackRef.current.pop()?.();
    sync();
  }, [sync]);

  const clear = useCallback(() => {
    stackRef.current = [];
    sync();
  }, [sync]);

  return { push, undo, canUndo, clear };
}
