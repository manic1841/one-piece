# 顏色分兩層：語意 tone 與 `--chart-*` 類別色板

**日期：** 2026-10-06
**狀態：** 已實作
**規範來源：** [ui/design-system.md](../ui/design-system.md) §1；[ui/visual-standards.md](../ui/visual-standards.md) 核心設計原則 4

One-Piece 的既有契約是「**Color communicates state**」——顏色只在有語意時使用（收入綠、支出紅、警示黃、accent 表當前趨勢）。但同一類別的並列拆解圖（donut：資產組成、持倉配置、未來支出組成）需要**區分同層級的多個分類**，這些分類之間沒有正負或優劣語意，用語意色無法表達。兩者混用會逼出錯誤選擇：拿 `positive` 綠當某個分類色，會讓該分類看起來像「收入」。

因此顏色分兩層。**① Semantic Tone** 表達「資料的意義」，走 `CHART_TONE_COLOR`（`positive`/`negative`/`warning`/`primary`/`neutral`/`investment`/`asset`），用於線圖、柱圖、金額與狀態；**② `--chart-*` 類別色板**表達「分類之間的差異」，用於同類別並列拆解圖，依資料順序配色的多色相低飽和色階。這道分層是對「Color communicates state」的**具名例外**：類別色只在「色彩編碼分類、而非編碼狀態」的圖表出現，且不得用於金額或狀態呈現。色板成員與 token 值見 [ui/design-system.md](../ui/design-system.md) §1。

## Considered Options

- **沿用單一色相明度階**：最安靜，但明度階無法讓 8 個分類清楚分辨，長尾會糊成一片。拒絕。
- **把 `--chart-*` 定義成語意色的別名**（現況）：donut 會吃到 `positive` 綠／`warning` 黃／`negative` 紅，分類片被讀成狀態。拒絕；`--chart-*` 改為純類別色，語意色各自獨立。
- **強制所有圖表改用 `--chart-*`**：會摧毀「收入綠／支出紅」的金額語意記憶。拒絕。
- **額外新增一組 `--categorical-*`**：與 `--chart-*` 併存會產生兩套近乎重複的色板 token。拒絕；就地擴充 `--chart-*`，並保留 `--chart-1`（淨資產藍，`asset` tone 在用）值不動。

## Consequences

- 既有 `--chart-2/3/5` 的語意別名取消；`--chart-1` 同時供 `asset` tone 與 donut 第 2 片使用（兩者皆為資料視覺色，接受此一身二用）。
- 色板不含紅：紅色保留給 `--negative`／`--destructive`，避免分類片被讀成錯誤或負向。
- 改動集中在一處色板對應，所有 donut（Dashboard 資產組成、portfolio 持倉配置、gallery）一起套用，不需逐圖調整。
