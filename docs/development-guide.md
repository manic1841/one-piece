# 開發指南 (Development Guide)

本文件是**準則與基本規範**：新增功能的流程、程式碼風格、文件責任歸屬、決策層級與
UI 變更規則。指令與部署見 [operations.md](operations.md)；各功能怎麼運作住在那個功能的
文件裡，本文件不複述。

## 1. 新增功能的標準流程

### 第一步：讀設計，再讀程式碼

- 先讀 `docs/` 裡與該功能相關的設計文件與 ADR，再動手。
- 行為與文件衝突時，以 `docs/` 為準並在同一個 task 內修正實作或文件。

### 第二步：定義領域模型 (Domain Layer)

- 在 `src/domains/{domain_name}/` 建立 `schemas.ts` 與 `types.ts`。
- **嚴禁**在 `src/infra/` 底下另立 schema 目錄定義業務類型。

### 第三步：實作存取層 (Infrastructure Layer)

- 在 `src/infra/repositories/` 建立 Repository。
- 一般 CRUD Repository 應繼承 `BaseRepository`，並引用 **Domain Layer** 定義的 Schema。
- 若資料需要專用的 operation schema、server timestamp 或 Firestore transaction
  讀寫封裝，可以使用明確的 custom Repository；仍須把資料契約放在 Domain
  Layer，並讓 transaction context 由 Application Use Case 傳入。

### 第四步：建立原子使用案例 (Application Use Cases)

- 在 `src/application/{domain_name}/use_cases/` 建立單一職責的操作。
- 複雜的校驗邏輯應放進 **Domain Service**。

### 第五步：建立控制器 (Controller Hook)

- 在 `src/ui/features/{feature_name}/hooks/` 建立 Hook。
- Hook 職責：管理 UI 狀態（含表單狀態）、注入 `AuthContext`、呼叫 Use Case。
- 讀寫分離：寫入放 Command（`*Cmds`），讀取放 Query 或 Controller；`*Cmds` 內不得出現讀取。
- 層級與可觸碰清單見 [`ui/ui-layer-architecture.md`](ui/ui-layer-architecture.md)。

### 第六步：建立 UI Form ViewModel 與 Mapper (UI Layer)

- 在 `src/ui/features/{feature_name}/viewmodels/` 建立表單 VM Schema（Zod）。
- 定義 `mapXxxVMToDomain`，集中處理字串/日期/數值轉換。
- 規則：Component 與 Hook 不得直接組裝 Domain payload。

### 第七步：實作 UI 組件

- 呼叫 Hook 並渲染畫面。
- Component 與 Page（Surface）不得 import `@/domains`、`@/application`、`@/infra`，**連型別也不行**；需要 domain 形狀時由 ViewModel 轉出（ADR-0062）。
- 提交路徑必須經過 `Schema.parse -> Mapper -> UseCase`。

## 2. 代碼風格要求

- **不要直接呼叫 Repository**: 除非是極其簡單的讀取，否則應透過 Use Case 排列組合業務邏輯。
- **編排規則**: 單一使用者操作不得編排多個 Use Case——多步流程屬 Workflow（如月度關帳），住在 application 層。一個 Hook 檔提供多個 Use Case 作為操作選單不算編排，是允許的。
- **嚴格型別**: 正式程式碼絕對禁止使用 `any`。測試檔為了建立 mock 或 fixture，已由 ESLint 測試檔規則放寬 `no-explicit-any`；能使用 `unknown`、具體型別或 typed helper 時仍應優先使用。
- **單一職責**: 一個 Use Case 文件只做一件事（例如：`createTransactionUseCase.ts` 只負責建立交易）。
- **表單一致性**: 表單資料必須先映射到 ViewModel，再由 mapper 轉換成 domain 型別。
- **驗證一致性**: 所有新表單路徑統一採用 Zod schema，禁止分散式手寫驗證。
- **格式一致性**: Prettier 是格式與 import 排序的單一真相來源，設定在 `.prettierrc`；不手動維護排序。commit 前跑 `pnpm format`。

## 3. 文件規範

### 3.1 一條事實只有一個家

