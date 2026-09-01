# Command 原子性與重試政策

應用層 command 可能被網路重試，也可能一次更新多個 durable records。若沒有
一致的分類，重試可能建立重複財務事件，或留下 source record 與快取不一致的
狀態。本 ADR 定義所有 command 的共同政策；個別領域仍須在自己的 ADR 補充
輸入與結果契約。

## 決策

### Command 分類

每個 command 必須屬於以下其中一類，並遵守該類別的重試規則：

1. **Idempotent command**：同一個請求執行多次，結果與執行一次相同；重試可以
   直接重新執行，不需要額外的 idempotency key。這只適用於設定相同 desired
   state 的操作，不適用於新增一筆事件。
2. **Deterministically retry-safe command**：command 的業務資源有穩定且可重建
   的 identity。重試會讀取該 identity；若 payload 相同則回傳既有結果，若
   payload 不同則拒絕，不得覆蓋原資料。Firestore document ID 可以協助定位
   資源，但不能把累加型寫入變成這一類。
3. **Atomic desired-state command**：command 會更新多個代表同一 desired state
   的 durable records。所有必要的讀取與寫入必須在同一個 Firestore transaction
   中完成，利用 optimistic concurrency 偵測競爭；失敗時所有寫入一起回滾。
   若 command 只是取代 desired state，通常不需要 idempotency key；若同時新增
   不可重複的 source event，仍須依第 4 類處理。
4. **Explicitly non-repeatable command**：每次成功執行都會新增不可重複的 source
   event，或產生不可逆的財務效果。此類 command 必須要求 caller-generated
   idempotency key，並以 operation record 將 key、payload 與結果綁在同一個
   原子操作中。`DEBT_PAYMENT` 屬於此類。

Command 不得只因使用 deterministic document ID 就宣稱 retry-safe；例如同月
DebtSnapshot 的 upsert 是累加操作，仍需保護其對應的 source Transaction。

### 三種 identity 的界線

- **Idempotency key** 是 caller 為「一次使用者意圖」產生的 opaque token。相同
  意圖的每次 retry 必須重用同一 key；新的使用者意圖必須產生新的 key。它在
  household 範圍內與 operation type 組合使用，不是時間戳、email、auth token
  或每次 attempt 重新產生的 UUID。
- **Firestore document ID** 是資料庫用來定位一份文件的 persistence identity，
  可以由 Firestore 產生，也可以由應用程式指定。它不代表 command 已經成功，
  也不等於 caller 的 idempotency key；operation record 可以用 key 的穩定映射
  作為 document ID，但文件仍須保存原始 key 並依本 ADR 驗證。
- **Deterministic snapshot/report identity** 是由 household、對象、期間與型別
  等業務欄位穩定推導的資源 identity，例如 debt account 的 `YYYY-MM` snapshot
  或報表的期間與類型。它用於查找或取代同一觀察點，不代表一次 command 的
  唯一執行，因此不能取代 financial command 的 idempotency key。

### Household operation record

需要 key 的 command 在該 command 的 household 下維護：

```text
households/{householdId}/operations/{operationRecordId}
```

`operationRecordId` 必須由 operation type 與 idempotency key 穩定、安全地映射，
使 retry 可以在 transaction 內直接讀取。Operation record 至少包含：

```text
operationType: string
idempotencyKey: string
fingerprintVersion: number
payloadFingerprint: string
status: "IN_PROGRESS" | "SUCCEEDED" | "FAILED"
resultReference: object | null
createdAt: Timestamp
updatedAt: Timestamp
completedAt?: Timestamp | null
createdByUid: string
```

`resultReference` 只保存足以重新取得結果的 resource references，例如
`transactionId`、`debtAccountId` 與 snapshot period；不把完整 auth context、token、
email 或不必要的個人資料寫入 operation record。時間欄位由 server timestamp
產生，`createdByUid` 是執行者的 authentication UID。

