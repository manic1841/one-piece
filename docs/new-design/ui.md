好，那我們進入 **FINANCE.OS Design System v1**。這一層定下來後，後面的頁面就不需要每次重新討論風格。

> **修訂（2026-09-21，Visual Consistency Standard）**
>
> - 新增 [visual-consistency.md](visual-consistency.md)：全站 40 節 Visual Consistency Standard（Page Shell、Page Width、spacing scale、Section/Card/Border/Radius/Shadow、Financial Number hierarchy、Table/List→Detail/Action hierarchy、Status/State Color、Empty State、Loading、Form/Advanced/Accordion/Drawer、Workflow/Dashboard/Retirement/Reports、Mobile/Mobile Navigation/Pixel Pet/Header/Search、Charts、Data Density、互動一致性、Destructive/Toast、Responsive、Anti-Patterns、最終 Review Checklist）。
> - 本階段**不處理 Primary Color**（`#5CC8C0` 留到最終 Visual Polish）；semantic color 規則（Positive/Warning/Negative/Neutral、彩色只表達 State 不表達 Data Type）先固定於該文件第 17 節。
> - 與本文件既有規則的關係：typography（Inter / JetBrains Mono 分工）與 radius 4px 上限沿用 Phase 1 決策，Standard 將其擴展為 spacing scale、Financial Number 四級層級與 shadow 白名單；衝突時以 Standard 為準。
> - 工程師 Review 與頁面驗收直接使用該文件第 40 節 checklist 與末尾三條判斷標準。

> **修訂（2026-09-16，與既有程式碼對照後）**
>
> - 本設計系統以 `990def2`（Apple-style 整理）的 **token 架構為基礎**：semantic 色（positive/negative/destructive/chart-1..5）、duration/ease token、層級紀律全部沿用；更換的是色板值（暗色優先）、字體（Inter + JetBrains Mono）與 radius（4px 上限 8px）。這正是那次整理的目的 — 色系已可從 `src/index.css` 變數一處更換，核心達成；殘留的 108 處 amber/indigo/purple/sky 硬編碼（25 檔）與 4 檔 `dark:` slate 補丁於 Phase 1 清掃。
> - **狀態系統以 glyph 為主**（● ✓ ○ ! ×），取代彩色 badge；彩色只表達 positive/negative/warning 語意。
> - **中文介面維持**：現有顯示標籤走 constants 層單一來源（CONTEXT.md「Display Label」），UI 文字保持中文；「Ledger」不採用 — nav 維持「交易」（Transaction 是 canonical 詞，Ledger 與 LedgerCode/domain 撞名），Dashboard 的 recent-activity 小工具表達 spec 的「系統日誌」性格。
> - **保留項**：AODA 對應（reduced-motion/transparency/contrast 已內建於既有 CSS）、press feedback、focus-visible 環、materialize 層級改以暗色 surface 表達。
> - 詳細 token 對照表與實作細節於 Phase 1 session 討論後補充。
>
> **Phase 1 完成紀錄（2026-09-16，實作對照）**
>
> - 色板：`src/index.css` 改為 dark-first（`:root` 直接放暗色值，`.dark` class 區塊刪除）。Spec 色對應 semantic token：Primary #E6E8EB→`--foreground`/`--primary`、Secondary #7C858F→`--muted-foreground`、Surface #0A0E14→`--background`（216 33% 5%）、Elevated #0D1117→`--elevated`（216 25% 9%）、Positive/Negative/Warning →`--positive`/`--negative`/`--warning`、Accent 藍與資料視覺色→`--chart-1..5`。
> - 字體：`@fontsource-variable/inter` + `@fontsource-variable/jetbrains-mono` self-hosted（package.json），`tailwind.config.js` `fontFamily.sans/mono` 接上 Inter Variable / JetBrains Mono Variable，中文 fallback Noto Sans TC。
> - Radius：`--radius: 0.25rem`（4px）；33 處 `rounded-2xl/3xl`（14 檔）全面改 `rounded-lg`。
> - 清掃：25 檔共 100+ 處 amber/indigo/purple/sky/emerald/rose/blue/orange 硬編碼與 4 檔 `dark:` slate/emerald/rose 補丁全數換為 semantic token（amber→warning、indigo 裝飾→accent/muted-foreground/foreground、實色 indigo 按鈕→primary pattern、sky 資料色→chart token、gradient 卡→flat token surface）。`grep 'bg|text|border|...-(amber|indigo|...)-\d|text-white|dark:' src/**` 歸零。
> - 狀態系統：`src/ui/components/StatusGlyph.tsx`（● ACTIVE / ✓ VERIFIED / ○ WAITING / ! REVIEW / × ERROR），彩色 badge 替換留待頁面 session。
> - Token gate：`eslint.config.js` 以 `no-restricted-syntax` 封鎖 `src/**` 內 raw palette class（bg/text/border/...-amber|indigo|...-\d），之後更換主題 = 只改 `src/index.css` 一檔。
> - 驗證：`tsc -b` 0 錯誤、eslint 0 error（僅既有 qa-data-plan.ts 行數 warning）、437 tests 全綠；瀏覽器實測 dark 背景 rgb(9,12,17)、radius 4px、Inter Variable 生效。

## 01 — Typography

只使用兩套字體：

**Inter**

* Navigation
* Heading
* Label
* Description

**JetBrains Mono**

* 金額
* 百分比
* 日期
* Account ID
* Ledger code
* System status
* Technical data

例如：

```text
NET WORTH

$4,821,320
+8.42% YTD
```

讓「文字」和「資料」產生明確區隔。

---

