# 退休系統設計與資料流

> 本文件描述退休計畫與現金流投影：計畫是可重複使用的假設模板，投影是凍結的計算
> 結果。決策理由見 [ADR-0083](adr/0083-projection-is-frozen-plan-is-template.md) 至
> [ADR-0089](adr/0089-delete-legacy-no-migration.md)。

資料結構的欄位清單住在 [data-structure.md](data-structure.md)，詞彙以
[CONTEXT.md](../CONTEXT.md) 為準。

## 1. 系統目標與範圍

退休功能回答一個問題：「照這組假設走到預期壽命，淨資產會怎麼變化？」答案在建立
當下凍結，之後唯讀，供日後對照同一份假設的不同起算點與期初值。

系統由兩個獨立實體組成：

- **計畫（Plan）**：可重複使用的假設模板，只裝 `assumptions`、`projectionRules`、
  `lifeEvents` 三個輸入群組，不快取任何結果。
- **投影（Projection）**：一次計算的凍結事實，建立後唯讀。結果、設定快照與基準引
  用只存在這裡。

兩者互不依賴：建立投影不需要先存計畫，刪除計畫也不影響既有投影。計算只由使用者
明確觸發，每次產生新投影，不覆寫舊的。

退休功能**不取代實際記帳**：假設與規則描述未來情境，實際分錄仍以交易與關帳流程
為準。投影的期初與規則基準取自會計資料，但計算結果不回寫任何會計集合。

新增欄位必須先進 schema，再進本文件；文件與實作分歧時以 `docs/` 為準並同步修正
兩邊。

## 2. 資料模型

兩個集合都在 household 之下：

```
households/{householdId}/retirementPlans/{planId}
households/{householdId}/projections/{projectionId}
  snapshots/config
  snapshots/source
  results/annual
```

**計畫**是單一文件，寫入路徑只有 `createPlan` 與 `updatePlan`，刪除是單一
`deleteDoc`。`birthYear` 建立後不可變；update schema 沒有 `birthYear`，其餘欄位
必須整份送出（沒有 partial 版本）。

計畫的驗證由取得時鐘的 use case 負責（`createRetirementPlanCreateSchema` /
`createRetirementPlanUpdateSchema`）；repository 不比對 schema，只搬運資料並在
寫入前擋下超過上限的 payload，讀取時以不含時鐘的 `RetirementPlanSchema` 檢查結構。

**投影**是主文件加三份固定子文件，寫入只有一個方法
`createProjectionAtomically`。主文件存名稱、`engineVersion`、建立者、建立時間與
六欄 summary；子文件分別存設定快照、基準引用與逐年結果。三份子文件都**不存**
`createdAt`，summary 與 `results` 出自同一次引擎輸出。

投影建立後沒有整份 update。唯一的例外是名稱：`renameProjectionName` 只改主文件
的 `name`，不重新計算、不動快照。刪除以 `deleteProjection` 在單一 batch 內**子先
主後**硬刪。

路徑與 delete 權限由 application 層的 use case 把關，`firestore.rules` 不為退休
集合另寫規則，沿用 `households/{id}/{allSubcollections=**}` 的 catch-all。

計畫與投影共用同一份 `900_000` bytes 上限，但分別對應 `PLAN_TOO_LARGE` 與
`PROJECTION_TOO_LARGE`。投影逐文件判定，四份文件各自不得超過上限。

## 3. 投影假設

`assumptions` 是五個必填純量，沒有 schema 預設：

| 欄位               | 型別    | 限制                                  |
| ------------------ | ------- | ------------------------------------- |
| `birthYear`        | integer | `1900 <= x <= 當下年度`；建立後不可變 |
| `retirementAge`    | integer | `1 <= x <= 120`                       |
| `lifeExpectancy`   | integer | `> retirementAge` 且 `>= currentAge`  |
| `inflationRate`    | decimal | `-0.10 .. 0.20`，最多小數 4 位        |
| `annualReturnRate` | decimal | `-0.50 .. 0.30`，最多小數 4 位        |

- 交叉檢查在 `superRefine`：`lifeExpectancy` 必須晚於退休年齡、不得早於目前年齡；
  `currentAge > 130` 另外獨立報錯。
