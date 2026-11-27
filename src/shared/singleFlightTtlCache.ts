/**
 * 短 TTL 的單飛快取：同一個 key 的並行呼叫共用一個 promise，值只活 `ttlMs`。
 *
 * 給「短時間內會被同一批讀取反覆問到、但本身不是真相來源」的資料用。呼叫端負責
 * 在所有寫入之後呼叫 `invalidate()`；跨客戶端的改動只能靠 TTL 兜住，所以 TTL
 * 刻意短。
 *
 * `invalidate()` 會 bump 版本：失效發生在飛行途中時，那一趟的答案不會被回填。
 */
export interface SingleFlightTtlCache<K, V> {
  resolve(key: K, run: () => Promise<V>): Promise<V>;
  invalidate(): void;
}

export interface SingleFlightTtlCacheOptions<V> {
  ttlMs: number;
  maxEntries: number;
  /** 回傳 false 就不快取這個值（例如查無資料）。 */
  shouldCache?: (value: V) => boolean;
}

interface Entry<V> {
  value: V;
  readAt: number;
}

export function createSingleFlightTtlCache<K, V>(
  options: SingleFlightTtlCacheOptions<V>,
): SingleFlightTtlCache<K, V> {
  const { ttlMs, maxEntries, shouldCache } = options;

  const cache = new Map<K, Entry<V>>();
  const inflight = new Map<K, Promise<V>>();
  let version = 0;

  function read(key: K): { hit: true; value: V } | { hit: false } {
    const entry = cache.get(key);
    if (!entry) return { hit: false };

    if (Date.now() - entry.readAt >= ttlMs) {
      cache.delete(key);
      return { hit: false };
    }

    return { hit: true, value: entry.value };
  }

  function write(key: K, value: V): void {
    if (shouldCache && !shouldCache(value)) return;

    if (cache.size >= maxEntries) {
      // Insertion order is the eviction order: the oldest entry is also the one
      // furthest past its TTL in any realistic access pattern.
      const oldest = cache.keys().next();
      if (!oldest.done) cache.delete(oldest.value);
    }

    cache.set(key, { value, readAt: Date.now() });
  }

  function resolve(key: K, run: () => Promise<V>): Promise<V> {
    const cached = read(key);
    if (cached.hit) return Promise.resolve(cached.value);

    const pending = inflight.get(key);
    if (pending) return pending;

    const requestVersion = version;
    const request = run()
      .then((value) => {
        if (version === requestVersion) write(key, value);
        return value;
      })
      .finally(() => {
        if (inflight.get(key) === request) inflight.delete(key);
      });

    inflight.set(key, request);
    return request;
  }

  function invalidate(): void {
    cache.clear();
    inflight.clear();
    version += 1;
  }

  return { resolve, invalidate };
}
