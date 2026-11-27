import { type Household } from '@/domains/household/schemas';
import { householdRepository } from '@/infra/repositories/householdRepository';
import { createSingleFlightTtlCache } from '@/shared/singleFlightTtlCache';

/**
 * 同一份 household 文件在一次畫面載入裡會被讀很多次：路由守衛、頁面 use case、
 * 以及每一列的權限檢查。這裡用一個短 TTL 把這些讀取收斂成一次。
 *
 * 快取不是真相來源：所有寫入（含備份還原）完成後立刻失效，TTL 也短到
 * 跨客戶端的權限變更不可能長期被蓋住。並行呼叫同一份文件共用一個 promise。
 *
 * 查無資料不快取：剛建立的家戶不該在 TTL 內持續讀成不存在。
 */
const cache = createSingleFlightTtlCache<string, Household | null>({
  ttlMs: 15_000,
  maxEntries: 5,
  shouldCache: (household) => household !== null,
});

/** 寫入 household 後呼叫；不必傳參數，整份快取一次清掉。 */
export function invalidateHouseholdCache(): void {
  cache.invalidate();
}

export interface GetHouseholdRequest {
  householdId: string;
}

export class GetHouseholdUseCase {
  async execute(request: GetHouseholdRequest): Promise<Household | null> {
    const { householdId } = request;
    return cache.resolve(householdId, () => householdRepository.get([householdId]));
  }
}

export const getHouseholdUseCase = new GetHouseholdUseCase();
