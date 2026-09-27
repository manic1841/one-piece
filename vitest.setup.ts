import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Firebase Analytics 初始化是非同步的，在 jsdom 環境 teardown 後才會碰到
// 已被移除的 window，造成 flaky unhandled rejection。單元測試不需要它。
vi.mock('firebase/analytics', () => ({ getAnalytics: () => undefined }));
