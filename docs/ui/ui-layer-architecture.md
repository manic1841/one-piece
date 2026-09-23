# UI Layer Architecture Guide

This project follows a strict separation of concerns using Domain-Driven Design (DDD) and Clean Architecture principles. The UI layer focuses solely on **presentation** and **interaction orchestration**. If you find business logic here, you've failed.

> **涵蓋範圍**:本文件是 UI 分層與表面契約的唯一真相來源——分層結構與依賴方向、ViewModel/Hook 職責、導航／Header 契約、RWD 斷點,以及 List / Detail / Workflow 的責任切分與動作位置。設計 token 與元件表面屬 [`design-system.md`](design-system.md);頁面層級佈局與互動標準屬 [`visual-standards.md`](visual-standards.md)。三份文件權威不重疊。

## 1. Directory Structure

The `src/ui` directory is organized by **Feature/Page** to reflect user workflows, not just data models.

```text
ui
├─ app/                # Global initialization (Router, Providers, Layout)
├─ features/           # Core UI logic organized by user workflow
│   └─ [feature-name]/
│       ├─ pages/      # Route entry points
│       ├─ components/ # Feature-specific UI components
│       ├─ hooks/      # Controllers, Queries and Commands
│       ├─ viewmodels/ # UI-specific data representations
│       ├─ types/      # Feature-local UI types (ViewModel tier)
│       ├─ mappers/    # Domain/Application -> ViewModel transformation
│       └─ utils/      # Feature-local presentation helpers
├─ components/         # Shared Design System components (Stateless, Pure)
├─ hooks/              # Shared UI hooks (application controllers and mechanisms)
├─ constants/          # Display labels: the only source of data-value display text
├─ utils/              # Presentation helpers (Formatting, etc.)
└─ assets/             # Static UI assets
```

---

## 2. UI Tiers and Dependency Rules

The five tiers and the direction they may call. A tier may not import what is not listed.
Decision record: [ADR-0062](../adr/0062-ui-tier-separation-and-surface-import-ban.md).

| Tier | Directories | May import | Must never import |
| --- | --- | --- | --- |
| **Surface** | everything under `src/ui` not listed in another tier | UI components, Controllers, ViewModels, `constants`, `utils` | `@/domains`, `@/application`, `@/infra` — **including types** |
| **ViewModel** | `features/*/viewmodels`, `features/*/mappers`, `features/*/types` | domain types/values/pure functions, application **types** | application behavior (use cases, workflows), `@/infra` |
| **Controller** | `features/*/hooks`, `hooks` | use cases / workflows, domain, ViewModels, `constants`, `utils`, the `useAuth` context reader | repositories, Firestore, API clients, storage |
| **Display Labels** | `constants` | same import scope as ViewModel | `@/application`, `@/infra`, domain behavior |
| **Presentation Helper** | `utils`, `features/*/utils` | pure formatting/styling functions | anything with business or data semantics |

**Surface is the fail-closed default.** Membership in a tier is decided by directory, not by file role: any file under
`src/ui` that is not inside one of the directories listed for a non-Surface tier is Surface. A new directory is therefore
Surface until the tier table names it — never silently exempt.

**Display Labels is a ViewModel-tier import scope.** Its *responsibility* is unique (the only source of data-value
display text, see rule 7 and `CONTEXT.md`), but what it may import is deliberately identical to ViewModel: label maps
consume domain values and types as mapping input. It must not acquire domain behavior.

Call direction is one-way: `Surface → Controller → (Query | Command) → Use Case`. ViewModel is the **only bridge**
between domain/application shapes and components.

1.  **Surface -> Controller**: a component/page talks only to Controllers. Never call a Use Case or Repository from a
    component. Pages are Surface, so the same rule applies to them.
2.  **Surface -X-> Domain / Application**: Surface must not import `@/domains` or `@/application`, **not even for a
    type**. When a component needs a domain-shaped value, the feature's ViewModel maps it or re-exports the type
    (`export type { Holding }`); the component imports from the ViewModel.
3.  **ViewModel -> Domain**: ViewModels may import domain types, domain values (enums, option sets) and domain pure
    functions — that mapping *is* their job.
