import { createSingleFlightTtlCache } from '@/shared/singleFlightTtlCache';

import { type RouteAccessOutcome } from './use_cases/authorizeRouteAccessUseCase';

/**
 * 路由守衛在每次換頁都重跑一次授權決策，而決策要讀白名單與 household 成員，
 * 短時間內反覆進出同一批頁面就是重複付同一份成本。這裡把決策結果按輸入收斂
 * 起來。
 *
 * 快取不是真相來源，靠三件事撐住：key 本身就含所有決策輸入；會改變答案的寫入
 * 呼叫 `invalidateRouteAccessCache()`（清單見 docs/architecture.md）；跨裝置的
 * 改動看不到，只能靠短 TTL，所以 TTL 刻意短。決策丟出錯誤時不寫入，下一次換頁
 * 重試，維持 fail-closed。
 *
 * 只快取決策，不碰 session 狀態：有沒有登入仍是 infra 的觀測（ADR-0062）。
 */
const cache = createSingleFlightTtlCache<string, RouteAccessOutcome>({
  ttlMs: 30_000,
  maxEntries: 20,
});

export interface RouteAccessCacheKey {
  uid: string;
  email: string | null;
  isGlobalAdmin: boolean;
  householdId: string | null;
  requireHousehold: boolean;
}

/** All decision inputs, joined so any change lands on a different slot. */
export function routeAccessCacheKey(key: RouteAccessCacheKey): string {
  return [
    key.uid,
    key.email ?? '',
    key.isGlobalAdmin ? '1' : '0',
    key.householdId ?? '',
    key.requireHousehold ? '1' : '0',
  ].join('|');
}

/**
 * 回傳這個 key 的決策：先看快取，再看有沒有人已經在路上，都沒有才真的執行。
 *
 * 同一輪裡兩個守衛同時掛載（或多個 `ProtectedRoute` 並存）會在同一 key 上並發，
 * 少了 in-flight 去重就會同時打兩份一樣的讀取，快取寫入也救不了。
 */
export function resolveRouteAccessDecision(
  key: string,
  run: () => Promise<RouteAccessOutcome>,
): Promise<RouteAccessOutcome> {
  return cache.resolve(key, run);
}

/** 白名單、成員或備份還原一有寫入就呼叫；不必傳參數，整份快取一次清掉。 */
export function invalidateRouteAccessCache(): void {
  cache.invalidate();
}
