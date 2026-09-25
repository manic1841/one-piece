# QA Seed 資料設計 (QA Seed Data)

本文件說明 `qa:seed` 種子資料集的設計架構：固定窗口、組裝管線、各 builder 的資料邊界，以及關帳期間矩陣。

詞彙定義見 [`CONTEXT.md`](../CONTEXT.md)；操作流程（qa:init 前置條件、執行方式、注意事項）見 [testing.md](testing.md) 與 [scripts/admin/README.md](../scripts/admin/README.md)。

## 1. 設計原則

- **純 builder、寫入分離**：資料集由 `scripts/qa/plan/` 的純 builder 在記憶體組裝，不 import firebase；`scripts/qa/seed-qa-data.ts` 持有全部 I/O（批次 upsert、Date→Timestamp 轉換）。
- **推導一致性**：snapshots 與財務報表經純 domain calculator 推導（project settlement、debt payment、report calculations），每個種子數字與種子交易保持一致，不另行硬編碼。
- **zod 契約即時驗證**：每份文件在 emit 時過 zod schema 並 push 驗證後的結果（未記錄的鍵不會寫進 Firestore）；schema 漂移在 seed 時 loud fail，不會等到 app 讀取時才爆。
- **確定性**：固定 doc ID 與固定時鐘（`QA_SEED_FIXED_NOW`），可重複執行（upsert 非 append），重跑收斂到同一狀態。

## 2. 固定資料窗口

**規範來源**：本節為窗口的唯一規範；`scripts/qa/plan/shared.ts` 的 `SEED_WINDOW_START` / `SEED_WINDOW_END` / `inSeedWindow` 是實作。

- 窗口固定 **2025-01 ～ 2026-09**：所有交易（transaction journal）必須落在窗口內，orchestrator 以 `assertJournalInsideSeedWindow` 守護，越界即 loud fail。
- 資料密度不均勻是設計決策，不是缺陷：
  - **2025**：每月薪水（21 筆薪水交易中的 12 筆）＋同 ID 分配，支撐退休收入流的 `sampleYear=2025` 導入。
  - **2026**：日常支出流（2026-04 起）、房貸撥款（2026-01）與每月還款（2026-02 起）、投資與轉帳、帳戶快照、財務報表與關帳期間。
- 報表月份固定 `2026-07` ～ `2026-09` 三期。

## 3. 組裝管線與資料邊界

依賴是單向管線，builder 之間互不 import；跨 builder 的可變狀態（交易 journal）由 orchestrator 持有傳遞。

| 順序 | Builder           | 產出                                                                                         | 邊界                                                                           |
| ---- | ----------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1    | `staticDocs`      | projects、accounts、ledgerCodes、intent_mappings、allocationTemplates、portfolio、已結清信貸 | 全域設定文件；其他 builder 以 ID 引用                                          |
| 2    | `transactionDocs` | 薪水交易+分配（窗口全期）、支出流、房貸撥款、投資、轉帳、手動分錄                            | 寫 INCOME/EXPENSE/TRANSFER 等一般交易與全部 Allocation；跨 domain 交易留在這裡 |
| 3    | `accountDocs`     | 房貸還款交易、DebtSnapshots、DebtAccount、cash/securities AccountSnapshots                   | 也寫 DEBT_PAYMENT 交易；債務餘額經 debt payment calculator 推導（ADR-0015）    |
| 4    | `projectDocs`     | Project settlement snapshots、Portfolio snapshots                                            | opening balances 從首月鏈結（ADR-0012）；僅報表月份持久化                      |
| 5    | `retirementDocs`  | 退休計畫（無子集合）＋ incomeStreams/expenseCategories                                       | 薪資導入讀 2025 樣本；房貸導入讀種子還款                                       |
| 6    | `reportDocs`      | 三份財務報表 × 報表月份、關帳期間矩陣                                                        | 報表經純 calculators 推導，hybrid equity 語意見 ADR-0019                       |

orchestrator 為 `scripts/qa/plan/index.ts`，`buildQaSeedPlan` 是唯一對外入口（seam test 直接 import 它）。

## 4. 關帳期間矩陣

**規範來源**：期間狀態語意見 [monthly-close.md](monthly-close.md) §2；本節只定義種子覆蓋哪些形狀。

| 期間      | 狀態         | 形狀                                                                                            |
| --------- | ------------ | ----------------------------------------------------------------------------------------------- |
| `2026-06` | NEEDS_REVIEW | 前六階段 COMPLETED；Completeness Check 零活動暫停（`reviewSourceStageId = COMPLETENESS_CHECK`） |
| `2026-07` | CLOSED       | 九階段全 COMPLETED 帶 `confirmedBy`/`confirmedAt`；重開與 ADR-0066 連鎖降級的 E2E 目標          |
| `2026-08` | CLOSED       | 同上                                                                                            |
| `2026-09` | IN_PROGRESS  | 前五階段 COMPLETED                                                                              |

`2026-05` 及更早不寫入紀錄（無紀錄 = 尚未開始關帳）。`operation` 集合不 seed（runtime 重試記錄）。

## 5. 測試

Seam tests 在 [src/test/qaSeedPlan.test.ts](../src/test/qaSeedPlan.test.ts)：組合順序與跨 builder 一致性（確定性、薪水↔分配雙向連結、journal 平衡、所有 Transaction 文件落在窗口內）由 composed seam 守護；per-builder 文件數與鍵存在性不另測（emit 的 zod 驗證已即時守護 schema 漂移）。窗口不變式由 orchestrator 的 `assertJournalInsideSeedWindow` 在 seed 時守護。