- `currentAge` 純推導（`currentYear - birthYear`），不落庫；計畫也不存
  `currentYear`。時鐘由呼叫端注入 `createAssumptionsSchema(currentYear)`，讓文件
  在驗證當下才有「今年」。
- 允許 `birthYear === currentYear`；允許已退休（`retirementAge < currentAge`）。
- `retirementYear = birthYear + retirementAge`；
  `planEndYear = birthYear + lifeExpectancy`。
- 比率一律存小數（`0.02`），百分號只存在 UI。
- 範圍的單一來源是 `RETIREMENT_ASSUMPTION_BOUNDS`，每欄位 `{ min, max }`；
  `birthYear.max` 由 `getRetirementAssumptionBounds(currentYear)` 填成當下年度。

update schema 沿用同一組交叉檢查，但以已存的 `birthYear` 代入。既有計畫若因時間
推移變得不合法，**不夾取**，直到下一次寫入才以
`LIFE_EXPECTANCY_BEFORE_CURRENT_AGE` 等穩定 code 失敗。

讀取只做結構檢查，不跑時序交叉檢查：`birthYear.max` 在寫入時已成立、之後只會更
寬；`currentAge` 與 `lifeExpectancy` 的檢查留給「使用該計畫」的 use case，避免一筆
舊計畫讓整份清單打不開。

## 4. 投影規則與 Method

規則是陣列，每條必有 `source`（`fixedAmount` 除外）。`source` 只回答「數字從哪
來」，`ruleType` 只回答「算進收入還是支出」，兩者正交，不檢查科目前綴。

來源三選一：

- `ledgerCode`：科目淨額基準。
- `rule`：另一條規則的同年金額，用於比例。
- `debtAccount`：債務帳戶的月付金額。

Method 是判別聯集：

| method             | 參數         | 限制                                             |
| ------------------ | ------------ | ------------------------------------------------ |
| `inflation`        | `{}`         | 無                                               |
| `growthRate`       | `{ rate }`   | `-0.10 .. 0.20`，4 位小數                        |
| `percentage`       | `{ ratio }`  | `> 0` 且 `<= 2`，4 位小數；`source` 必為 `rule`  |
| `fixedAmount`      | `{ amount }` | `>= 0`；沒有 `source`                            |
| `debtAmortization` | `{}`         | `source` 必為 `debtAccount`；沒有 `endCondition` |

組合表：`income` 允許前四個，`expense` 五個全允許；沒有 `ruleType: 'debt'`。金額
一律為正，方向由 `ruleType` 決定。

`baselinePolicy` 只在 `inflation`／`growthRate` 且 `source.type !== 'rule'` 時存
在且必填，值為 `previousCompleteYear` 或 `specificYear`。`source.type = 'rule'`
時起算值就是被參照規則的當年金額，成長只套一次，因此不接受 `baselinePolicy`。

參照可跨 `ruleType`、可指向停用規則（金額視為 0）、可被多條規則共用，但不得指向
自己。懸空參照與環由 `resolveRuleGraph` 在 schema 階段就擋下。

`name` 為 `trim().min(1)`，`enabled` 預設 `true`，沒有 `note`。`id` 由
`newId()` 產生，schema 只驗 `min(1)`。

`endCondition`（`debtAmortization` 除外）四選一：

- `retirementYearExclusive`
- `specificAge`（`1..130`）
- `specificYear`（`1900..2200`）
- `lifelong`

`debtAmortization` 的結束年取自 `DebtAccount.endDate` 的年份（含該年，整年計），
只保留實際現金流出，沒有本金／利息旗標。已結清的債務仍可被參照；找不到
`DebtAccount` 才失敗。

收合後的期間完全早於投影起點時無輸出、不算錯；整段債務期間落在起點之前則產生
`DEBT_ENDED_BEFORE_START` 警告。停用規則仍參與拓撲排序，但不輸出，被參照時回
`0`。

## 5. 人生事件與 Phase

事件是沒有來源、金額由使用者自行輸入的現金流，形狀為：

```
{ id, name, type: 'income' | 'expense', enabled,
  phases: [{ name?, startYear, endYear, amount, growthRate? }] }
```

