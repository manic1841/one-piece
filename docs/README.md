# One-Piece 專案文件索引 (Documentation)

歡迎來到 One-Piece 的技術文件庫。這裡記載了系統的設計初衷、架構模式與維護指南。

## 📖 核心文件

### 架構與設計

- **[架構說明 (Architecture)](/docs/architecture.md)**
  - 深入了解領域驅動設計 (DDD) 的分層結構。
  - 明白 Domain, Application, Infra 的職責劃分。

- **[資料結構 (Data Structure)](/docs/data-structure.md)**
  - Firestore 集合 (Collections) 與 文檔 (Documents) 的完整對照。
  - 複式簿記與管理會計的資料關聯。

- **[架構決策紀錄 (ADR)](/docs/adr/)**
  - 架構與業務取捨的唯一決策來源,只記錄「當初為什麼這樣決定」。
  - 規範細節（欄位、enum、公式、數值、驗收清單）以各主題文件為準;ADR 只留 `規範來源` 指標。

### 財務與領域

- **[財務報表計算邏輯 (Financial Report)](/docs/financial_report.md)**
  - 損益表、資產負債表與現金流量表的產生原理。
  - 不同會計層級的資料來源說明。

- **[退休系統設計 (Retirement System)](/docs/retirement-system.md)**
  - 退休資料模型與收入流 (`incomeStreams`) 子集合規格。
  - 從交易分錄 (`Transaction.entries`) 導入收入的完整流程。

### 開發與維護

- **[開發指南 (Development Guide)](/docs/development-guide.md)**
  - 如何在專案中新增功能。
  - 代碼風格建議與品質要求。

- **[測試指南 (Testing)](/docs/testing.md)**
  - 單元測試、整合測試與 E2E 測試的三層策略與執行方式。
  - Firebase Emulator 環境變數設定與 security rules 測試說明。

- **[QA FAQ (除錯筆記)](/docs/qa-faq.md)**
  - 測試與瀏覽器驗證時「不容易發現、容易導致錯誤結論」的踩坑案例索引。
  - 依「症狀 → 根因 → 判別法」記錄,避免重複踩相同的坑。

### 呈現層 (UI)

- **[設計系統 (Design System)](/docs/ui/design-system.md)**
  - 設計 token 與元件表面契約：色彩、動態、材質層級、字體排印與元件尺寸/狀態。
  - 元件與 token 改動的驗收標準。

- **[頁面視覺標準 (Visual Standards)](/docs/ui/visual-standards.md)**
  - 頁面層級契約：Page Shell、頁寬、間距用途、空/載入/錯誤狀態、工作流與 Dashboard 版面、資料密度、互動一致性與 review checklist。
  - 頁面佈局與互動改動的驗收標準。

- **[UI 架構 (UI Layer Architecture)](/docs/ui/ui-layer-architecture.md)**
  - UI 分層結構、依賴方向、導航／Header 契約與 RWD 斷點契約。
  - List / Detail / Workflow 責任切分與動作位置（Action Hierarchy）。
  - 共用元件歸屬規則與各層職責邊界。

- **[UI 標籤指南 (UI Labeling Guideline)](/docs/ui/ui-labeling-guideline.md)**
  - 前端顯示標籤（`intentType`、`intent`、`ledgerCode`）的唯一來源。
  - 交易列表、表單預覽與報表的標籤解析規則。

### Agent 合約

- **[Issue Tracker (issue-tracker.md)](/docs/agents/issue-tracker.md)**
  - Issue 與 spec 的來源:GitHub issues,以 `gh` CLI 操作。

- **[Triage Labels (triage-labels.md)](/docs/agents/triage-labels.md)**
  - 五個 canonical triage label 與 skill 通用角色的對照。

- **[Domain Docs (domain.md)](/docs/agents/domain.md)**
  - Agent 探索 codebase 前該讀哪些 domain 文件(`CONTEXT.md`、`docs/adr/`)。

## 🛠️ 維護原則

> "Bad code is bad code regardless of comments. Refactor first." - _Linus Torvalds_

- **文件分工依目的決定**: 每份文件只回答一個問題,每條事實只有一個家;詳細矩陣與「新增文件前的三個測試」見 development-guide §3。
- **保持簡潔**: 不要過度封裝，優先考慮效能與可讀性。
- **文件即時性**: 代碼異動時，務必同步更新相關文件，以免誤導後續接手者。
- **設計暫置不在版控內**: 設計討論期的暫置內容不是事實來源；決策記在 GitHub issue、原型放 throwaway 分支，功能落地後併入正式文件與 ADR 並刪除，repo 內不留暫置資料夾。完整規則見 development-guide §3 維護建議。
