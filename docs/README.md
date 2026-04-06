# One-Piece 專案文件索引 (Documentation)

歡迎來到 One-Piece 的技術文件庫。這裡記載了系統的設計初衷、架構模式與維護指南。

## 📖 核心文件

1. **[架構說明 (Architecture)](/docs/architecture.md)**
   - 深入了解領域驅動設計 (DDD) 的分層結構。
   - 明白 Domain, Application, Infra 的職責劃分。

2. **[資料結構 (Data Structure)](/docs/data-structure.md)**
   - Firestore 集合 (Collections) 與 文檔 (Documents) 的完整對照。
   - 複式簿記與管理會計的資料關聯。

3. **[開發指南 (Development Guide)](/docs/development-guide.md)**
   - 如何在專案中新增功能。
   - 代碼風格建議與品質要求。

4. **[財務報表計算邏輯 (Financial Report)](/docs/financial_report.md)**
   - 損益表、資產負債表與現金流量表的產生原理。
   - 不同會計層級的資料來源說明。

5. **[退休系統設計 (Retirement System)](/docs/retirement-system.md)**
   - 退休資料模型與收入流 (`incomeStreams`) 子集合規格。
   - 從交易分錄 (`Transaction.entries`) 導入收入的完整流程。

## 🛠️ 維護原則

> "Bad code is bad code regardless of comments. Refactor first." - *Linus Torvalds*

- **保持簡潔**: 不要過度封裝，優先考慮效能與可讀性。
- **文件即時性**: 代碼異動時，務必同步更新相關文件，以免誤導後續接手者。
