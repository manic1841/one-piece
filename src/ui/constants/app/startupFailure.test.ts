import { describe, expect, expectTypeOf, it } from 'vitest';

import { AUTH_INIT_ERROR_CODES } from '@/infra/contexts/AuthContext';

import { STARTUP_FAILURE_COPY, type StartupFailureCode } from './startupFailure';

/**
 * `constants` 不得 import `@/infra`（ADR-0062），所以兩份錯誤碼值域是各自宣告的。
 * 這裡把它們釘在一起：infra 新增一個碼而 UI 沒有對應文案時，這個測試會失敗。
 * （本檔是測試，不屬 production 的 constants tier。）
 */
describe('startupFailure labels', () => {
  it('keeps the UI code union identical to the infra code union', () => {
    expectTypeOf<StartupFailureCode>().toEqualTypeOf<(typeof AUTH_INIT_ERROR_CODES)[number]>();

    expect([...Object.keys(STARTUP_FAILURE_COPY)].sort()).toEqual(
      [...AUTH_INIT_ERROR_CODES].sort(),
    );
  });

  it('provides a title and description for every code', () => {
    for (const [code, copy] of Object.entries(STARTUP_FAILURE_COPY)) {
      expect(copy.title, `${code} title`).toBeTruthy();
      expect(copy.description, `${code} description`).toBeTruthy();
    }
  });
});