- 事件沒有 `source`、沒有 `note`；事件也不能被 `percentage` 參照。
- `name` 為 `trim().min(1)`；`enabled` 預設 `true`。
- `phases` 至少一段、無上限，必須依 `startYear` 升冪且不得重疊
  （`PHASES_NOT_SORTED`、`PHASES_OVERLAP`）。
- `phase.name` 選填，有值時 `trim().min(1)`。
- 年度皆為 `1900..2200`，`endYear >= startYear`。
- `amount >= 0`；`growthRate` 為 `-0.10 .. 0.20`、最多 4 位小數，缺省時跟隨計畫
  通膨率。
- Phase 允許跨越退休年；是否落在投影期內由解析期判定。
- 事件 id 與規則 id 不檢查跨群組碰撞。

事件與規則的分界就是來源的有無；同一筆現金流只能落在其中一側，避免重複計入。

## 6. 基準解析與錯誤語意

`resolveProjectionInput` 是純函式，位於 `src/domains/retirement/`，不碰
Firestore；來源資料由呼叫端備妥後傳入。它依規則圖的拓撲順序逐條展開，直接產出引
擎輸入，不建立中間表示。

**期初餘額**：

- `source = 'derived'`：取最新 `CLOSED` 期間的 `BALANCE_SHEET` 淨資產
  （`assets.total - liabilities.total`），`yearMonth` 由新到舊取第一筆，並把該月
  存進 `anchorYearMonth`。
- `source = 'manual'`：整數元、可為負，**不存** `anchorYearMonth`；可完全繞過
  「沒有已關帳期間」的限制。
- 期初每次計算重新解析，不凍結進計畫。重開關帳使某月不再是 `CLOSED` 時跳過該
  月、改取更早期間，並觸發 `BASELINE_BEHIND`。
- 「用報表值」一鍵重設只改 `source` 與 `amount`。

從既有投影預填工作區時，`derived` 期初**重新解析**，不複製投影凍結的快照值；解
析不到（當下沒有 `CLOSED` 期間）就把期初留空並顯示警告，不退回舊值。

**規則基準**以 `source.id` 為鍵，取該年 `(credit − debit)` 的**淨額絕對值**。沒有
分錄即 `MISSING_BASELINE`，不降級為 0。`baselineYear` 取該規則自己的基準年度
（`specificYear` 用設定值，其餘用 `previousCompleteYear = startYear − 1`）；**不往
回找有分錄的年度**，該年沒有分錄就是 `MISSING_BASELINE`。
`specificYear <= startYear − 1` 只在 config 階段驗證。多條規則可共用同一科目：每
條規則各自解析自己的基準年度，同科目的各年度淨額互不覆蓋。

**錯誤與警告共用 `ProjectionResolveError` 型別與同一個陣列**，以 `severity` 區
分。錯誤讓整次解析失敗、不落庫；警告只呈現，不阻擋儲存。

錯誤碼：

- `CYCLE`（`params.ruleIds` 含完整環路徑）
- `DANGLING_REFERENCE`（`params.ruleId`、`targetId`）
- `MISSING_LEDGER_CODE`
- `MISSING_DEBT_ACCOUNT`
- `MISSING_BASELINE`（`params.kind: 'opening' | 'rule'`）

警告碼：

- `BASELINE_BEHIND`（基準年度早於 `previousCompleteYear`）
- `BASELINE_AFTER_START`（基準年度晚於 `previousCompleteYear`）
- `DEBT_ENDED_BEFORE_START`（`params.ruleId`、`debtAccountId`、`endYear`）

`DISABLED_REFERENCE` 保留在型別裡，但現行規則不會產生——指向停用規則是合法的，
回 `0`。`startYear` 只存在 config，預設建立當下年度，寫入快照後即為事實。

所有錯誤一次收集後回傳，使用者不必修一輪重算一輪。解析端不處理破產。

## 7. 投影引擎與輸出

`calculateProjection` 是同步、純的函式，只認數字與年份，不認識 Method、來源或
Firestore，也不呼叫時鐘。輸入不變量（整數、連續年度、非負金額、
`firstYear <= lastYear`）違反時丟 `RangeError`；呼叫端在寫入前已完成驗證，引擎不
重算、不排序、也不防禦。

輸入：

