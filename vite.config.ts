import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

import packageJson from './package.json';
import {
  AUTH_PROXY_PREFIXES,
  DEFAULT_AUTH_EMULATOR_TARGET,
  DEFAULT_FIRESTORE_EMULATOR_TARGET,
  EMULATOR_AUTH_HANDLER_PREFIX,
  FIRESTORE_PROXY_PATH,
} from './src/infra/emulatorEndpoints';

/** Strip a scheme so both `firebase:8080` and `http://firebase:8080` work as proxy targets. */
const normalizeTarget = (value: string | undefined, fallback: string): string =>
  `http://${(value ?? fallback).replace(/^https?:\/\//, '')}`;

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Forward the emulator to the app origin so a host-side browser only needs the
    // app port (see src/infra/emulatorEndpoints.ts). Only relevant in dev.
    proxy: {
      [FIRESTORE_PROXY_PATH]: {
        target: normalizeTarget(
          process.env.FIRESTORE_EMULATOR_HOST,
          DEFAULT_FIRESTORE_EMULATOR_TARGET,
        ),
        changeOrigin: true,
        ws: true,
        rewrite: (requestPath) => requestPath.replace(FIRESTORE_PROXY_PATH, ''),
      },
      // Auth keeps no path prefix of its own: the SDK builds requests against the
      // fake API hosts below, so each is forwarded verbatim to the auth emulator.
      ...Object.fromEntries(
        AUTH_PROXY_PREFIXES.map((prefix) => [
          prefix,
          {
            target: normalizeTarget(
              process.env.FIREBASE_AUTH_EMULATOR_HOST,
              DEFAULT_AUTH_EMULATOR_TARGET,
            ),
            changeOrigin: true,
            ws: true,
          },
        ]),
      ),
      // signInWithPopup in emulator mode opens `<origin>/emulator/auth/handler`;
      // without forwarding it, Vite's SPA fallback serves index.html into the
      // popup (blank window).
      [EMULATOR_AUTH_HANDLER_PREFIX]: {
        target: normalizeTarget(
          process.env.FIREBASE_AUTH_EMULATOR_HOST,
          DEFAULT_AUTH_EMULATOR_TARGET,
        ),
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      treeshake: {
        // Firestore 只有 lazy 路由用得到。Rollup 會為 manualChunk 補一行 side-effect
        // import 來保證執行順序，那行會把 Firestore 拉回首屏；宣告它沒有 module
        // side effect 之後就不補。真正的副作用（`getFirestore`、連 emulator）都在模組
        // 內，模組被 import 時照常執行。
        moduleSideEffects: (id) =>
          !(
            id.includes('/src/infra/firestore.ts') ||
            id.includes('/@firebase/firestore/') ||
            id.includes('/firebase/firestore/')
          ),
      },
      output: {
        // Rollup 預設會把 entry 的 transitive import 提升到 entry chunk；那會讓
        // firestore-client 這類「只有 lazy 路由才用」的共用 chunk 一起被首屏載入。
        hoistTransitiveImports: false,
        manualChunks: (id) => {
          // Firestore 的實例模組被所有資料 chunk 共用，因此仍需釘成獨立 chunk；
          // 否則 Rollup 會把它放進 entry chunk。
          if (id.includes('/src/infra/firestore.ts')) return 'firestore-client';
          if (id.includes('/@firebase/firestore/') || id.includes('/firebase/firestore/')) {
            return 'firebase-firestore';
          }
          // auth 本來就在啟動路徑上，釘住可避免被拆散到各個 chunk。
          if (id.includes('/src/firebase.ts') || id.includes('/src/infra/emulatorEndpoints.ts')) {
            return 'firebase-auth';
          }
          if (id.includes('/@firebase/') || id.includes('/firebase/')) return 'firebase-auth';
          // React core libraries
          if (id.includes('/react-router') || id.includes('/react-dom') || id.includes('/react/')) {
            return 'react-vendor';
          }
          // UI libraries
          if (id.includes('/lucide-react/') || id.includes('/@radix-ui/')) return 'ui-vendor';
          // Utilities
          if (
            id.includes('/date-fns/') ||
            id.includes('/zod/') ||
            id.includes('/clsx/') ||
            id.includes('/tailwind-merge/')
          ) {
            return 'utils';
          }
          return undefined;
        },
      },
    },
    // Increase chunk size warning limit to 600kb (reduced warnings for split chunks)
    chunkSizeWarningLimit: 600,
  },
});
