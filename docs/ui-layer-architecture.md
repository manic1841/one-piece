# UI Layer Architecture Guide

This project follows a strict separation of concerns using Domain-Driven Design (DDD) and Clean Architecture principles. The UI layer focuses solely on **presentation** and **interaction orchestration**. If you find business logic here, you've failed.

## 1. Directory Structure

The `src/ui` directory is organized by **Feature/Page** to reflect user workflows, not just data models.

```text
ui
├─ app/                # Global initialization (Router, Providers, Layout)
├─ features/           # Core UI logic organized by user workflow
│   └─ [feature-name]/
│       ├─ pages/      # Route entry points
│       ├─ components/ # Feature-specific UI components
│       ├─ hooks/      # Interaction orchestration (Application Services)
│       ├─ viewmodels/ # UI-specific data representations
│       └─ mappers/    # Domain -> ViewModel transformation
├─ components/         # Shared Design System components (Stateless, Pure)
├─ hooks/              # Shared UI utility hooks (useDebounce, etc.)
├─ state/              # UI Global State (Zustand/Context - Session/UI only)
├─ utils/              # Presentation helpers (Formatting, etc.)
└─ styles/             # Global themes and CSS
```

---

## 2. Frontend Layer Dependency Rules

Dependencies must flow **inwards**. The UI layer is the outermost shell.

1.  **UI -> Application (Hooks)**: UI components only talk to Hooks. Never call a Use Case or Repository directly from a component.
2.  **UI -> Domain (Types)**: UI can use Domain types for reference, but should prefer ViewModels for display.
3.  **UI -> Domain (Pure Functions)**: Hooks may call domain pure functions directly for state derivation that requires no persistence (e.g. `aggregateTrendPoints`, retirement `planMutations`). This is the prescribed alternative to pass-through application classes. Persistence-affecting operations must still go through a Use Case.
4.  **UI -X-> Infrastructure**: The UI layer must never know about Firestore, API clients, or external storage details.
5.  **Feature Isolation**: Features should be self-contained. Shared components belong in `src/ui/components`, not cross-referenced between features.
6.  **Shared Component Reuse**: Before creating a new shared component, extend an existing one in `src/ui/components` when it covers the use case. Create a new shared component only when nothing existing can be extended, and migrate existing duplicate implementations in the same task.

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

---

## 4. Hook Design Specification (Application Controllers)

In React, Hooks in the `features/hooks` folder act as **Application Controllers**. They bridge the gap between React's lifecycle and the pure logic of Use Cases.

### Responsibilities:

- **Orchestration**: Coordinate between multiple Use Cases if necessary.
- **State Management**: Managing `loading`, `error`, and local submission states.
- **Context Integration**: Injecting `AuthContext`, `QueryClient`, or local UI stores.

### Rules:

- **No Business Logic**: If you're calculating interest rates in a hook, you're doing it wrong. Move it to a Domain Service.
- **Return Intent**: Don't just return data; return actions (e.g., `onSave`, `onCancel`).
- **Atomic Operations**: Each hook should focus on a specific interaction flow.
- **Validation Gate**: Hook submit paths must validate Form VM via schema before calling Use Cases.
- **Retry Identity**: For a financial command that requires an idempotency key,
  create one key for the user's action, keep it in the hook while retries are
  possible, and clear it only after a successful result. Build the retry
  signature from the same canonical operation inputs as the command fingerprint.
- **Auth Assembly**: Hooks must obtain the `AuthContext` passed to Use Cases via
  `useAuthContext()` (`@/ui/hooks/useAuthContext`), never by hand-assembling
  `{ uid, isGlobalAdmin }` literals from `useAuth()`. Direct `useAuth()` use is
  reserved for concerns the auth context does not carry (e.g. `userProfile`,
  `refreshProfile`, sign-in UI). Never fabricate a fake auth object (empty uid,
  forced `isGlobalAdmin: true`) to bypass permission checks.

---

## 5. Typical Data Flow

```text
Repository (Infra)
 ↓
Domain Entity (Domain)
 ↓
Use Case (Application)
 ↓
Feature Hook (Application Controller)
 ↓
Mapper (UI Conversion)
 ↓
ViewModel (UI State)
 ↓
React Component (Presentation)
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

## 6. RWD 斷點契約

斷點決策見 [ADR-0044](adr/0044-rwd-breakpoint-contract.md)。`md`(768px)是行動殼
與桌面殼的唯一切換點;平板沿用桌面殼,側欄 768-1023px 為 224px,1024px 起恢復
256px。

## 6.1 導航所有權契約

主導航在所有斷點由 Pixel Pet 獨家擁有(見 [ADR-0055](adr/0055-pixel-pet-single-navigator-ownership.md))。
行動 bottom nav 與 More sheet 已收編;行動版經 Pixel Pet 的 Navigator sheet 導航。
header 不含主導航;Ctrl/Cmd+K 指令面板為 Quick Access,條目涵蓋全部路由,與
Navigator 的 8 項清單獨立。

四檔工作流視窗（Monthly Close、Portfolio Detail、Debt、Header）的視覺權重與操作
位置契約見 [ADR-0056](adr/0056-workflow-first-surfaces.md):pipeline 為頁面主要層
級,mobile 步驟列去 Card,確認動作顯示 `CONTINUE →`;Portfolio Detail 無快照管理入
口;Debt 列表列無常駐 Edit / Delete,動作在詳情 header;Header 無獨立 Settings 鈕
,Settings 在 Avatar menu。

以下為四檔視窗的手動 QA 清單,項目均為可觀察行為,作為版面變更的驗收面:

### 360px(手機直式)

- 頁面底部固定 Pixel Pet 按鈕;點擊展開 Navigator sheet,8 個目的地完整可點。
- 無 bottom nav 與 More 按鈕;除固定 pet 按鈕外無其他浮動導航元素。
- 頂部列顯示 App 名稱與 household 切換器,不與 Logout 重疊。
- 交易列表呈現全寬度卡片式,日期篩選輸入與按鈕直向堆疊、各自佔滿列寬。
- 退休年度明細為 compact rows(Year 與 Savings 固定顯示,其餘欄位展開顯示),頁面與元件皆不出現水平捲軸。

### 768px(平板直式)

- 固定側欄出現,寬 224px;內容區起點與側欄右緣對齊,無遮蓋、無異常留白。
- 側欄導航項目全部可見可點,無換行截斷;同一清單由 Pixel Pet Navigator 共用。
- 內容區無水平捲軸;交易列表日期篩選列允許折行,所有控制項完整可見。
- 頂部列與底部導航隱藏。

### 1024px(平板橫式 / 小桌機)

- 側欄恢復 256px,內容補償 padding 同步為 256px。
- 版面與桌機完全相同,無平板專用元素。

### 1280px(桌機)

- 版面與 1024px 一致;`max-w-7xl` 容器置中,兩側留白對稱。
- 任何斷點皆不得出現整頁水平捲軸。

## 7. Linus's Final Word on UI

Don't over-engineer with 50 levels of abstraction just because some blog post told you so. If a component is simple, keep it simple. But if you start leaking business logic into a "Button Click" handler, I will find you.
