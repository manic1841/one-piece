# 歷史財務分析 (Financial Analysis)

`/reports/analysis` 是報表的分析子頁，只讀**已產生報表**與既有 portfolio snapshot，提供
跨期間的淨資產、資產類別、投資績效、收支、淨現金流、負債槓桿與現金覆蓋觀察。路由與錨定的決策理由見
[ADR-0090](adr/0090-report-analysis-single-route-and-anchor.md)；報表本身的語意見
[financial_report.md](financial_report.md)。

## 1. 分析錨點

分析頁錨定**最新且有資產負債表報表的期間，不論狀態**。範圍終點固定在錨點，不回推今天。

這與儀表板錨定最新已關帳月份刻意不同：儀表板是現況頁，分析頁是證據頁。錨點非已關帳時，
摘要句與 KPI 期間旁標示未關帳，頁面以資料截止列揭露日期與未關帳月份，區塊標題的值也加
「（未關帳）」。取捨見 [ADR-0053](adr/0053-dashboard-report-anchored.md) 與 ADR-0090。

沒有同月損益表時，儲蓄率顯示「—」，不往前找。完全沒有任何資產負債表時，整頁顯示空狀態。

報表中心 landing 的四格財務摘要共用同一條錨點規則，但只讀報表與財務期間，不讀
portfolio／snapshot，也不組其餘六條序列；錨點解析與 KPI 口徑由兩個 workflow 共用。

頁面第一行是摘要句，先把結論講完再看圖：選取期淨資產、較上期變化率、儲蓄率、負債比；
缺項略過，上一期淨資產為 0 時不算變化率。

## 1a. 選取期間

預設選取錨點。點選圖上任一期間（或鍵盤 Enter／空白鍵）即改選該期，並寫入 `?period=`；
選取是整頁共用狀態，所有圖表標記同一點，區塊標題與摘要句跟著它。`?period=` 無效時回到錨點。
選取**不導覽**；「查看完整報表」才進入該期報表，返回時選取與範圍仍在網址裡。

未關帳期間在摘要列標「暫估」，tooltip 標題加「（未關帳）」。沒有該期資料的區塊在摘要列顯示
「—」，區塊標題不顯示值。

## 1b. 資料粒度

粒度分 `月`（預設）與 `年`，寫入 `?granularity=`，切換時清除 `?period=`。只有單一年度時控制
隱藏，但 annual 深連結仍可進入。年度是同一份月資料的聚合，不改變可畫期間或範圍：

- 存量（淨資產、資產類別構成、負債與槓桿）取該年**最後一個月**的值；年度期間若任一月未關帳，
  整年視為暫估。
- 流量（收支、淨現金流）取年度加總；儲蓄率由年度加總重算。
- 投資績效的報酬金額為年度加總，報酬率為加總報酬 ÷ 該年第一個月期初市值。
- 下鑽目標為年度報表（`/reports/YYYY`），與報表歷史的年粒度一致。

彙總由 `rollUpFinancialAnalysisUseCase` 完成，workflow 的 `rollUp` 是入口（分組與年份鍵規則在
`src/domains/report/annualRollup.ts`）；切換粒度不重新讀取。錨點、KPI 與未關帳月份清單維持月尺度。

## 2. 可畫期間

可畫期間是任何有該區塊所需報表型別的已產生報表月份，**不檢查財務期間狀態**。各區塊各自
只取有對應報表型別的月份：

| 區塊         | 報表型別                                      |
| ------------ | --------------------------------------------- |
| 淨資產       | 資產負債表                                    |
| 資產類別構成 | 資產負債表（僅 `assets.total > 0`）           |
| 投資績效     | 資產負債表 ∩ 每個 portfolio 當月 snapshot     |
| 收支         | 損益表                                        |
| 淨現金流     | 現金流量表                                    |
| 負債與槓桿   | 資產負債表（僅 `assets.total > 0`）           |
| 現金覆蓋     | 資產負債表；缺三期損益表 window 時值為 `null` |

只有 snapshot 的月份不畫；投資績效與負債槓桿的 snapshot 由既有 list-all 讀取後在
workflow 內依範圍過濾，不改 repository。月彙總、snapshot 完整度與近三月現金覆蓋
window 由 workflow 編排、純函式只算值。

缺月份自軸省略、不補 0；軸僅由有報表的月份構成。區塊在目前範圍內可畫期間少於 2 期時顯示
「此範圍內不足 2 期」。

## 3. 指標

- **淨資產** ＝ 資產負債表資產總計 − 負債總計。
- **儲蓄率** ＝ (損益表 `incomeTotal` − `expenseTotal`) ÷ `incomeTotal`，顯示一位小數百分比。
  `incomeTotal <= 0` 時為 `null`；負儲蓄率正常呈現為負值。口徑是應計基礎，不等於現金流。
- **淨現金流** ＝ 現金流量表 `netCashChange`，以現金為基礎，正值與負值分別向上與向下。

## 4. 範圍

