# Post-#40 Roadmap(已歸檔)

> **狀態:已完成並歸檔(2026-09-11)。** 本 roadmap 的全部切片均已實作關閉:
> §1 Allocation Consistency(#47、#48)、§2 Retirement Consistency(#49)、
> §3 Reordering Contract(ADR-0041)、§4 Persistence And Access Boundaries
> (#50-#55)、§5 Settlement, Reports And Retirement Import(#56-#68)。
> §6 的測試層級與 E2E 規劃已移至 [測試指南](../testing.md)。
> 決策依據見各切片連結的 ADR;現行架構文件以 [實作進度](../implementation-status.md) 為準。
> 本文件僅供歷史查閱,不再維護。

## Baseline

Issue #40 的第一步定義為 Phase 0 + Phase 1，已在 commit `43b2017` 完成：

- Phase 0：unit/integration boundary、Emulator preflight/reset failure、read-only
  lint、CI/Docker development baseline。
- Phase 1：Debt Payment validation、strict grace-period behavior、atomic
  persistence、optimistic concurrency、idempotency 與 operation record。

本文件只規劃後續工作，不在本文件中混入 production code。第一個可執行切片的
spec 已發布為 [issue #47](https://github.com/manic1841/one-piece/issues/47)；後續
ticket 建立前，先依下列順序確認 domain invariant、command classification 與驗收
邊界。

## 1. Allocation Consistency

來源：[issue #34](https://github.com/manic1841/one-piece/issues/34)、
[issue #47](https://github.com/manic1841/one-piece/issues/47)、
[issue #48](https://github.com/manic1841/one-piece/issues/48)、
[ADR-0039](adr/0039-allocation-atomicity-and-identity.md)。這是下一個優先切片，
分成兩個互相銜接但可獨立驗收的工作。

### 1A. Create Transaction With Allocation — issue #47

**目的**：讓初次建立帶分配的 `INCOME` / `EXPENSE` 成為一個可重試的 composite
command。

**邊界**：

- Transaction、Allocation、`allocationId` link 與成功 operation result 同一個
  Firestore transaction。
- caller-generated idempotency key；same-key same-payload replay 回傳原結果，
  different payload 回傳 stable conflict。
- 任一驗證、寫入、競爭或 retry failure 不留下本次新建的任何資料。
- 沒有 Allocation 的一般 Transaction 不受影響。
- 新 Allocation ID 使用 `sourceTransactionId`，不把它當成 idempotency key。

**必要測試**：application permission/validation/replay/conflict tests；Emulator
成功 persistence、任一寫入 failure rollback、concurrent retry、operation record、
ledger index 與 balanced entries。

### 1B. Replace Current Allocation — issue #48

**目的**：讓同一 `sourceTransactionId` 維持唯一 current Allocation，並安全支援
重新分配。

**狀態**：已完成。`replaceAllocationUseCase` 與既有交易編輯流程共用同一個
Firestore transaction replacement helper；source Transaction 的財務欄位不會被
重新建立或刪除。

**邊界**：

- Allocation 內容與 source Transaction link 同一 transaction 更新。
- 不刪除或 rollback 已存在的 Transaction。
- 同一 desired state 可安全重試；不同 desired state 是新的 replacement。
- 新 deterministic ID、舊 random-ID fallback 與 lazy normalization 不可造成兩筆
  current Allocation。
- 只支援 `INCOME` / `EXPENSE`。

**驗證**：已涵蓋 create/replace/no-allocation scenarios、legacy lookup、failure
rollback、concurrent replacement、唯一 current Allocation 與 source link consistency。

## 2. Retirement Consistency

對應 #34 的第二個切片。boundary 與併發語意已由
[ADR-0040](adr/0040-retirement-plan-atomic-writes.md) 決定：

- create/update/delete/duplicate 的主文件、child replacement 與 active fan-out
  在單一 Firestore transaction 內完成。
- 寫入數動態計算，超過 400 回穩定錯誤 `PLAN_TOO_LARGE`，不做部分寫入。
- preflight 讀取在 transaction callback 內；併發啟用由既有 plan 文件衝突收斂，
  preflight 後新建 active plan 的極小視窗已接受並文件化。
- 「至多一筆 active、零筆合法」；create/duplicate 不自動啟用。
- `PLAN_NOT_FOUND` 顯式拒絕遺失來源計畫；create/duplicate 不引入
  operation record，UI 補 create/duplicate 的 pending disabled 防護。

實作需涵蓋 application 單元測試與 Emulator failure/concurrency tests（rollback、
併發啟用、child replacement 失敗保留舊資料、duplicate/delete 原子性、上限錯誤）。

## 3. Reordering Contract

已完成。Account、Project、Portfolio reorder 選定 all-or-nothing 契約並依
[ADR-0041](adr/0041-reorder-atomic-contract.md) 實作：三個 command 共用單一
transaction helper，重複 id 回 `INVALID_ORDERS`、遺失目標回 `TARGET_NOT_FOUND`、
transaction 失敗包裝為 `TRANSACTION_FAILED`；不再使用 `Promise.all` 部分成功。
Emulator 覆蓋全量套用、寫入失敗回滾與併發收斂。

## 4. Persistence And Access Boundaries

依 #39 Phase 2 排序：

1. Repository nested collection、query shape、timestamp conversion 與 cascade
   behavior 的 Emulator tests。
2. Firestore security rules authorization matrix。
3. Household backup/restore round-trip、malformed payload、nested collection、
   chunking 與 failure tests。
4. Onboarding/auth initialization 與 application authorization rejection tests，
   對應 #35、#37。

## 5. Settlement, Reports And Retirement Import

依 #39 Phase 3 處理 settlement readiness、report generation/storage 與 retirement
import orchestration，分別對應 #32、#31 與 #30。每一個工作先確認 period boundary、
source-versus-snapshot authority、retry classification 與 stored result identity。

## 6. UI And End-to-End Confidence

最後依 #39 Phase 4 補 complex hook 的 loading/error/retry/cancellation/double-submit
coverage，再加入最小 browser smoke suite，涵蓋 onboarding、transaction entry、
monthly settlement 與 report viewing。E2E 不取代 domain、application、Emulator
boundary tests。

## Ordering Rule

後續切片遵循：

```text
domain invariant -> command classification -> application boundary
-> Emulator persistence/failure test -> UI integration -> issue bookkeeping
```

任何會改變既有 ADR 定義的工作，必須先更新 ADR 與 regression tests；未完成前不
建立實作 ticket。