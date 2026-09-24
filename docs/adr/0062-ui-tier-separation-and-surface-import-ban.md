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
3. **Controller**（`features/*/hooks`、`hooks`、`contexts`、`features/*/contexts`）：唯一可呼叫 use case / workflow 的層。
   不得 import repository，**也不得 import `@/infra`——沒有任何例外**。React context 是 Controller 範圍內的
   **機制**（比照 `useLoadingTask` 的定位），不是第六個層級：它持有狀態並呼叫 use case，但與所有 UI 檔案一樣
   碰不到 infra 實作。
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
- **讓 infra 的 provider 直接 import UI 的 context**。否決理由：這會把 infra → UI 依賴加回來，抵銷
  「infra 不得 import UI」這條不變式；要的是依賴反轉，不是把箭頭反向。
- **新增 `src/shared/` 作為跨層契約層**。否決理由：`shared` 在文件中沒有角色定義、也沒有守門，卻已有 18 個
  importer；跨層契約放 domain 更安全——domain 本來就負責定義 Contracts，且既有分層已被測試覆蓋。

同時新增三條**架構不變式**：

- **infra 不得 import UI**。需要 gating 的失敗狀態以**資料**回報，顯示判斷留在 UI 端。
- **UI 不得 import `@/infra`**——任何層級、連型別也不行。需要 infra 能力時，由 domain 宣告埠、infra 實作埠、
  composition root 注入。
- **`src/App.tsx` 是唯一的 composition root**：唯一允許跨層的檔案（同時 import infra 與 UI）。其餘 `src/` 頂層
  檔與 Surface 受同一套禁令。

第一個套用這組規則的是認證狀態：`domain/auth` 宣告 `AuthUser`（`{ uid, email }`）與 `AuthGateway` 契約，
infra 只實作 gateway（Firebase 全部關在那一個檔內），`App.tsx` 把實作注入 UI 自有的 `AuthStateProvider`。
UI 因此完全不必知道 Firebase 型別，`useAuth` 例外隨之消滅。伴隨的兩個劃分一併定案：

- `AuthUser`（身分，同步）與 `UserProfile`（家庭紀錄，非同步）是**兩個獨立可為 null 的物件**——登入狀態無法由
  domain 推導，只能由 infra 觀測、UI 呈現。
- 權限的主體分屬不同模組：app 層白名單與使用者的認證身分屬 `auth`；家庭角色屬 `household`。

## 影響

- 規範性細節（層級表格、可觸碰清單、目錄結構、呼叫方向）住在 `docs/ui/ui-layer-architecture.md`，
  本 ADR 不重複。
- 需修訂的文件：`docs/ui/ui-layer-architecture.md`（五級表、依賴規則、術語正名 Controller、修目錄漂移）、
  `docs/ddd-design-principles.md`（移除「Application Controller」指涉 hook 的雙義）、
  `docs/development-guide.md`（「Hook 不得呼叫超過一個 Use Case」改為「單一使用者操作不得編排多個 use case」）、
  `docs/ui/ui-labeling-guideline.md`（釐清「列舉代碼」與「引用代碼常數」的差別）。
- 需遷移的既有違規：36 個 feature component 檔、18 個 page 檔，以及 `AuthProvider` 的反向依賴。
  盤點與批次清單記錄在對應的實作 issue，不進永久文件。
- 契約由 `src/ui/layer-boundary.test.ts` 執行：掃描 `src/ui/**` 與 `src/` 頂層檔的 import 並解析成路徑，
  逐條驗證上列規則。既有違規以 allowlist 列出並**要求雙向集合相等**——修好一個檔案就得刪掉它的條目，
  過期條目同樣會讓測試失敗，因此清單只會縮小。
- **重新檢視的條件**：若出現「component 必須直接消費 use case 回傳值」的真實需求，代表 ViewModel 這層的
  邊界劃錯了，應先檢討邊界而不是放寬規則。