同一 household、operation type 與 key 的行為固定如下：

- 相同 payload fingerprint 且已有 `SUCCEEDED`：回傳原本的 result reference，
  不新增 source record、不重寫 snapshot，也不再次改變 balance。
- 不同 payload fingerprint：回傳穩定的 `IDEMPOTENCY_CONFLICT` application error，
  不修改原 operation 或其財務結果。
- `IN_PROGRESS`：由 Firestore transaction contention/重試處理；呼叫端不得另
  建一筆 operation。若實際 transaction abort，operation 與所有財務寫入一起
  回滾，後續 retry 可以重新執行。
- `FAILED` 或 command 在 validation、permission、missing resource 階段失敗：
  不得留下 `SUCCEEDED` record。對 atomic financial command，失敗 operation
  record 與 source records 必須同時回滾，讓同一 key 可以在修正可重試的暫時
  性錯誤後重試；穩定的輸入錯誤則由 caller 修正後使用新的 user action/key。

金融 operation record 的保留時間應與其對應的 financial source records 一致，
以便長期稽核與辨識 retry；不得因短期快取清理而早於財務資料刪除。

### 金融 source 與 denormalized cache

Transaction、journal entries 與其他 financial source records 是唯一權威來源。
`DebtAccount.currentBalance`、`DebtSnapshot` 與其他 denormalized caches 只是加速
讀取的派生資料。凡是由同一 financial command 產生的 source record 與 cache，
必須在同一個 Firestore transaction 內更新；任何單獨更新 cache 的路徑都不符合
本政策。Transaction abort 或 optimistic-concurrency conflict 時，不得留下部分
source、snapshot、balance 或成功的 operation result。

## Debt Payment 特例

`DEBT_PAYMENT` 使用 operation type `DEBT_PAYMENT`，要求非空且由 caller 產生的
idempotency key。其 fingerprint version 1 只包含會影響 operation 的輸入：

```text
operationType
fingerprintVersion
debtAccountId
totalPayment
canonicalPaymentDate
normalizedDescription
explicitProjectId
```

其中 `canonicalPaymentDate` 是正規化後的付款日；`normalizedDescription` 是去除
僅影響呈現的多餘空白後的說明；`explicitProjectId` 只記錄 caller 明確提供的
project identity，不把從 DebtAccount fallback 的 project 寫入 fingerprint。Generated
document IDs、execution timestamps、authentication context、email 與 stored
balance 都排除在 fingerprint 外。版本升級時建立新的 fingerprint version，不能
靜默改變既有 key 的解讀。

## 寬限期規則

寬限期狀態由日期推導，判斷式為：

```text
startDate <= paymentDate && paymentDate < graceEndDate
```

`graceEndDate` 為 null/未設定表示沒有寬限期；起始日包含，結束日不包含，因此
付款日等於 `graceEndDate` 時已進入正常還款。寬限期內的 ordinary `DEBT_PAYMENT`
只能記錄利息，principal 必須為 0；付款高於該期適用利息時拒絕，不得隱含提前
償還本金。低於適用利息的正付款可被接受為 interest-only payment，並回傳未覆蓋
利息的 warning；分錄仍須以實際付款金額平衡。這個日期規則同時適用於試算、
分錄建立與 UI 狀態顯示。

## 後續需檢視的 Command 家族

本 ADR 只建立政策，不在本票實作其他 domain。後續新增或修改以下 command 家族
時，必須先標註分類並檢查是否需要 key、operation record 與同一 transaction：

- Debt payment、debt account 建立/結清與其他會新增 financial source 的債務操作
- Transaction、allocation 與 project settlement 的新增或批次更新
- Account、portfolio、project 與 retirement snapshot 的寫入/取代
- Financial report 生成、匯入/同步與備份還原等跨多集合操作

## 結果

這個政策把「重試同一意圖」與「建立新的財務事件」分開，並將 source、快取與
operation result 的一致性責任放在同一個 application command transaction 內。