```
ProjectionInput {
  firstYear, lastYear, retirementYear, birthYear
  openingNetWorth, annualReturnRate
  years: Array<{ year, inflows, outflows }>
}
```

`birthYear` 僅用於輸出 `age = year - birthYear`，引擎不從它推導
`retirementYear`（由呼叫端算好傳入）；少了它，輸出就無從標示年齡。

金額項目為 `{ sourceRef, label, origin: 'rule' | 'event', amount }`，一律為正。

每年依序計算：

```
return   = opening * annualReturnRate   // 期初基數
closing  = opening + inflows − outflows + return
```

破產後**繼續算到期滿**，負餘額照套報酬，不歸零、不停止。過程不捨入，輸出四捨五
入到整數元；負零正規化為 0。最後一年也以整年計。

輸出：

```
ProjectionResult {
  years: Array<{ year, age, isRetired, opening, return, inflows, outflows, closing }>
  summary: { retirementNetWorth, finalNetWorth, minNetWorth, minNetWorthYear,
             bankruptcyYear, isBankrupt }
}
```

- `retirementNetWorth` 是退休年的 `opening`；退休年早於 `firstYear` 時取
  `firstYear` 的 `opening`，晚於 `lastYear` 時為 `null`。
- `minNetWorth`／`minNetWorthYear` 掃描全期；空輸入時 `minNetWorth` 等於
  `openingNetWorth`、年份為 `null`。
- `bankruptcyYear` 是第一個 `closing < 0` 的年份，可為 `null`；
  `isBankrupt = bankruptcyYear !== null`。
- 三個可缺值欄位為 `number | null`，不以 `0` 當缺值。
- `isRetired = year >= retirementYear`。
- `years` 與 `summary` 同一次回傳；不公開 `summarize`。空 `years` 合法。

引擎導出 `ENGINE_VERSION`，只在輸出語意改變時遞增；已存投影的版本低於現行值即視
為過舊，只在檢視時提示，不自動重算。

## 8. 投影工作區與唯讀檢視

路由：

| 路徑                          | 內容                                             |
| ----------------------------- | ------------------------------------------------ |
| `/retirement`                 | projection 清單                                  |
| `/retirement/new`             | 工作區，直接進 `setup`                           |
| `/retirement/projections/:id` | 唯讀檢視                                         |
| `/retirement/plans`           | plan 清單                                        |
| `/retirement/plans/:id`       | plan 唯讀檢視（名稱可改、內容唯讀、Danger Zone） |

工作區在**單一路由**內走 `setup` → `preview` 兩階段，換階段不換路由，草稿共用同
一份記憶體。階段以既有步驟列樣式呈現。

- `CALCULATE` 是 `setup` 的唯一前進動作：先以共用 plan schema 驗證三群組與期初，
  失敗時一次露出全部行內錯誤且不換階段；通過後才跑解析與引擎。
- 計算**不**落地；只有儲存 dialog 的 `SAVE` 才寫 Firestore。
- 預覽階段輸入唯讀，只能 `BACK TO SETUP`（secondary）或 `SAVE`（primary）。
  `BACK TO SETUP` 只丟棄結果，不動草稿。
- 解析錯誤全數列出且不落庫；警告列在結果區上方，不阻擋儲存。
- 任何編輯都算 dirty（含計算後再改）；預覽離開也攔。站內用 router blocker、重新
  整理用 `beforeunload`，兩者都走 `useConfirm` 的語意。
- 規則與事件是兩個獨立清單，不提供「新增後再切換類型」。`phase.name` 缺省時以年
  度區間顯示。結果區未計算時顯示空狀態，不佔位。

儲存 dialog 只有名稱與 `SAVE`／`Cancel`：名稱依序預填上次儲存值、套用的 plan 名
稱，皆無時預填 `Projection <YYYY-MM-DD HH:mm>`（本地時間）；不可留空；儲存中停在
dialog、按鈕 loading、`Esc` 與背景點擊無效；失敗在原處顯示錯誤與 `RETRY`。成功關
閉、留在預覽、顯示成功提示與前往檢視頁連結，並以剛用的名稱預填下一次。

工作區 header 是 `APPLY PLAN` 與目前停用的 `SAVE AS PLAN`。`APPLY PLAN` 必跳確
認（`Replace current setup?`），套用後三群組全部來自 plan、名稱帶入 plan 名稱、
與 plan 脫鉤、工作區轉 dirty；已有預覽時套用會清掉預覽並回 `setup`。

