/**
 * 讀取路徑的 dev-only 量測。production 完全跳過（不呼叫 `performance.now()`，
 * 也不留 console 噪音），因此呼叫端可以放心把每一次 repository 讀取都包起來。
 * 測試環境也跳過：單元測試的讀取不經網路，量到的數字沒有意義，只會蓋掉輸出。
 *
 * 標籤刻意帶上文件路徑，讓 console 與 devtools Performance 面板都能直接看出
 * 慢在哪一個集合、是不是被權限檢查或 N+1 迴圈拖住。
 */
const enabled =
  import.meta.env.DEV && import.meta.env.MODE !== 'test' && typeof performance !== 'undefined';

export async function measure<T>(label: string, run: () => Promise<T>): Promise<T> {
  if (!enabled) return run();

  const start = performance.now();
  try {
    return await run();
  } finally {
    console.debug(`[perf] ${label} ${(performance.now() - start).toFixed(1)}ms`);
  }
}