4.  **ViewModel -> Application (types only)**: ViewModels may import an application **type** as a mapper input
    (e.g. `mapDashboardOverviewToHeroVM(overview: DashboardOverview)`), but must never call an application use case or
    workflow.
5.  **Controller -> Application**: Controllers are the only tier that may call use cases and workflows. Non-persisting
    domain pure functions may also be called here for state derivation.
6.  **Controller -X-> Infrastructure**: controllers, like all UI code, must not import repositories, Firestore, API
    clients or storage details. The **only** infra import any UI file may make is `useAuth`
    (`@/infra/contexts/useAuth`), which is a Firebase-free React context reader. Controllers should prefer
    `useAuthContext()` (see §4).
7.  **Display Labels are the only source of labels**: data-value display text comes from `constants`. No `*_LABEL`
    map may be imported from `@/domains` by any UI tier.
8.  **Feature Isolation (components)**: shared components belong in `src/ui/components`; feature **components** must
    not be imported across features. ViewModels are exempt — a ViewModel may be imported by another feature when a
    second consumer genuinely needs the same projection.
9.  **Shared Component Reuse**: before creating a new shared component, extend an existing one in `src/ui/components`
    when it covers the use case. Create a new shared component only when nothing existing can be extended, and migrate
    existing duplicate implementations in the same task.
10. **Infrastructure -X-> UI**: infra must never import from `src/ui`. Failure states that must gate the whole app are
    surfaced as **data** on the context, and the UI decides how to render them (`AuthGate` renders `AppFallback` from
    `initError`/`loading`, see §5.1).

---

## 3. ViewModel Design Specification

ViewModels (VM) are the **Projected State** of the domain for a specific UI view.

### Why?

- **Stability**: Domain models change. UI shouldn't break because a database field was renamed.
- **Performance**: Formatting dates and numbers in the render loop is stupid. Do it once in a mapper.
- **Context-Specific**: A "User" in a list view needs different data than a "User" in a profile edit form.

### Rules:

- **Flat & Lean**: Avoid deeply nested objects if the UI doesn't need them.
- **UI-Ready**: Boolean flags (e.g., `isDeletable`) and formatted strings (e.g., `createdAtText`) belong here.
- **Immutable**: VMs are data containers. No methods.
- **Form First-Class**: Every form must define a dedicated Form VM schema (Zod) in `features/[feature]/viewmodels`.
- **Mapping Boundary**: Component and Hook must not construct domain payloads inline. Use `mapXxxVMToDomain` mapper functions.
- **No Domain Leakage in Render**: Do not parse numeric/date strings or derive accounting/business rules inside React render.
- **Sole Bridge**: ViewModel is the only path by which a component receives domain- or application-shaped data. When a
  component needs such a shape, the ViewModel maps it into a VM shape or re-exports the type (`export type { Holding }`),
  and the component imports it from the ViewModel — never from `@/domains` or `@/application`.
- **Types In, Behavior Out**: ViewModels may import application **types** as mapper inputs; calling a use case or
  workflow from a ViewModel is forbidden (that belongs to Controllers).
- **Throwaway Shapes**: Identity is by import path, not by shape. `Omit<DomainThing, 'id'>` and structurally identical
  shapes are legitimate; do not rewrite a domain type into a duplicate shape just to avoid the name.

---

## 4. Controller Design (Hooks)

Hooks in `features/*/hooks` (and shared `hooks/`) are **Controllers**. They bridge React's lifecycle and the pure logic
of Use Cases. Two responsibilities plus one mechanism — there is no third layer:

| Kind | What it is | May contain |
| --- | --- | --- |
| **Controller** | One per page/dialog. Owns local UI state (dialog open, selection, draft) and composes Query and Command hooks. | use case calls via the hooks it composes, local state, form state |
| **Query** | One per resource. Read-only. | read use cases |
| **Command** | One per resource, named `*Cmds` when it exists as a distinct bundle. Write-only. | write use cases |
| **`useLoadingTask`** | A **mechanism**, not a tier. Used *by* Query/Command hooks, exactly like `useState`. | — |

Rules:

- **No business logic**: if you're calculating interest rates in a hook, you're doing it wrong. Move it to a Domain Service.
- **Return Intent**: don't just return data; return actions (e.g., `onSave`, `onCancel`).
- **Atomic Operations**: each hook focuses on a specific interaction flow.
- **No Hidden Workflow**: a single user action must not orchestrate multiple use cases. Multi-step orchestration is a
  Workflow use case (e.g. the monthly-close workflow) and lives in the application layer. A hook *file* may expose
  several use cases as a menu of operations; that is not orchestration.
- **Command Purity**: a `*Cmds` hook contains writes only. Reads live in a Query hook or the Controller, so that "calling
  Cmds means state changes" stays true.
- **Split on Demand**: keep read and write in one hook until a second consumer needs only one side. Do not split for
  symmetry.
- **Form State Is Controller State**: form state (`useForm`, hand-rolled field state, zod parsing) belongs in a hook,
  not in a page. `useForm` and `zodResolver` may be used, but the `useForm` call site is a Controller, not Surface.
- **Validation Gate**: Hook submit paths must validate Form VM via schema before calling Use Cases.
- **Loading State**: prefer `useLoadingTask` for simple load/error flows. A hook that needs cancellation or typed errors
  may implement its own state, and must then do so explicitly.
- **Retry Identity**: For a financial command that requires an idempotency key,
  create one key for the user's action, keep it in the hook while retries are
  possible, and clear it only after a successful result. Build the retry
  signature from the same canonical operation inputs as the command fingerprint.
- **Auth Assembly**: Hooks must obtain the `AuthContext` passed to Use Cases via
  `useAuthContext()` (`@/ui/hooks/useAuthContext`), never by hand-assembling
  `{ uid, isGlobalAdmin }` literals from `useAuth()`. Direct `useAuth()` use is
  reserved for concerns the auth context does not carry (e.g. `userProfile`,
  `refreshProfile`, sign-in UI), and is allowed only inside a Controller — never in
  Surface. Never fabricate a fake auth object (empty uid, forced `isGlobalAdmin: true`)
  to bypass permission checks.

---

## 5. Typical Data Flow

```text
Repository (Infra)
 ↓
Domain Entity (Domain)
 ↓
Use Case (Application)
 ↓
Controller (UI Hook)
 ↓
Mapper (UI Conversion)
 ↓
ViewModel (UI State)
 ↓
React Component (Surface)
```

### Form Submit Data Flow (Mandatory)

```text
React Component (Form State)
 ↓
Form ViewModel (Zod Schema)
 ↓
Mapper (mapXxxVMToDomain)
 ↓
Use Case
```

### 5.1 全 app 失敗畫面的資料方向

啟動期不可回復的失敗（如認證後端不可達）由 infra **以資料形式**放上 context（`initError`、`loading`），
不自行 render UI。`AuthGate`（`features/app`，Surface）讀取這些欄位，決定顯示 `AppFallback` 或 children；
`Toaster` 掛在 gate 外側，作為 system-level notification surface，載入期間仍可顯示通知。
infra 不得 import `src/ui/**`（見 §2 規則 10）。

## 6. RWD 斷點契約

斷點決策見 [ADR-0044](../adr/0044-rwd-breakpoint-contract.md)。`md`(768px)是行動殼
與桌面殼的唯一切換點;兩殼皆為 sticky header + 置中 `max-w-7xl` 容器,無側欄。

## 6.1 導航所有權契約

主導航在所有斷點由 Pixel Pet 獨家擁有(見 [ADR-0055](../adr/0055-pixel-pet-single-navigator-ownership.md))。
行動 bottom nav 與 More sheet 已收編;行動版經 Pixel Pet 的 Navigator sheet 導航。
退場以「Pet + sheet 覆蓋 bottom nav 全部目的地與 More sheet 功能、不留斷點」為條件,已達成。
header 不含主導航;Navigator 清單為 **8 項**——`NAV_ITEMS` 扣除 Dashboard 與
Settings,Dashboard 由 header 品牌承擔、Settings 由 Avatar menu 承擔;Ctrl/Cmd+K 指
令面板為 Quick Access,涵蓋含 Dashboard 與 Settings 在內的全部 **10 條**路由,與
Navigator 清單互相獨立(見 [ADR-0055](../adr/0055-pixel-pet-single-navigator-ownership.md))。