文件不是程式碼的鏡子。**程式碼能表達的事實不寫進文件**，文件只寫程式碼表達不了的
那部分。判斷法：**拿掉這個值或識別字，這句話還講得通嗎？** 講得通就是實作細節。

| 內容                                 | 唯一的家                          |
| ------------------------------------ | --------------------------------- |
| 這個詞在系統裡精確指什麼             | `CONTEXT.md`                      |
| 當初為什麼這樣決定、被推翻的取捨     | `docs/adr/`                       |
| 行為契約：不變式、錯誤語意、邊界語意 | 該功能的主題文件                  |
| 功能的大方向與範圍                   | 該功能的主題文件（開頭段落）      |
| 欄位、enum、數值範圍、識別字、路徑   | 程式碼（`src/domains/<domain>/`） |
| 驗收                                 | 測試（測試名稱即紀錄）            |
| 怎麼跑、怎麼驗、怎麼部署             | `operations.md`                   |
| 怎麼操作、怎麼除錯                   | `testing.md`、`qa-faq.md`         |
| 這個 repo 的 agent 怎麼運作          | `docs/agents/`、`AGENTS.md`       |
| 這是什麼、怎麼啟動                   | `README.md`（路標，不是內容）     |

主題文件留在文件裡的，只有**測試看不出意圖**的少量語意——例如某條規則存在的理由、
兩層才成立的邊界、使用者看得到的失敗方式。可以從 code 直接讀到的形狀一律留給 code。

**禁止**：同一條事實同時寫在兩處。若兩處都有，選定歸屬後刪掉另一處，不要「先並存
之後再說」。

### 3.2 spec 住 issue tracker

- 設計討論期的 spec、實作計畫、決策草稿都住在 GitHub issue，不進 repo。
- 功能落地時，在同一個 task 內拆成三份：決策進 `docs/adr/`、行為與結構進主題文件、
  驗收進測試，然後在 issue 註明落地 PR 並關閉。spec 不留副本。
- 決策若還沒被壓力測試過（術語、邊界、例外沒被質疑），先問一句「這個決定還沒被
  grill 過，要照現況記錄嗎？」再寫 ADR。
- ADR 只在**難以回復、沒有上下文會意外、且真的存在取捨**三者同時成立時才寫。格式見
  `.agents/skills/domain-modeling/ADR-FORMAT.md`。
- ADR 只記「為什麼」，規範來源用一行指標指向主題文件；細節未搬進歸屬文件前不得從
  ADR 刪除（先加後刪）。

### 3.3 原型

原型是為了回答一個問題而生的可丟棄產物，只在「不跑起來就不知道答案」時建立。建立
與捕獲流程見 `.agents/skills/prototype/`；捕獲時把驗證過的決策併入正式程式碼，原型本
體 commit 到自 `main` 切出、永不併回的 throwaway 分支，並在實作 issue 留下指向該分支
的 pointer 與 verdict。同一份 spec 只有一條原型分支。

### 3.4 維護

- **決策與事實分開更新**：改架構或取捨 → 新增／修訂 ADR；改規則、結構或流程 → 更新
  該事實的歸屬文件。
- **數值衝突裁決**：兩份文件對同一事實給出不同數值時，以該事實歸屬文件中最新的實測
  值為準，並在同一個 task 內修掉另一處（含 ADR 的歷史敘述）。
- **保持 `docs/` 的準確性**：主題文件說明現在如何運作；`docs:check` 會擋下失效的相對
  連結、暫置路徑，以及從儲存庫頂層起算卻不存在的 `backtick` 路徑（`src/…`、`docs/…`、
  根目錄檔名）。刻意保留的歷史路徑在該行加 `<!-- docs:check-ignore -->`。
- **效能考量**：避免在前端進行超大規模的資料處理與循環引用。

### 3.5 新增文件前的三個測試

1. **這個問題已經有文件在回答嗎？** 有就補進去，不要新開檔案。
2. **這個內容會隨程式碼變動而過期嗎？** 會就屬於程式碼旁或自動產生的文件。
3. **這是「決定」還是「事實」？** 決定 → ADR；事實 → 主題文件或 `CONTEXT.md`。

## 4. 設計決策層級與變更流程

呈現層的改動依「這是不是一個已確認的決策」分三級；層級決定改動前是否需要先取得同意。

