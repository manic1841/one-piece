import { describe, expect, it } from 'vitest';

import { STARTUP_FAILURE_COPY } from './startupFailure';

/**
 * 錯誤碼的值域是單一宣告（`@/domains/auth/authInitError`），因此不需要再釘「兩份 union 相等」
 * （issue #177 定案 Q10 移除了那條 parity 斷言）。型別層級的完整性由
 * `Record<AuthInitErrorCode, StartupFailureCopy>` 在 `tsc` 時保證；這裡守的是
 * 文案本身不得為空。
 */
describe('startupFailure labels', () => {
  it('provides a title and description for every code', () => {
    for (const [code, copy] of Object.entries(STARTUP_FAILURE_COPY)) {
      expect(copy.title, `${code} title`).toBeTruthy();
      expect(copy.description, `${code} description`).toBeTruthy();
    }
  });
});
