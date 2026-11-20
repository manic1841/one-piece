import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

import { app, useEmulator } from '@/firebase';

import { FIRESTORE_PROXY_PATH } from './emulatorEndpoints';

/**
 * Firestore 的實例放在 `@/firebase` 之外，讓啟動路徑（auth + router）不必付
 * `firebase/firestore` 的下載成本：只有碰到資料的模組才 import 這裡，路由切分後
 * 它就落在第一個需要資料的 chunk。
 */
const db = getFirestore(app);

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
