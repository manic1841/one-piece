# 投資組合帳戶連結邊界：具名單一來源 + 建立後不可變更

投資組合是觀察投資持倉與價值變化的管理視圖（ADR-0006 語意分離：描述投資部位，不取代實體帳戶或會計科目）。組合與來源帳戶的連結邊界如下：

- 具名單一來源：每個 portfolio 以 `securitiesAccountId` + `bankAccountId` 具名欄位連結恰好一個證券帳戶與一個銀行/現金帳戶。價值公式（證券市值 + 銀行帳戶期末餘額）需要「哪個是證券戶、哪個是銀行戶」的確定答案，不允許無確定映射的帳戶集合。
- 銀行連結接受 bank 或 cash 類別：兩者都是持有現金、以觀察餘額為資料來源的帳戶（ADR-0008）；報表層（reportCalculations）亦將兩者視為 cash-equivalent。
- 存在性與唯一性：兩個來源帳戶皆須存在且分類正確；同一 household 中，每個來源帳戶至多屬於一個 portfolio（防止同一期末餘額被重複計入）。驗證在 `createPortfolioUseCase` 執行，由 domain 純函數 `validatePortfolioConstraints` 承擔。
- 建立後不可變更：連結不可改（`updatePortfolioUseCase` 拒絕 `securitiesAccountId`/`bankAccountId` 變更）。改連結會使既有快照與報表的來源映射失效；需要新映射時建立新 portfolio。
- 舊欄位處理：`accountIds[]` 與 `description` 已從 schema 移除。zod 讀取時 strip 未知欄位，舊文件讀取安全；一次性遷移腳本 `scripts/admin/migrate-portfolio-links.ts` 依帳戶分類對號入座並清除舊欄位。

## Considered Options

- 維持 `accountIds[]` 陣列 + use case 層檢查：同樣保證約束，但「恰好兩個 id」的模型不自明，計算層需要靠 category 猜映射，拒絕。
- 允許建立後改連結：使既有快照與報表的來源映射失效，需重算或標記歷史資料，拒絕。
- 註記為 gap、延後處理：portfolio 價值公式已有確定語意（spec 11），且資料尚在 seed 階段、遷移成本接近零，採用立即採用，拒絕。
