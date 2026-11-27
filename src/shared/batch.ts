/**
 * 逐批平行。整批 `Promise.all` 在集合很大時會一次丟出幾十個往返；逐批跑能保住
 * 平行帶來的好處，又讓同時在路上的請求有上限。
 *
 * 批次之間是序列的，所以回傳值的順序與輸入一致。
 */
const BATCH_SIZE = 10;
export async function mapInBatches<T, R>(
  items: readonly T[],
  map: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];

  for (let start = 0; start < items.length; start += BATCH_SIZE) {
    const batch = items.slice(start, start + BATCH_SIZE);
    results.push(...(await Promise.all(batch.map(map))));
  }

  return results;
}
