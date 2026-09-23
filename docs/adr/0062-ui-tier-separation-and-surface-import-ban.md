# UI 分層五級：component 不得觸碰 domain 與 application

**日期：** 2026-09-23
**狀態：** 已接受
**對應 spec：** `docs/ui/ui-layer-architecture.md`

## Context

舊有依賴規則散落在三份文件（`architecture.md`、`ddd-design-principles.md`、`ui-layer-architecture.md`），
且彼此不一致：

- `ui-layer-architecture.md` 允許「UI 使用 Domain types 作參考」，未區分 component 與 hook。
- `ddd-design-principles.md` 用「Application Controller」同時指涉 hook 與 adapter，術語雙義。
- `development-guide.md` 要求「Hook 不得呼叫超過一個 Use Case」，與實際程式碼全面衝突
  （單一 hook 檔聚合 4–9 個 use case，用於提供一組操作選單）。

實測現況（本 ADR 成立時的數字）：

- `src/ui/components/**`（49 檔）對 domain/application/infra 的 import 數為 0。
- `src/ui/features/*/components/**` 有 36 個非測試檔直接 import `@/domains` 或 `@/application`。
- `src/ui/features/*/pages/**` 有 18 個非測試檔直接 import `@/domains`／`@/application`／`@/infra`。
- Hooks 有 63 檔，import `@/application` 119 次、`@/domains` 54 次——這部分是正當的。
- `src/infra/contexts/AuthProvider.tsx` 反向 import `@/ui/components/AppFallback`，是唯一的 infra → UI 依賴。
- `eslint.config.js` 沒有任何 boundary 規則，因此上述違規從未被阻擋。

使用者提出的原始命題是「UI 不該觸碰任何 application 與 domain 物件」。實測顯示該命題**對 component 成立，
對 hook 不成立**：hook 的職責就是呼叫 use case。命題需要被拆成可逐檔檢查的層級規則，否則無法套用。

## Decision

採納 **五個 UI 層級（tier）**，並以「**規則管 import 路徑，不管型別身分**」為判定原則：

1. **Surface**（`features/*/pages`、`features/*/components`、`components`；廣義為「不在下列任何非 Surface 目錄中」者）：
   **不得 import `@/domains`、`@/application`、`@/infra`——連型別也不行**。需要 domain 形狀時，一律經由所屬
   feature 的 ViewModel 取得。**Surface 是 fail-closed 預設**：tier 由目錄決定而非檔案角色，新增目錄在被列入
   分層表前一律視為 Surface，不會默默被豁免。
2. **ViewModel**（`features/*/viewmodels`、`features/*/mappers`、`features/*/types`）：domain ↔ component 的**唯一橋樑**。
   可 import domain 的型別、值域與純函式，也可 import application 的**型別**，但**不得呼叫 use case 或 workflow 的行為**。
3. **Controller**（`features/*/hooks`、`hooks`）：唯一可呼叫 use case / workflow 的層。不得 import repository。
4. **Display Labels**（`constants`）：資料值 → 顯示文字的唯一來源。其 **import 範圍刻意等同 ViewModel**——label map
   的本質是「值 → 文字」映射，拿 domain 列舉值與型別是正當輸入；要禁的是把 domain **行為**搬進來。
5. **Presentation Helper**（`utils`、`features/*/utils`）：純格式與樣式函式。

被否決的方案：

- **允許 component 直接使用 domain 型別**（舊規則）。否決理由：這正是 36 個檔案的污染來源；且 component
  一旦能碰到 domain，ViewModel 這層的存在意義就被繞過。
- **要求 component 的 props 與 domain 型別「不同構」**（嚴格的型別身分規則）。否決理由：無法靜態檢查，
  且會禁止 `Omit<Domain, 'id'>`、`export type { Holding }` 這類有價值的轉出寫法。改採 import 路徑規則。
- **禁止 ViewModel import application 型別**。否決理由：VM 的職責就是翻譯層，型別耦合是它的本分；要禁的是
  把行為搬進來。禁令若涵蓋型別，mapper 就得為每個來源重寫一份同構的影子型別，兩邊必然漂移。

同時新增一條**架構不變式**：**infra 不得 import UI**。`AuthProvider` 的 `AppFallback` render 移除，
判斷移至 UI 端的 gate。

### 修正（同日）

原文第 4 級寫「Display Labels 不得 import domain **值與邏輯**」，但 `constants` 的職責**正是**消費 domain 列舉值
來產生顯示文字，該句與自身分層矛盾。修正：**Display Labels 的 import 範圍等同 ViewModel**——可 import domain
型別、值域與純函式，但不得將 domain 行為帶入；「標籤唯一來源」的不變式仍由規則 7 與 `CONTEXT.md` 承擔。
另補齊分層表中原本缺漏的目錄歸屬，並明文化 **Surface 為 fail-closed 預設**；目錄與層級的對應細節以
`docs/ui/ui-layer-architecture.md` §2 為準，本節不重複。以上皆為釐清，非改變宗旨。

## 影響

- 規範性細節（層級表格、可觸碰清單、目錄結構、呼叫方向）住在 `docs/ui/ui-layer-architecture.md`，
  本 ADR 不重複。
- 需修訂的文件：`docs/ui/ui-layer-architecture.md`（五級表、依賴規則、術語正名 Controller、修目錄漂移）、
  `docs/ddd-design-principles.md`（移除「Application Controller」指涉 hook 的雙義）、
  `docs/development-guide.md`（「Hook 不得呼叫超過一個 Use Case」改為「單一使用者操作不得編排多個 use case」）、
  `docs/ui/ui-labeling-guideline.md`（釐清「列舉代碼」與「引用代碼常數」的差別）。
- 需遷移的既有違規：36 個 feature component 檔、18 個 page 檔，以及 `AuthProvider` 的反向依賴。
  盤點與批次清單記錄在對應的實作 issue，不進永久文件。
- 未定案而另案處理：`useAuth` 的最終歸屬（現行以「infra 的 React context 讀取器」身分列為明文例外；
  目標是 UI 自有 `AuthUser` context，使 UI 完全不必知道 Firebase 型別）。
- 契約目前仍靠人工與 review 維持；尚未有可執行測試。可行的落地方式是照 `design-contract.test.ts` 的
  allowlist 先例，以測試掃描 `src/ui/**` 的 import 並讓清單逐步歸零。
- **重新檢視的條件**：若出現「component 必須直接消費 use case 回傳值」的真實需求，代表 ViewModel 這層的
  邊界劃錯了，應先檢討邊界而不是放寬規則。
