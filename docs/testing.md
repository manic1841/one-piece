# 測試指南 (Testing Guide)

本文件說明專案的三層測試策略:單元測試 (unit)、整合測試 (integration) 與瀏覽器 E2E 測試,以及各自的執行方式與邊界。E2E 不取代 domain、application、Emulator boundary tests。

## 測試總覽

| 層級     | 指令                    | 需要模擬器 | 說明                                             |
| -------- | ----------------------- | ---------- | ------------------------------------------------ |
| 單元測試 | `pnpm test`             | 否         | jsdom 環境,驗證 domain、use case 與 UI 元件行為  |
| 覆蓋率   | `pnpm test:coverage`    | 否         | 單元測試範圍的 text/JSON/HTML 報告               |
| 整合測試 | `pnpm test:integration` | 是         | 對 Firebase Emulator 驗證持久化與 security rules |
| E2E 測試 | 未導入(見下)            | 是         | 最小 browser smoke suite,屬 roadmap 最後階段     |

## 單元測試

```bash
pnpm test
```

- 執行 `vitest.config.ts`,include `src/**/*.{test,spec}.{ts,tsx}`,排除 `*.integration.test.*`。
- 不需要 Firebase Emulator;所有 Firebase 依賴以 mock 取代。
- 慣例:mock 被測 use case 觸及的所有 repository 與 permission service,避免意外真實 I/O。
- 產生覆蓋率報告:

```bash
pnpm test:coverage
```

## 整合測試

```bash
pnpm test:integration
```

- 執行 `vitest.integration.config.ts`,include `src/**/*.integration.test.{ts,tsx}`。
- 執行前由 `vitest.integration.setup.ts` 呼叫 `assertEmulatorsAvailable()`，
  在 15 秒期限內重試等待 emulator 可連線，逾時才提早失敗。
- 需要 Firestore (8080) 與 Auth (9099) 模擬器運行中。

### 模擬器環境變數

在 Docker dev stack 內,emulator host 是 service 名稱 `firebase`;本機以
`firebase emulators:start --only firestore,auth` 執行時使用 `127.0.0.1`。

```bash
# Docker dev stack 內
FIRESTORE_EMULATOR_HOST=firebase:8080 \
FIREBASE_AUTH_EMULATOR_HOST=http://firebase:9099 \
FIREBASE_PROJECT_ID=demo-project \
pnpm test:integration

# 本機
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
FIREBASE_AUTH_EMULATOR_HOST=http://127.0.0.1:9099 \
FIREBASE_PROJECT_ID=demo-project \
pnpm test:integration
```

執行單一整合測試檔,附加路徑即可:

```bash
FIRESTORE_EMULATOR_HOST=firebase:8080 \
FIREBASE_AUTH_EMULATOR_HOST=http://firebase:9099 \
FIREBASE_PROJECT_ID=demo-project \
pnpm test:integration src/test/firestoreRules.integration.test.ts
```

### Firestore security rules 測試

`src/test/firestoreRules.integration.test.ts` 使用
[`@firebase/rules-unit-testing`](https://firebase.google.com/docs/rules-unit-testing)
驗證 `firestore.rules` 的強制執行。Rules 在 `beforeAll` 透過 emulator 的
`securityRules` REST API 熱載入,並在 `afterAll` 還原為寬鬆設定,因此不影響
其他整合測試。除了運行中的 emulator 外不需額外設定。

### 瀏覽器 QA 用模擬器資料

需要登入狀態的瀏覽器測試(手動 QA 或未來的 E2E)可先執行模擬器 bootstrap:

```bash
pnpm qa:init
```

此腳本建立測試帳號、whitelist、household 與 user profile,並印出可貼入
DevTools 的 localStorage session 注入片段。細節見
[scripts/admin/README.md](../scripts/admin/README.md)。

## E2E 測試(瀏覽器)

目前尚未導入 E2E 測試。E2E 是最後一層信心來源:在 complex hook 的 loading/error/retry/cancellation/
double-submit coverage 完成後,加入最小 browser smoke suite,涵蓋:

- onboarding
- transaction entry
- monthly settlement
- report viewing

定位:E2E 驗證「使用者可完成關鍵旅程」,不取代 domain、application 與
Emulator boundary tests。導入時應更新本文件與 `package.json` 的 test scripts。

## Docker 環境執行

```bash
docker compose run --rm app pnpm test
docker compose run --rm app pnpm test:integration
docker compose down
```

`pnpm test` 不需要 emulator;`pnpm test:integration` 會透過 Compose service
名稱連線到 Firebase Emulator。若直接在 host 執行 integration tests,helper
會使用 published localhost ports。