四檔工作流視窗（Monthly Close、Portfolio Detail、Debt、Header）的視覺權重與操作
位置契約見 [ADR-0056](../adr/0056-workflow-first-surfaces.md):pipeline 為頁面主要層
級,mobile 步驟列去 Card,確認動作顯示 `CONTINUE →`;Portfolio Detail 無快照管理入
口;Debt 列表列無常駐 Edit / Delete,動作在詳情 header;Header 無獨立 Settings 鈕
,Settings 在 Avatar menu。

## 6.2 Navigator 互動契約

Pixel Pet 是唯一主導航,不使用傳統 bottom nav 作為主 Navigator(所有權見 §6.1)。

- **定位**:桌機固定右下角;行動版為 bottom sheet。
- **桌機**:click pet 展開 Navigator overlay(floating panel);hover 只做輕微反應,滑鼠移開 overlay **不**立即關閉(避免誤觸),由點擊外部或再點 pet 關閉。
- **行動版**:tap pet 開啟 Navigator bottom sheet;再 tap pet 或 Close 關閉;不使用 hover。
- **目的地**:清單內容、Dashboard 的 home 語意與 Quick Access 的獨立性見 [ADR-0055](../adr/0055-pixel-pet-single-navigator-ownership.md) 與 `CONTEXT.md` 的 Pixel Pet;本節只定互動行為,不重述。
- **動畫**:panel／Sheet 進出場走 [`design-system.md`](design-system.md) 的動態 token。
- **Phase 8 圖像**:以正式 pixel-art mascot 替換 placeholder 圖像,僅換圖,不改本互動契約。
- **寵物反應**:`idle / happy / nod / alert` 為最近財務期間狀態的資料驅動顯示,不做情境式 context 管線;映射契約見 [ADR-0055](../adr/0055-pixel-pet-single-navigator-ownership.md) 與 `CONTEXT.md` 的 Pixel Pet,本節不重述。

## 6.3 Header 責任

Global Header(sticky 系統狀態列)只負責:

- 品牌 ONE PIECE(點擊回 Dashboard)。
- Household switcher。
- Search / Command(Quick Access,見 §6.1)。
- System Status(靜態 `● SYSTEM ONLINE`)與今日日期。
- User(Avatar menu:Settings、Log out)。

不得放入:主導航(見 §6.1)、大量 shortcuts、Period selector、domain actions。Settings 收在 Avatar menu,header 無獨立 Settings 鈕(亦見 [ADR-0056](../adr/0056-workflow-first-surfaces.md))。Header 為 L1 浮動 chrome,材質契約見 [`design-system.md`](design-system.md)。

以下為四檔視窗的手動 QA 清單,項目均為可觀察行為,作為版面變更的驗收面:

### 360px(手機直式)

- 頁面底部固定 Pixel Pet 按鈕;點擊展開 Navigator sheet,8 個目的地完整可點。
- 無 bottom nav 與 More 按鈕;除固定 pet 按鈕外無其他浮動導航元素。
- 頂部列顯示 App 名稱與 household 切換器,不與 Logout 重疊。
- 交易列表呈現全寬度卡片式,日期篩選輸入與按鈕直向堆疊、各自佔滿列寬。
- 退休年度明細為 compact rows(Year 與 Savings 固定顯示,其餘欄位展開顯示),頁面與元件皆不出現水平捲軸。

### 768px(平板直式)

- 內容區為置中 `max-w-7xl` 容器,無側欄;無遮蓋、無異常留白。
- 主導航由 Pixel Pet Navigator 承擔,以 8 個目的地呈現(`NAV_ITEMS` 扣除 Dashboard 與 Settings),完整可點、無換行截斷。
- 內容區無水平捲軸;交易列表日期篩選列允許折行,所有控制項完整可見。

### 1024px(平板橫式 / 小桌機)

- 版面與桌機一致,無平板專用元素。

### 1280px(桌機)

