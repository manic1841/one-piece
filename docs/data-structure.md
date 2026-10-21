# 資料結構 (Data Structure)

本文件只回答三件事：**有哪些集合、每個集合的契約住在哪、跨集合的不變量是什麼。**
欄位與型別不抄在這裡——單一真相是下方的 owner 檔案。

## 1. 拓撲

```
access_control/{email}                     # 系統層白名單
users/{uid}                                # profile 與最後選擇的家庭
households/{householdId}                   # 家庭根文檔
  projects/{projectId}
    snapshots/{snapshotId}
  accounts/{accountId}
    snapshots/{snapshotId}
  portfolios/{portfolioId}
    snapshots/{snapshotId}
  debtAccounts/{debtAccountId}
    snapshots/{yearMonth}
  retirementPlans/{planId}
  projections/{projectionId}
    snapshots/config
    snapshots/source
    results/annual
  allocations/{allocationId}
  allocationTemplates/{templateId}
  financialPeriods/{yearMonth}
  transactions/{transactionId}
  operations/{operationRecordId}
  reports/{reportId}
  ledgerCodes/{code}
```

`users` 與 `access_control` 是全域的，其餘都在 household 之下。`firestore.rules` 對
household 子集合走 catch-all，路徑與刪除權限由 application 層把關。

## 2. 契約 owner

| 集合                         | Domain 契約                                                            | 存取層                                                     |
| ---------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| `households`、`users`        | `src/domains/household/schemas.ts`、`src/domains/auth/user/schemas.ts` | `householdRepository.ts`、`userRepository.ts`              |
| `access_control`             | `src/domains/auth/whitelist/schemas.ts`                                | `accessControlRepository.ts`                               |
| `projects` (+ snapshots)     | `src/domains/project/schemas.ts`                                       | `projectRepository.ts`、`projectSnapshotRepository.ts`     |
| `accounts` (+ snapshots)     | `src/domains/account/types/account.ts`                                 | `accountRepository.ts`、`accountSnapshotRepository.ts`     |
| `portfolios` (+ snapshots)   | `src/domains/portfolio/schemas.ts`                                     | `portfolioRepository.ts`、`portfolioSnapshotRepository.ts` |
| `debtAccounts` (+ snapshots) | `src/domains/debt/schemas.ts`                                          | `debtAccountRepository.ts`、`debtSnapshotRepository.ts`    |
| `retirementPlans`            | `src/domains/retirement/schemas/retirementSchemas.ts`                  | `retirementPlanRepository.ts`                              |
| `projections`                | `src/domains/retirement/schemas/projectionSchemas.ts`                  | `projectionRepository.ts`                                  |
| `transactions`               | `src/domains/ledger/schemas.ts`                                        | `transactionRepository.ts`                                 |
| `allocations`                | `src/domains/allocation/schemas.ts`                                    | `allocationRepository.ts`                                  |
| `allocationTemplates`        | `src/domains/allocation/templateSchemas.ts`                            | `allocationTemplateRepository.ts`                          |
| `ledgerCodes`                | `src/domains/ledger/schemas.ts`                                        | `customLedgerCodeRepository.ts`                            |
| intent mapping               | `src/domains/ledger/intentMapping.ts`                                  | `intentMappingRepository.ts`                               |
| `financialPeriods`           | `src/domains/financial_period/schemas.ts`                              | `financialPeriodRepository.ts`                             |
| `operations`                 | `src/domains/operation/schemas.ts`                                     | `operationRepository.ts`                                   |
| `reports`                    | `src/domains/report/schemas.ts`                                        | `reportRepository.ts`                                      |

改欄位時只改 owner 契約與其 migration；本文件只有在集合增減或 owner 搬家時才動。

## 3. 跨集合不變量

- **兩套會計不互相推導**：專案餘額由 Allocation 與 Transaction 推導（管理會計）；
  報表從分錄的 LedgerCode 計算（財務會計）（ADR-0006）。
- **快照是可重算的快取**：`transactions.entries` 才是唯一真相，程式碼只寫事件與
  Allocation，不直接寫專案快照（ADR-0012）。`debtAccounts.currentBalance` 同理由
  分錄推導（ADR-0015）。
- **現金不細分帳戶**：統一以 `asset:cash` 記錄，不回答「這筆錢從哪個帳戶付的」
  （ADR-0008）。
- **不動產與收入以明細科目區分**：例如 `asset:property:taipei`、`income:salary:charles`；
  報表層對父科目 roll-up（ADR-0021、ADR-0069、ADR-0074）。
- **排序是 desired-state 全量序列**：reorder 送完整 `[{id, order}]`，成功或全數失敗，
  缺漏與重複一律拒絕（ADR-0041）。
- **投影唯讀**：建立後只有 `name` 可改，刪除先子後主、單一 batch（ADR-0083、ADR-0088）。
- **每筆交易借貸平衡**：由 domain schema 保證。

## 4. 備份涵蓋範圍

備份是 household 資料域的完整匯出，格式為 `schemaVersion: 2`；`1` 直接拒絕，沒有
相容分支（ADR-0084）。涵蓋根文檔、所有含 snapshot 子集合的實體、`retirementPlans`、
`projections` 的四份文件、交易、報表、分配、模板、科目、intent mapping 與財務期間。

三項刻意排除：`operations`（冪等鍵紀錄，還原舊紀錄干擾重試語意）、`users` 與
`access_control`（全域身分與存取層，隨備份還原有安全風險）。已退役的集合出現在較舊
payload 時一律忽略（ADR-0080）。

匯入以與匯出同組 domain schema 驗證，驗證失敗即中止、不刪任何資料；刪除逐集合條件化。
還原沿用備份內的 id 與 audit 欄位，**不重算衍生值**——備份越舊，其中的快取觀察值越
陳舊。備份檔中的時間欄位到達匯入端時是 ISO 字串，由共用的 timestamp schema 解析。
`backupCoverage.test.ts` 靜態掃描集合清單，新增集合未更新備份會讓測試失敗。

## 5. 相關文件

- 各 domain 的行為與邊界：`architecture.md`、`transaction-flow.md`、`monthly-close.md`、
  `financial_report.md`、`debt-accounts.md`、`retirement-system.md`
- 決策理由：`docs/adr/`
