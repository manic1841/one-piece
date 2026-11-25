import { type Household } from '@/domains/household/schemas';
import { householdRepository } from '@/infra/repositories/householdRepository';

/**
 * 同一份 household 文件在一次畫面載入裡會被讀很多次：路由守衛、頁面 use case、
 * 以及每一列的權限檢查。這裡用一個短 TTL 把這些讀取收斂成一次。
 *
 * 快取不是真相來源：所有寫入（含備份還原）完成後立刻失效，TTL 也短到
 * 跨客戶端的權限變更不可能長期被蓋住。並行呼叫同一份文件共用一個 promise。
 */
const CACHE_TTL_MS = 15_000;

interface CachedHousehold {
  householdId: string;
  value: Household | null;
  readAt: number;
}

let cached: CachedHousehold | null = null;
const inflight = new Map<string, Promise<Household | null>>();
let version = 0;

/** 寫入 household 後呼叫；不必傳參數，整份快取一次清掉。 */
export function invalidateHouseholdCache(): void {
  cached = null;
  // Versioning prevents a read started before this write from putting its old
  // response back, or evicting a read that began after the invalidation.
  version += 1;
  inflight.clear();
}

export interface GetHouseholdRequest {
  householdId: string;
}

export class GetHouseholdUseCase {
  async execute(request: GetHouseholdRequest): Promise<Household | null> {
    const { householdId } = request;

    if (cached && cached.householdId === householdId && Date.now() - cached.readAt < CACHE_TTL_MS) {
      return cached.value;
    }

    const pending = inflight.get(householdId);
    if (pending) return pending;

    const requestVersion = version;
    const read = householdRepository
      .get([householdId])
      .then((household) => {
        if (version === requestVersion) {
          cached = { householdId, value: household, readAt: Date.now() };
        }
        return household;
      })
      .finally(() => {
        if (version === requestVersion && inflight.get(householdId) === read) {
          inflight.delete(householdId);
        }
      });

    inflight.set(householdId, read);
    return read;
  }
}

export const getHouseholdUseCase = new GetHouseholdUseCase();