- **DESIGN DECISION（設計決策）**：已確認的產品或 UI 決策。**AI agent 與開發者不得在取得明確同意前變更**。
- **DESIGN GUIDELINE（設計準則）**：設計原則。必要時可依情境調整，但調整後的實作必須與整體設計語言一致。
- **IMPLEMENTATION DETAIL（實作細節）**：工程實作選擇。可在不影響使用者可見設計的前提下自由變更。

判斷順序：先問「這是決策、準則，還是細節？」——決策需要事前同意，準則需要維持一致，細節則不受此限。

引入任何新模式（新元件、新視覺樣式、新互動）之前，先依序回答六個問題：

1. 既有元件是否已經解決這個需求？
2. 這是否符合 ONE PIECE 的視覺語言？
3. 這是否改善資訊層級？
4. 這是否降低認知負擔？
5. 這是否引入不必要的裝飾？
6. 這是否重複既有的財務概念？

若答案不明確，優先採用既有模式，而不是引入新模式。

## 5. UI 變更的 AI 規則

AI agent 修改或建立任何 UI 時，**必須**遵守：

1. 先讀 `docs/ui/` 下的呈現層文件，再動手。
2. 新畫面開發一律先照 `/gallery` 路由的對應 section 實作（gallery 是全站視覺規範樣板，見 [`ui/component-catalog.md`](ui/component-catalog.md) 規則節），不用自製實作。
3. 重用既有的 design token。
4. 盡可能重用既有元件。
5. 不在沒有正當理由的情況下引入新顏色。
6. 不引入新的字體排印。
7. 不使用大型圓角卡片。
8. 不使用裝飾性漸層。單色、取自序列自身顏色、且以線為基線的資料歸屬漸層除外（[ADR-0078](adr/0078-single-colour-data-affiliation-gradient.md)）。
9. 維持既有的資訊層級。
10. 維持既有的導航決策。
11. 維持財務資料的語意。
12. 不重複財務資料的輸入流程。
13. 優先採用可推導的值，而非要求使用者重複輸入。
14. 將 Monthly Close 視為 workflow。
15. 將 Navigator 視為獨立的導航層。
16. Pixel Pet 的行為與其最終美術素材保持獨立。

契約層面的細節（token、顏色、字體排印、圓角、漸層、元件表面）以 `docs/ui/` 為準；
本節只規範 AI agent 的義務。

## 6. 頁面級視覺 review 的掃描方法論

頁面級視覺 review 的價值在於**可重複的程序**：拿一份已落地的呈現層標準，逐節對照實際
UI，產出一份 gap inventory。當次的掃描結果是一次性證據，程序本身才是永久資產。

### 程序

1. **選定標準**：挑一份已落地的呈現層契約（例如 `docs/ui/` 下的標準文件）。
2. **逐節機械式掃描**：對標準的每一節，機械式對照 `src/ui/**` 原始碼與 `src/App.tsx` 的路由清單，列出明顯落差（硬編碼值、缺席的契約、錯誤的元件用法）。
3. **上下文抽查**：對掃描命中的每一點人工查核，排除誤判，並補上靜態掃描看不到的落差（runtime 行為、閱讀順序、行動版退化）。
4. **產出 gap inventory**：先列「已合規面」再列「落差清單」，避免只呈現問題、讓讀者無從判斷整體健康度。

### 每筆 finding 的記法

至少記錄：檔案與行號、違反標準的哪一節、落差類型，以及**裁決**：

- **resolved**：已修正——記下修正日期與對應 issue。
- **record-only**：維持現狀——記下理由（例如標準明文允許的例外）。
- **fix + 追蹤**：需修但不在當次範圍——開追蹤 issue 並記錄編號。

### 邊界

- **證據一次性、方法可重複**：當次掃描的結果不進正式文件；正式文件只保留本節的程序。
- **文件複述會變的值視為落差**：文件手寫了會隨程式碼變動的值或識別字時，記為落差並依
  §3.1 處理。
- 裁決若牽涉跨文件的數值衝突，依 §3.4 處理。

## 7. 指令與部署

驗證命令、CI/CD、Docker、部署與 release 流程見 [operations.md](operations.md)。