> **修訂（2026-09-17，Layout）**：新增 Layout 原則 —
>
> - **Desktop Header（System Status Bar）**：sticky，品牌 ONE PIECE + 靜態 ● SYSTEM ONLINE + 今日日期；右側 Household Switcher + Search + Settings + Avatar。permanent sidebar 移除；全站內容統一 `max-w-7xl mx-auto`。
> - **Navigator**：平時完全隱藏，由右下角 Pixel Pet trigger 開啟（詳見 #10 修訂）。
> - **Footer**：ONE PIECE v1.1.0 + DATA TODAY, A FREER TOMORROW。

---

## 02 — Color

色值以 `src/index.css` 為 source of truth（dark-first `:root` 變數），此處只定規則：

```text
--background / --elevated   底層與抬升 surface
--border                    1px 邊界
--foreground / --muted      主文與次文
--accent                    操作與強調
--positive / --negative / --warning
--chart-1..5                資料視覺
```

**彩色只代表狀態或操作。**

不要拿 Accent 去裝飾每一個區塊。

---

## 03 — Spacing

整個系統採用 **8px grid**：

```text
8
16
24
32
48
64
96
128
```

首頁尤其大量使用：

**64 / 96 / 128px**

來建立留白。

這會讓畫面看起來不像傳統 ERP。

---

# 04 — Border

主要使用：

```text
1px solid var(--border)
```

而且低對比。

Card 不靠陰影。

例如：

```text
┌──────────────────────────────────┐
│                                  │
│ NET WORTH                         │
│                                  │
│ $4,821,320                        │
│                                  │
└──────────────────────────────────┘
```

Border 只是告訴使用者：

> **這裡是一個資料區域。**

---

# 05 — Radius

統一：

**4px**（`--radius`）

最多：

**8px**

避免：

`16px / 24px`

因為圓角太大會讓整體變成一般 SaaS / Fintech App。

---

# 06 — Buttons

Primary：

```text
┌─────────────────┐
│   START CLOSE   │
└─────────────────┘
```

Secondary：

```text
┌─────────────────┐
│     REVIEW      │
└─────────────────┘
```

Ghost：

```text
VIEW REPORT →
```

按鈕不要做成很厚重的 UI。

---

# 07 — Status System

這會是整個產品很重要的一套語言。

```text
● ACTIVE
✓ VERIFIED
○ WAITING
! REVIEW
× ERROR
```

例如：

```text
ACCOUNT RECONCILIATION

TAISHIN BANK       ● VERIFIED
CTBC BANK          ! REVIEW
CASH               ✓ VERIFIED
```

這種 status 比大量彩色 Badge 更適合你的產品。

---

# 08 — Charts

Chart 的原則：

> **Data first, visualization second.**

不要：

* 漸層
* 3D
* 大型圓餅圖
* 很多鮮豔顏色
* 巨大的 Tooltip

優先：

**Line / Area / Bar / Timeline**

而且線條細、Grid 淡。

---

# 09 — Tables

Table 是你的系統很重要的 component。

```text
ACCOUNT             BALANCE          STATUS
────────────────────────────────────────────
TAISHIN BANK        $82,420          ✓
CTBC BANK           $56,000          ✓
BROKERAGE           $32,000          !
```

原則：

**不要把每一列做成 Card。**

讓它看起來像真正的 system data。

---

# 10 — Pixel Pet

這是唯一可以打破 Design System 的元素。

```text
UI SYSTEM
Dark / Precise / Minimal

             ↓

        🩷 PIXEL PET

             ↓

Cute / Organic / Playful
```

但它仍然遵守：

**Small**

**Low frequency animation**

**Low visual weight**

所以不會破壞主介面的專業感。

> **修訂（2026-09-17，Interaction Contract）**
>
> - **定位**：右下角固定。本次為簡單圓形 placeholder（primary 色，hover 輕微 scale 反應）；正式 pixel-art mascot 於 Phase 8 替換，不改 interaction contract。
> - **Desktop**：hover → 輕微反應（眨眼／移動）；click → 展開 Navigator Overlay；滑鼠移開 → Overlay 不立刻消失（避免誤觸），點擊外部或再點 pet 關閉。
> - **Mobile**：tap → 開啟 Navigator Bottom Sheet；再 tap pet 或 Close → 關閉；不使用 hover。
> - **Reaction API**：元件定義四態 `idle / happy / nod / alert`，僅在使用者觸發或重要 system event 時反應（Monthly Close 完成 → happy、Reconciliation 確認 → nod、需要 Review → alert）；一般操作不反應。Pet 不主動打擾使用者，不是聊天機器人或 always-active assistant。
> - **Navigator Overlay**：浮動 panel 2×4 grid，8 項（Transaction / Close / Account / Portfolio / Debt / Project / Report / Retirement）；Dashboard 為 Home 不進 panel，點 ONE PIECE 品牌回 Dashboard。動畫 200ms（見 #11）。
> - **Header = System Status Bar**（與 Navigator 是兩個東西）：sticky 頂部 — 品牌 ONE PIECE + 靜態 ● SYSTEM ONLINE + 今日日期；右側 Household Switcher + Search + Settings + Avatar（含 logout）。

---

# 11 — Motion

動畫也要非常克制。

### UI

`150–250ms`

### Navigator

`200ms`

### Page transition

`150ms`

### Data update

可以稍微有：

`fade / number transition`

但不要：

* bounce
* excessive spring
* parallax
* flashy transition

---

# 最終 Design Principle

我會把整個 Design System 濃縮成六句：

> **Data over Decoration.**

> **Structure over Cards.**

> **Space creates hierarchy.**

> **Color communicates state.**

> **Motion has a purpose.**

> **Let the numbers breathe.**

而 Pixel Pet 則是唯一的例外：

> **A little personality inside a serious system.**

這套規則可以直接作為之後 Figma / Frontend 實作的基準。
