import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Non-reactive read; use inside effects and event handlers. */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia(QUERY).matches;

/**
 * Reactive version: re-renders when the visitor changes the preference mid
 * session, so a running animation can settle without a reload.
 */
export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    const query = window.matchMedia(QUERY);
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
};

export default useReducedMotion;
