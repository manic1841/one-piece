import react from '@vitejs/plugin-react-swc';
import path from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

import packageJson from './package.json';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      // 關鍵配置：將 '@' 映射到 /src 資料夾的絕對路徑
      '@': path.resolve(__dirname, './src'),
      // 根據您的專案結構，可能是 './app' 或其他資料夾
    },
  },
  test: {
    globals: true,
    // happy-dom 建立環境比 jsdom 快，且跑測試時間明顯較短（見 docs/testing.md）。
    // 少數依賴 jsdom 專有行為的檔案以 `// @vitest-environment jsdom` 就地覆寫。
    environment: 'happy-dom',
    setupFiles: './vitest.setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['src/**/*.integration.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts'],
      // Ratchet policy (docs/testing.md §覆蓋率政策): thresholds sit at the measured
      // baseline and may only be raised, never lowered. Domain logic carries the
      // real risk, so it holds its own higher bar; UI deliberately has no threshold
      // to avoid render-only tests written just to pad the number. Percentages live
      // here, not in prose, so a bump in coverage updates one place.
      thresholds: {
        statements: 65,
        functions: 64,
        branches: 61,
        lines: 65,
        'src/domains/**': {
          statements: 84,
          functions: 88,
          branches: 80,
          lines: 84,
        },
      },
    },
  },
});
