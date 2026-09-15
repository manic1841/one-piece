import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { checkSettlementCompletenessUseCase } from '@/application/settlement/use_cases/checkSettlementCompletenessUseCase';
import { type WatchListTargetType, buildWatchListDocId } from '@/domains/watch_list/schemas';
import {
  type CompletenessAnomalyVM,
  mapAnomalyToVM,
} from '@/ui/features/project/viewmodels/settlementPreview.vm';
import { useAuthContext } from '@/ui/hooks/useAuthContext';

export interface CompletenessGate {
  /** Anomalies still waiting for a per-item confirmation in this session. */
  pendingAnomalies: CompletenessAnomalyVM[];
  /** Non-empty when the check itself failed; the gate then stays out of the way. */
  completenessError: string;
  confirmAnomaly: (targetType: WatchListTargetType, targetId: string) => void;
  /** Clears confirmations and re-runs the check (new settlement session). */
  reset: () => void;
  /**
   * Awaits the in-flight check (so a fast click cannot outrun it) and reports
   * whether every anomaly is confirmed. False means the selection step holds.
   */
  isSettled: () => Promise<boolean>;
}

/**
 * Completeness soft gate for the settlement selection step (ADR-0048): a
 * read-only check auto-runs per selected month; zero-activity watched targets
 * block the transition to preview until each is confirmed. Confirmations are
 * session-scoped — reset() clears them and re-runs the check. A failing check
 * never blocks settlement; it surfaces as completenessError instead.
 */
export const useCompletenessGate = (
  householdId: string | undefined,
  year: number,
  month: number,
): CompletenessGate => {
  const auth = useAuthContext();
  const [anomalies, setAnomalies] = useState<CompletenessAnomalyVM[]>([]);
  const [completenessError, setCompletenessError] = useState('');
  const [confirmedKeys, setConfirmedKeys] = useState<string[]>([]);
  const confirmedRef = useRef<Set<string>>(new Set());
  const checkSeq = useRef(0);
  const latestCheck = useRef<Promise<CompletenessAnomalyVM[]> | null>(null);
  // Bumped by reset() so reopening re-runs the check even when the month is unchanged.
  const [session, setSession] = useState(0);

  useEffect(() => {
    if (!householdId) {
      latestCheck.current = Promise.resolve([]);
      return;
    }
    const seq = ++checkSeq.current;
    const check = checkSettlementCompletenessUseCase
      .execute({ householdId, year, month, auth })
      .then((result): CompletenessAnomalyVM[] => {
        const mapped = result.anomalies.map(mapAnomalyToVM);
        if (seq === checkSeq.current) {
          setAnomalies(mapped);
          setCompletenessError('');
        }
        return mapped;
      })
      .catch((err: unknown): CompletenessAnomalyVM[] => {
        // Soft gate: degrade to "unknown" with a visible warning rather than
        // silently assuming everything is fine. Never blocks settlement.
        console.error('Completeness check failed:', err);
        if (seq === checkSeq.current) {
          setAnomalies([]);
          setCompletenessError(err instanceof Error ? err.message : String(err));
        }
        return [];
      });
    latestCheck.current = check;
  }, [householdId, year, month, session, auth]);

  const reset = useCallback(() => {
    confirmedRef.current = new Set();
    setConfirmedKeys([]);
    setAnomalies([]);
    setCompletenessError('');
    setSession((prev) => prev + 1);
  }, []);

  const confirmAnomaly = useCallback((targetType: WatchListTargetType, targetId: string) => {
    const key = buildWatchListDocId(targetType, targetId);
    confirmedRef.current.add(key);
    setConfirmedKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
  }, []);

  const pendingAnomalies = useMemo(
    () => anomalies.filter((a) => !confirmedKeys.includes(a.key)),
    [anomalies, confirmedKeys],
  );

  const isSettled = useCallback(async () => {
    const checked = (await latestCheck.current) ?? [];
    return !checked.some((a) => !confirmedRef.current.has(a.key));
  }, []);

  return { pendingAnomalies, completenessError, confirmAnomaly, reset, isSettled };
};