檢視頁整頁唯讀，唯一例外是 `name` 的 `InlineEditableTitle`（PageHeader title
slot）。`SAVE AS PLAN` 在 header，dialog 預填投影名稱、可改、不可空，成功建立新
plan。Delete 在頁尾 Danger Zone，成功導向 `/retirement`。三個 tab 為 `SUMMARY`
（預設，六個指標＋淨資產軌跡）、`PROJECTION`（現金流圖＋逐年明細）、`SOURCE`（基
準引用＋快照設定）；tab 狀態不進 URL，切換時卸載未顯示分頁，`md` 以下可橫向捲
動。`engineVersion` 過舊時在 header 下方顯示 inline warning 與 `RECALCULATE`，導
向 `/retirement/new?from=<id>`；工作區讀 `snapshots/config` 預載、載完以 `replace`
清掉 query、預載後即為 dirty。

清單三態固定：載入用 Skeleton、失敗用 warning Alert 加重試、找不到用空狀態加回清
單。投影清單欄位為名稱（附破產 `error`／過舊 `review` glyph）／建立時間／退休年
淨資產／期末淨資產，`createdAt` 降冪，`null` 顯示破折號；plan 清單為名稱／最後更
新，`updatedAt` 降冪。兩者都是單欄排序，不新增索引。

## 9. 備份與還原

備份格式為 `schemaVersion: 2`；`1` 直接拒絕，沒有相容分支。

- `collections.retirementPlans` 是 `unknown[]`，整份原樣進出。
- `collections.projections` 是 `Array<{ projection, config, source, annual }>`，三
  份固定子文件用明確鍵，不靠子集合遞迴。
- 還原沿用備份內原 id，不加 `sourceId`；四個 audit 欄位一律沿用備份值。
- 還原不重算；`engineVersion` 過舊只在檢視時提示。
- 覆蓋式還原的刪除清單包含 projection，順序為子先主後。plan 與 projection 無依
  賴，沿用現有集合順序。

投影的四份文件一起進出，缺任何一份即為不完整備份，由 payload schema 擋下。

## 10. 驗證重點

驗證分三層，只在兩個寫入邊界（存 plan、建立投影）共用同一份 schema：

| 層            | 負責                                                                  |
| ------------- | --------------------------------------------------------------------- |
| Domain schema | 形狀、參數範圍、method × ruleType 組合、參照存在性、環、`superRefine` |
| Application   | `ledgerCode` 存在性（錯誤指向 `source.id`）、文件大小、batch 原子性   |
| 引擎          | 只驗輸入不變量（`RangeError`）                                        |

必測清單：

- assumptions 邊界與三組交叉檢查；`birthYear` 不可變。
- method × ruleType 組合表；`baselinePolicy` 的存在與禁止條件。
- `resolveRuleGraph` 的環、自我參照與懸空參照，含停用規則。
- 引擎：期初基數、破產續算不歸零、三個 `null` 哨兵、空輸入、退休年落在期外的三
  個分支。
- 解析：全部錯誤一次收集；`MISSING_BASELINE` 的 `kind` 區分；警告與結果並存。
- 原子性：batch 失敗不留任何文件；`PROJECTION_TOO_LARGE` 逐文件判定、
  `PLAN_TOO_LARGE` 於 plan 寫入；`PROJECTION_WRITE_FAILED` 後以新 id 重試。
- `DEBT_ENDED_BEFORE_START` 只在債務期間整段落在期前時出現、不阻擋落庫。
- 規則矩陣：admin 可 create／delete，admin 不可更新投影內容（repository 只有
  `renameProjectionName`，沒有整份 update），member 不可 create。
- 名稱必填、儲存 dialog 的 loading／失敗重試／成功連結與重新預填；dirty 攔截的站
  內與 `beforeunload` 兩條路徑。
- `?from=` 載入成功後從 URL 消失；來源已刪時落回空白並示警。
- 兩個清單的欄位與排序；破產／過舊 glyph 只在名稱欄旁。
- 備份 round-trip 與 `schemaVersion: 1` 被拒。