範圍以 replace 更新，終點固定錨點。依可用月份數去除產生相同結果的選項；有效選項只剩一個
時整條範圍控制隱藏。

## 5. 未關帳

範圍內的未關帳月份是暫定資料。圖上與範圍下方的標示方式見
[visual-standards.md](ui/visual-standards.md) 的 Analysis View；未關帳提示不使用 `Alert`，
`Alert` 只保留給載入錯誤。

## 6. 空值與狀態

KPI 缺對應報表時顯示「—」；資產或負債為 0 仍是合法序列。載入為各區塊 Skeleton、錯誤為
頂部 warning alert 與重試、空為共用空狀態。圖表 tooltip 只列目前可見序列，被關閉的序列不
進 tooltip、不影響軸範圍。tooltip 內容以語義模式宣告層級：`hero` 明確指定唯一主要值（輔助值不因
主要序列被隱藏而升格，主值缺席時顯示「—」），`list` 讓所有項目同層（資產類別構成）。

## 7. 資產類別構成

回答「資產以什麼形式持有」，與按標的看的持倉配置是兩個視角。

- 三條固定序列直接映射資產負債表的現金（`assets.groups.cash`）、投資
  （`assets.groups.investment`）與不動產（`assets.groups.property`）群 `total`。
- 分母固定 `assets.total`，由 workflow 隨點帶出；佔比在 UI 以 `群 total ÷ assets.total ×
100` 計算，不重算分母。
- 圖例切換只影響可見性，**不重新歸一化**；可見序列的佔比因此可能合計不到 100%。
- `assets.total > 0` 才收；為 0 的月份視同缺月。群值可為負，照原值堆疊。
- 100% 堆疊面積、y 軸固定 0–100。序列使用類別色板（`chart-1`／`chart-4`／`chart-3`），
  不佔用語意 tone。

## 8. 投資績效

- 每點 `{ yearMonth, gain, openingValue, returnRate }`；`gain` 與 `openingValue` 為所有
  portfolio 在該月的加總，`returnRate = gain ÷ openingValue × 100`，`openingValue <= 0` 時
  為 `null`。
- 口徑是家庭層「加總後相除」，不是各 portfolio 報酬率的平均。
- 只收同時有當月資產負債表、且**每個** portfolio 都有當月 snapshot 的月份；部分 portfolio
  缺 snapshot 時家庭加總會偏低，因此該月不收。完全沒有 snapshot 的 portfolio（剛建立）不計入
  這個交集，否則它會清空整段序列。
- `gain`／`openingValue` 取自 snapshot 的 modified-Dietz 報酬，**已排除期間現金流**，因此
  家庭加總不會被存入或提出放大。
- 上層報酬金額柱（正負分向）、下層報酬率折線（零基準、`null` 斷線）。

## 9. 負債與槓桿

- 每點 `{ yearMonth, liabilities, assetsTotal, debtRatio, leverage }`；可畫期間為
  `assets.total > 0` 的資產負債表月份，負債為 0 仍是合法點。
- `debtRatio = liabilities ÷ assetsTotal × 100`；`assetsTotal <= 0` 時為 `null`（實務上
  已被可畫期間的 filter 排除）。
- `leverage` 是家庭持倉以市值加權的 `Σ(marketValue × leverage ?? 1) ÷ ΣmarketValue`；該月
  無 snapshot、snapshot 不完整（部分 portfolio 缺）或 `ΣmarketValue <= 0` 時為 `null`，
  只斷槓桿線。不完整的月份不套用部分加總，避免低估曝險。
- 兩個比率意義不同：負債比是存量槓桿，加權平均槓桿是持倉曝險倍數，不得互相換算。
- 槓桿層只在目前範圍任一點 `leverage > 1` 時出現；否則不渲染該層，改在區塊底部說明
  「此範圍內持倉無槓桿」。

## 10. 現金覆蓋

回答「如果停下來能撐多久」，是全頁唯一的合成指標，也是最後一節。

- 每點 `{ yearMonth, cash, expenseAverage, coverageMonths }`；`cash` 為當期資產負債表
  `assets.groups.cash.total`（含定存，缺席視為 0）。
- `expenseAverage` 為當月與前兩期 `expenseTotal` 的平均；`coverageMonths = cash ÷
expenseAverage`，`expenseAverage <= 0` 時為 `null`。
- 任一期缺損益表時 `expenseAverage` 與 `coverageMonths` 皆為 `null`，該點斷線但仍留在軸上，
  不以「有幾期算幾期」補償。
- window 可由選取範圍外的既有損益表補齊；範圍只決定顯示軸。
- 可畫期間為任何資產負債表月份，不要求 `assets.total > 0`；覆蓋 0 個月是合法值。
- 非 `null` 點數少於 2 期時整區顯示「此範圍內不足 2 期」。年粒度取該年最後一個月的值。
- 標題小字為 `YYYY-MM · X 個月`，tooltip 依序列覆蓋月數（一位小數）、現金與近三月平均支出；
  底部固定公式註記。
