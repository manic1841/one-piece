# Application 層接受 Firestore 直接依賴

**狀態：** 已接受（2026-09）
**規範來源：** [architecture.md](../architecture.md) §1

架構檢視（candidate 4）指出 `firebase/firestore` 的型別與函數出現在 application 層：use case 直接呼叫 `runTransaction`、以 `orderBy`/`where`/`limit`/`QueryConstraint` 描述查詢、`Transaction` 型別出現在部分 request interface。曾評估以 `AppTransaction` 不透明型別加 `FirestoreTxAdapter`（ports & adapters）隔離這些依賴。

審計後發現滲漏的主要來源是一條死執行緒：`householdPermissionService`、`getHouseholdUseCase`、`updateHouseholdUseCase`、project snapshot use cases 與 `useProjectCmds` 之間傳遞的 `tx?: Firestore Transaction` 參數，在整個 UI 層沒有任何呼叫端傳過值；實際的 Firestore transaction（債務還款、ledger 寫入、allocation 替換、reorder）全部在 use case 內部建立，從未跨越層邊界。

因此移除死的 `tx` 執行緒，並接受活的直接依賴。理由：[ADR-0002](0002-no-backend-frontend-logic-cloud-functions.md) 已將 Firebase 定為唯一後端（無 Cloud Functions、無第二儲存後端），adapter 沒有第二個實作，是沒有客戶的假想 seam；`runTransaction` 的 atomicity 編排是 use case 的本職，抽到 repo 只會把交易邏輯切成兩半；查詢 constraint 的參數物件化只是把 Firestore 詞彙原地重刻一層淺映射，深度為負。

## Consequences

- `baseRepository` 的 `tx?` 參數保留：它是活路徑（debt/ledger 交易內寫入）的機制，且位於 infra 層，屬於 Firestore 的合理封裝。
- 測試面不變：use case 測試以 mock repository 驗證，與是否使用 Firestore 交易無關。
- 若未來需要替換後端或測試交易行為，屆時再引入 adapter 或 in-memory fake，需求出現才付成本。
- 若未來需要從 UI 開啟跨 use case 的交易（目前不存在），需先設計應用層交易抽象，不得直接回填 `Transaction` 參數。
