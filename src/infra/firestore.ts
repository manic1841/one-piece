import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

import { app, useEmulator } from '@/firebase';

import { FIRESTORE_PROXY_PATH } from './emulatorEndpoints';

/**
 * Firestore 的實例放在 `@/firebase` 之外，讓啟動路徑（auth + router）不必付
 * `firebase/firestore` 的下載成本：只有碰到資料的模組才 import 這裡，路由切分後
 * 它就落在第一個需要資料的 chunk。
 *
 * 本機持久化（IndexedDB）是刻意的：回訪時已知資料立刻回放，不必空等網路；離線期間
 * 讀取仍可用，寫入排隊重送。多分頁管理器讓同時開數個分頁的既有用法維持不變
 * （單一分頁管理器會讓第二個分頁退回記憶體快取）。代價是磁碟佔用與「畫面可能先是
 * 快取值」——後者由 ADR-0072 的 UNKNOWN／已知值語意接住。
 *
 * 沒有 IndexedDB 的環境（測試用的 DOM 實作、部分 WebView）退回記憶體快取，避免 SDK
 * 先噴錯再降級。
 */
const hasIndexedDb = typeof globalThis.indexedDB !== 'undefined';

const db = initializeFirestore(
  app,
  hasIndexedDb
    ? { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }
    : {},
);

if (useEmulator) {
  // Escape hatch for browsers that run inside the compose network and can resolve
  // the `firebase` service hostname themselves.
  const directHost = import.meta.env.VITE_FIREBASE_EMULATOR_HOST as string | undefined;

  if (directHost) {
    connectFirestoreEmulator(db, directHost, 8080);
  } else {
    // Default: same-origin through the Vite dev-server proxy. The host usually
    // publishes only the app port, so the browser cannot reach the emulator's
    // 8080/9099 directly.
    //
    // The Firestore SDK builds its channel base URL as `http://${host}:${port}`,
    // so a path prefix has to travel inside the `port` argument.
    const proxiedFirestorePort = `${window.location.port}${FIRESTORE_PROXY_PATH}`;
    connectFirestoreEmulator(
      db,
      window.location.hostname,
      proxiedFirestorePort as unknown as number,
    );
  }
}

export { db };
