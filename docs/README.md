# One-Piece 文件索引

路標而已。每份文件的責任範圍寫在它的開頭；文件分工與撰寫規範見
[development-guide.md](development-guide.md) §3。

## 架構與資料

- [architecture.md](architecture.md) — 分層與資料流契約。
- [data-structure.md](data-structure.md) — 集合拓撲、契約 owner、跨集合不變量、備份範圍。
- [adr/](adr/) — 決策紀錄，只記「為什麼」。
- [ddd-design-principles.md](ddd-design-principles.md) — 領域建模原則。

## 領域

- [transaction-flow.md](transaction-flow.md) — 交易流程、意圖分層與分配語意。
- [financial_report.md](financial_report.md) — 報表來源、符號原則與儀表板錨定。
- [monthly-close.md](monthly-close.md) — 關帳工作流與階段資料邊界。
- [debt-accounts.md](debt-accounts.md) — 債務生命週期與還款語意。
- [retirement-system.md](retirement-system.md) — 退休計畫與投影。

## 操作與測試

- [operations.md](operations.md) — 驗證命令、CI/CD、Docker、部署與 release。
- [testing.md](testing.md) — 測試策略、emulator 設定與 E2E。
- [qa-faq.md](qa-faq.md) — 除錯踩坑索引。
- [qa-seed-data.md](qa-seed-data.md) — 種子資料設計。

## 呈現層

- [ui/ui-layer-architecture.md](ui/ui-layer-architecture.md) — UI 分層、依賴方向與動作位置。
- [ui/design-system.md](ui/design-system.md) — token 與元件表面契約。
- [ui/visual-standards.md](ui/visual-standards.md) — 頁面層級版面與互動標準。
- [ui/states-and-a11y.md](ui/states-and-a11y.md) — 三態義務與無障礙。
- [ui/component-catalog.md](ui/component-catalog.md) — 共用元件目錄。
- [ui/ui-labeling-guideline.md](ui/ui-labeling-guideline.md) — 顯示標籤來源。

## Agent

- [agents/issue-tracker.md](agents/issue-tracker.md) — issue 與 spec 的操作方式。
- [agents/triage-labels.md](agents/triage-labels.md) — triage 標籤。
- [agents/domain.md](agents/domain.md) — agent 該先讀哪些 domain 文件。
- [development-guide.md](development-guide.md) — 開發準則與文件規範。