- 版面與 1024px 一致;`max-w-7xl` 容器置中,兩側留白對稱。
- 任何斷點皆不得出現整頁水平捲軸。

## 7. 動作位置與 List / Detail 責任切分

可查看 Detail 的資料以整列點擊進入 Detail,並依 List / Detail / Workflow 的責任邊界決定動作落點。**Action Hierarchy 只定義優先序;List / Detail 決定位置。**

### 7.1 責任切分

- **List** = Browse / Filter / Create / Reorder:檢視清單、內容區 filter(顯示停用／顯示已結清 toggle 屬 view filter,非資料變更)、create 入口、拖曳排序(見 [ADR-0059](../adr/0059-dnd-kit-shared-sortable.md))。view filter 與搜尋放在 List 內容區,不放 header。
- **Detail** = 該實體的管理動作:Edit(inline rename 或 Edit Form)、Activate/Deactivate、Danger Zone(刪除)。
- **Workflow**(如 `/close`)= 該工作流的主要動作:Confirm、Close Period。

### 7.2 List → Detail

可查看 Detail 的資料遵循 `Row → Click → Detail`,不在每列散落 `[View] [Edit] [Delete]`。

例外:無 Detail 頁的資料(如 Transaction)允許 row 端 ghost icon action(icon-only、muted 色、hover 才浮現語意),**不**適用於有 Detail 頁的資料。`data-table` 的列內動作與 pointer event priority 為權威,見 [`design-system.md`](design-system.md) 的 `data-table` 段。

### 7.3 Edit 表達方式

Detail 的編輯入口依欄位複雜度二選一:

- **單一 metadata 欄位**(名稱)→ `InlineEditableTitle` inline edit,掛在 PageHeader title slot。適用:Project / Portfolio / Retirement plan 名稱。
- **多欄位 configuration** → Edit Form(dialog 或 detail 區塊)。適用:Debt / Account。

`PageHeader` 不知道「怎麼編輯名稱」——`title` 接受 `ReactNode`,由頁面自行傳入 `<InlineEditableTitle value={...} onSave={...} />`;儲存走既有 update command,成功後頁面自行 refetch／同步 state。

### 7.4 Lifecycle 控制

啟用／停用(activate/deactivate)屬 Detail 責任,不放在 List 列內:

- 掛在 PageHeader actions,緊鄰狀態顯示(badge/meta),讓狀態與改變狀態的動作成對。
- 標籤依狀態二選一:active 顯示「停用 {domain}」、inactive 顯示「啟用 {domain}」。
- 可逆動作用 outline variant;停用帳戶若當月有交易,先走 monthly-usage 檢查 + `useConfirm()`(DISABLE 標籤)。切換走既有 update command,成功後狀態即時反映。
- List 只呈現狀態(glyph/muted),不提供切換。

### 7.5 Action Hierarchy(優先序)

全站最多三層:

- **Primary**:主要完成動作(`SAVE` / `CONFIRM` / `CLOSE PERIOD` / domain create:`NEW`——新增帳戶／新增貸款／New Project／New Plan／新增交易／新增組合)。
- **Secondary**:次要動作(`EDIT` / `IMPORT` / `DEACTIVATE`,可逆,outline variant)。
- **Tertiary**:低干擾(`View details →` / `More`)。

一個 context 通常只需要一個 primary action;不要在同一區域堆疊多個 primary。

### 7.6 位置規則

- **List Header** = create action only(`New` / 新增 {domain});結算／設定等流程入口屬各自工作流頁面,不在 List header。
- **Detail Header** = 該實體的管理動作(Edit、Activate/Deactivate),緊鄰狀態顯示。
- **Workflow Header** = 該工作流的主要動作(Confirm、Close Period)。
- **Destructive**(Delete／移除)放頁面尾端 Danger Zone,永不升級到 header。

> **Closing principle:Action Hierarchy defines priority; List / Detail defines placement.**

## 8. Linus's Final Word on UI

Don't over-engineer with 50 levels of abstraction just because some blog post told you so. If a component is simple, keep it simple. But if you start leaking business logic into a "Button Click" handler, I will find you.
