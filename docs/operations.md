# 操作手冊 (Operations)

本文件回答「怎麼跑、怎麼驗、怎麼部署、怎麼發版」。測試策略本身見
[testing.md](testing.md)，開發流程與規範見 [development-guide.md](development-guide.md)。

## 1. 驗證命令

- `pnpm test`: 執行不依賴 Firebase Emulator 的 unit tests。
- `pnpm test:coverage`: 對相同的 unit test 範圍產生 text、JSON 與 HTML coverage 報告。
- `pnpm test:integration`: 執行需要 Firebase Emulator 的 integration tests；執行前會在期限內重試等待 emulator 可連線。
- `pnpm test:e2e`: 執行 Playwright browser smoke suite（見 [testing.md](testing.md) §E2E）。需要外部啟動的 emulator 與 chromium，較慢且不進本地 commit pipeline；由 CI 的 `e2e` job 在 PR 與 main push 上把關（見 §3）。
- `pnpm typecheck:e2e`: 驗證 E2E 測試檔（`e2e/`）與 `playwright.config.ts` 的 TypeScript。E2E 檔案不在 `src/`，因此不在 `tsc -b` 的 build graph 內，由本命令獨立把關；CI 的 `e2e` job 在跑 Playwright 前執行。
- `pnpm exec tsc --noEmit -p tsconfig.test.json`: 驗證測試檔的 TypeScript project 設定與 `@/*` 路徑別名；此 project 也由 root solution reference，供 IDE 解析使用，並以 declaration-only、no-check 方式納入 build graph，不進行完整語意型別檢查。
- `pnpm exec tsc -b`: 依 root solution 執行完整 build graph 型別檢查（正式程式碼）。
- `pnpm lint`: 執行唯讀 ESLint 檢查。
- `pnpm lint:fix`: 明確執行 ESLint 自動修正。
- `pnpm format`: 執行 Prettier 自動排版（寫入型驗證步驟，commit 前執行）。
- `pnpm docs:check`: 驗證正式文件（`docs/`，加上根目錄 `CONTEXT.md`、`AGENTS.md`）不引用暫置路徑與 spec 套件名，並斷言已退役的設計暫置資料夾不存在、相對連結可解析、反引號裡以儲存庫頂層為根的路徑存在。可解析範圍與攔阻樣式見 `scripts/check-doc-references.sh` 與 `scripts/check-doc-code-paths.mjs`。

驗證收尾順序：`pnpm format` → `pnpm lint` → typecheck → tests → `pnpm docs:check`。format 放最前面，避免排版差異淹沒實質 diff。

## 2. CI/CD

GitHub Actions 位於 `.github/workflows/`。

- **CI**（`test.yml`）：對 main/develop 的 push 與 PR 觸發。依序執行 `pnpm lint`、`pnpm docs:check`、`tsc -b`、unit tests、Firestore Emulator integration tests。另有獨立的 **`e2e` job**，只在 PR 與 main push 執行（chromium + Playwright，見 [ADR-0082](adr/0082-e2e-playwright-limited-critical-journeys.md)），不在每次 push 觸發。CI 未含 format check——格式一致性由 `pnpm format` 在 commit 前承擔。Node 版本以 `.nvmrc` 為單一真相來源；依賴以 `--frozen-lockfile` 安裝並快取 pnpm store。同一分支的新 push 會取消舊的執行（concurrency），整體逾時 20 分鐘。
- **Deploy to Firebase Hosting on PR**（`firebase-hosting-pull-request.yml`）：CI 成功後，對每個 PR 與 develop 的 push 部署 Hosting preview channel；PR 為 `pr<N>-<branch>`（存 7 天），develop 的 push 為固定的 `develop`（每次 push 延長到 30 天），因此 develop 有一條長期穩定的 staging URL。
- **Deploy to Firebase Hosting on merge**（`firebase-hosting-merge.yml`）：CI 成功後，對 main 的 push 部署到 live channel。

部署以「CI 綠燈」為閘門；lint 與型別檢查也必須通過，PR 才能被視為可合併。部署一律 checkout `workflow_run.head_sha`，部署的 commit 與測試的 commit 一致；兩個部署 workflow 都以 `workflow_run` 觸發（YAML 與 secrets 取自 `main`），修改部署 workflow 需合併到 `main` 後才生效。鎖定與觸發設計的取捨理由、以及 channelId 必須明確傳入的原因，見各部署 workflow 檔內的 why 註解。

**preview URL 會打生產後端**，且 URL 只是難猜而非私有。詳見
[ADR-0047](adr/0047-preview-channel-shares-production-backend.md)：preview 僅供視覺確認，
不在上面錄入資料；需要可寫入的環境請用本機 Firebase Emulator。

