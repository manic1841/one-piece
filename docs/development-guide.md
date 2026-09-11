# 開發指南 (Development Guide)

本文件說明在 One-Piece 專案中新增功能或修改邏輯的標準流程。

## 1. 新增功能的標準流程

當你想要新增一個功能（例如：處理資產買賣、自動對帳）時，請遵循以下步驟：

### 第一步：定義領域模型 (Domain Layer)

- 在 `src/domains/{domain_name}/` 建立 `schemas.ts` 與 `types.ts`。
- **嚴禁**直接在 `src/infra/schemas/` 定義業務類型。

### 第二步：實作存取層 (Infrastructure Layer)

- 在 `src/infra/repositories/` 建立 Repository。
- 一般 CRUD Repository 應繼承 `BaseRepository`，並引用 **Domain Layer** 定義的 Schema。
- 若資料需要專用的 operation schema、server timestamp 或 Firestore transaction
  讀寫封裝，可以使用明確的 custom Repository；仍須把資料契約放在 Domain
  Layer，並讓 transaction context 由 Application Use Case 傳入。

### 第三步：建立原子使用案例 (Application Use Cases)

- 在 `src/application/{domain_name}/use_cases/` 建立單一職責的操作。
- 複雜的校驗邏輯應放進 **Domain Service**。

### 第四步：建立應用控制器 (Application Hook)

- 在 `src/ui/features/{feature_name}/hooks/` 建立 Hook。
- Hook 職責：管理 UI 狀態、注入 `AuthContext`、呼叫 Use Case。

### 第五步：建立 UI Form ViewModel 與 Mapper (UI Layer)

- 在 `src/ui/features/{feature_name}/viewmodels/` 建立表單 VM Schema（Zod）。
- 定義 `mapXxxVMToDomain`，集中處理字串/日期/數值轉換。
- 規則：Component 與 Hook 不得直接組裝 Domain payload。

### 第六步：實作 UI 組件

- 呼叫 Hook 並渲染畫面。
- 提交路徑必須經過 `Schema.parse -> Mapper -> UseCase`。

## 2. 代碼風格要求

- **不要直接呼叫 Repository**: 除非是極其簡單的讀取，否則應透過 Use Case 排列組合業務邏輯。
- **編排規則**: 不要讓 Hook 呼叫超過一個以上的 Use Case。
- **嚴格型別**: 正式程式碼絕對禁止使用 `any`。測試檔為了建立 mock 或 fixture，已由 ESLint 測試檔規則放寬 `no-explicit-any`；能使用 `unknown`、具體型別或 typed helper 時仍應優先使用。
- **單一職責**: 一個 Use Case 文件只做一件事（例如：`recordTransactionUseCase.ts` 只負責記錄交易）。
- **表單一致性**: 表單資料必須先映射到 ViewModel，再由 mapper 轉換成 domain 型別。
- **驗證一致性**: 所有新表單路徑統一採用 Zod schema，禁止分散式手寫驗證。

## 3. 維護建議

- **先更新 ADR**: 若修改的是架構或業務取捨，先新增或修訂 `docs/adr/` 中的決策，再同步更新 `docs/` 下的結構與流程參考；不要在兩處重新定義同一規則。
- **維護結構參考**: 如果修改了資料結構，更新 `docs/data-structure.md` 的欄位清單與 ADR 連結。
- **保持 `docs/` 的準確性**: 流程文件應說明如何運作，決策理由與不可逆約束則集中在 ADR。
- **效能考量**: 避免在前端進行超大規模的資料處理與循環引用。
- **備份/還原流程**: Settings 提供 household 等級的 JSON 備份與還原。還原應包含各主集合與其 snapshot 子集合，並限制為 household owner/admin（或 global admin）可執行。

## 4. 驗證命令

- `pnpm test`: 執行不依賴 Firebase Emulator 的 unit tests。
- `pnpm test:coverage`: 對相同的 unit test 範圍產生 text、JSON 與 HTML coverage 報告。
- `pnpm test:integration`: 執行需要 Firebase Emulator 的 integration tests；執行前會在期限內重試等待 emulator 可連線。
- `pnpm exec tsc --noEmit -p tsconfig.test.json`: 驗證測試檔的 TypeScript project 設定與 `@/*` 路徑別名；此 project 也由 root solution reference，供 IDE 解析使用，並以 declaration-only、no-check 方式納入 build graph，不進行完整語意型別檢查。
- `pnpm exec tsc -b`: 依 root solution 執行完整 build graph 型別檢查（正式程式碼）。
- `pnpm lint`: 執行唯讀 ESLint 檢查。
- `pnpm lint:fix`: 明確執行 ESLint 自動修正。

## 4.1 CI/CD 流程

GitHub Actions 位於 `.github/workflows/`：

- **CI**（`test.yml`）：對 main/develop 的 push 與 PR 觸發。依序執行 lint、
  `tsc -b`、unit tests、Firestore Emulator integration tests。Node 版本以 `.nvmrc`
  為單一真相來源；依賴以 `--frozen-lockfile` 安裝並快取 pnpm store。同一分支的新
  push 會取消舊的執行（concurrency），整體逾時 20 分鐘。
- **Deploy to Firebase Hosting on PR**（`firebase-hosting-pull-request.yml`）：
  CI 成功後，對每個 PR 與 develop 的 push 部署 Hosting preview channel。
  checkout 鎖定 `workflow_run.head_sha`，部署的 commit 與測試的 commit 一致。
- **Deploy to Firebase Hosting on merge**（`firebase-hosting-merge.yml`）：
  CI 成功後，對 main 的 push 部署到 live channel，同樣鎖定 `head_sha`。

部署以「CI 綠燈」為閘門；lint 與型別檢查也必須通過，PR 才能被視為可合併。

各測試層級的完整說明(模擬器環境變數、security rules 測試、E2E 規劃)見
[測試指南](testing.md)。

## 5. CI/CD

見上方 4.1 節的 GitHub Actions 流程說明。

## 6. Docker 開發環境

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

在 container 中執行驗證命令：

```bash
docker compose run --rm app pnpm test
docker compose run --rm app pnpm test:integration
docker compose down
```

`pnpm test` 不需要 emulator；`pnpm test:integration` 會透過 Compose service name 連線到 Firebase Emulator。若直接在 host 執行 integration tests，helper 會使用 published localhost ports。
