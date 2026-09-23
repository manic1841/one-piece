/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

import {
  AUTH_PROXY_PREFIXES,
  DEFAULT_AUTH_EMULATOR_TARGET,
  DEFAULT_FIRESTORE_EMULATOR_TARGET,
  FIRESTORE_PROXY_PATH,
} from './src/infra/emulatorEndpoints';
import packageJson from './package.json';

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
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Firebase - often the largest dependency
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          // UI libraries
          'ui-vendor': [
            'lucide-react',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
          ],
          // Charts library
          recharts: ['recharts'],
          // Utilities
          utils: ['date-fns', 'zod', 'clsx', 'tailwind-merge'],
        },
      },
    },
    // Increase chunk size warning limit to 600kb (reduced warnings for split chunks)
    chunkSizeWarningLimit: 600,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
  },
});