不為 preview 另開 Firebase project（單一家庭使用，設定同步成本高於隔離效益）。Hosting
配額是 **project 層級**而非 channel 層級（免費額度 10 GB 儲存與 10 GB/月傳輸）；channel
數量本身不計費，但每個 channel 的 release 會佔用儲存，必要時在 console 設定各 channel 的
「releases to keep」上限。

## 3. Docker 開發環境

專案提供 root-level Docker development stack，固定 Node.js 24 與 pnpm 10，並以同一個 Compose project 啟動 Vite 與 Firebase Emulator。適合需要一致工具鏈或不想在 host 安裝 Node/pnpm 的開發者。

```bash
docker compose up --build
```

Vite 預設在 `http://localhost:5173`；若 host port 已被占用，可改用其他 port：

```bash
VITE_PORT=5174 docker compose up --build
```

- Vite host port: `5173` by default, or the value supplied through `VITE_PORT`
- Firebase Emulator UI: `http://localhost:4000`
- Firestore Emulator: `localhost:8080`
- Auth Emulator: `localhost:9099`

### 瀏覽器如何連到 emulator

Compose 只發佈 app 的 port（`5173`）；emulator 的 `8080`/`9099` 只在 compose 網路內，且瀏覽器解析不到 `firebase` 這個 service hostname。因此前端預設**不直連 emulator**，而是走 Vite dev server 的同源 proxy（設定在 `vite.config.ts`，路徑常數在 `src/infra/emulatorEndpoints.ts`）：

| 前端請求                                                                                      | 轉發目標                 |
| --------------------------------------------------------------------------------------------- | ------------------------ |
| `/__emulator/firestore/*`                                                                     | `http://firebase:8080/*` |
| `/identitytoolkit.googleapis.com/*`、`/securetoken.googleapis.com/*`、`/www.googleapis.com/*` | `http://firebase:9099/*` |

Auth 之所以用「假 API host」前綴而非自己的路徑前綴，是因為 `connectAuthEmulator` 會強制把 URL 路徑換成 `/`；Firestore 則是 channel base URL 直接由 `host:port` 字串串接，所以路徑前綴可以放在 host 裡。另有 `/emulator/auth` 前綴：Auth SDK 在 emulator 模式下 `signInWithPopup` 開啟的 widget 路徑若不轉發，會被 Vite 的 SPA fallback 吃掉（popup 載到 `index.html`，變黑畫面）。

若瀏覽器本身就在 compose 網路內（可解析 `firebase`），可略過 proxy：

```bash
VITE_FIREBASE_EMULATOR_HOST=firebase docker compose up --build
```

Proxy 的上游可用 `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST` 覆寫（兩者都接受有無 scheme 的寫法）。

在 container 中執行驗證命令：

```bash
docker compose run --rm app pnpm test
docker compose run --rm app pnpm test:integration
docker compose down
```

`pnpm test` 不需要 emulator；`pnpm test:integration` 會透過 Compose service name 連線到 Firebase Emulator。若直接在 host 執行 integration tests，helper 會使用 published localhost ports。

## 4. 部署 Firestore rules

```bash
firebase deploy --only firestore:rules
```

## 5. Release 流程

`develop` 是持續整合線，`main` 是 release 線；兩個保護分支都不直推，一切透過 PR。版號以 `package.json` 的 `version` 為單一真相來源（`vite.config.ts` / `vitest.config.ts` 注入，SiteFooter 顯示）。本節以 2.0.1 的實際執行為準。

### 常規發版

1. **Feature**：從 `develop` 切 branch（`feat/`、`fix/`）→ PR 回 `develop` → CI 綠燈 → merge。
2. **版號 bump**：從 `develop` 切 `release/X.Y.Z`，**只改 `package.json` 的 version** → PR 回 `develop` → merge。**merge 這個 PR 的時間點就是進版時間**，git 歷史可查。
3. **進版 main**：開 `develop` → `main` 的 PR（body 註明進版與內容來源 PR）→ merge，main 同時帶入功能與版號。
4. **Tag + Release**：merge 後執行 `gh release create vX.Y.Z --target main --generate-notes`——tag 打在 main HEAD，changelog 自動生成。

版號 bump 走獨立 release branch 而非併入 feature PR 的理由：feature review 中途變更時版號範圍不會漂移；merge commit 是明確的進版宣告；受保護分支下它也是唯一不需要特權的路徑。

### Hotfix

main 上線後的緊急修復（出 `2.0.2` 這類 patch）：

1. 從 **`main`** 切 `hotfix/X.Y.Z`，修復 + bump 一起走一個 PR 回 `main`。
2. merge 後執行 `gh release create vX.Y.Z --target main --generate-notes`。
3. cherry-pick 修復回 `develop`（bump 不 pick，下次 release branch 會帶）。

### 版號語意

依 semver：breaking change 或大型里程碑 → major、新功能 → minor、修復 → patch。`1.1.0 → 2.0.1` 的跳躍是之前忘記 bump 的補償，不是慣例；之後按 `2.1.0` / `2.0.2` 正常遞增。
