# UI 分層五級：component 不得觸碰 domain 與 application

**日期：** 2026-09-23
**狀態：** 已接受
**規範來源：** [ui-layer-architecture.md](../ui/ui-layer-architecture.md) §2（層級表、目錄、依賴方向、不變式以該文件為唯一來源）

舊有依賴規則散落三份文件且彼此不一致，其中 `ui-layer-architecture.md` 允許「UI 使用 Domain types 作參考」，
未區分 component 與 hook；實測後發現該命題對 component 成立、對 hook 不成立（hook 的職責就是呼叫 use case）。
因此把 `src/ui` 切成五個層級（Surface / ViewModel / Controller / Display Labels / Presentation Helper），
以「規則管 import 路徑，不管型別身分」為判定原則，並禁止 Surface——feature 的 pages 與 components，以及共用的
components——import `@/domains`、`@/application`、`@/infra`，連型別也不行；需要 domain 形狀時一律經由所屬
feature 的 ViewModel。規範性細節（層級表、目錄、依賴方向、不變式）以 `docs/ui/ui-layer-architecture.md`
為唯一來源，本 ADR 不重述。

## Considered Options

- **允許 component 直接使用 domain 型別**（即決策前的舊規則）——否決：這正是 component 污染的來源；且
  component 一旦能碰到 domain，ViewModel 這層的存在意義就被繞過。
- **要求 component 的 props 與 domain 型別「不同構」**（嚴格的型別身分規則）——否決：無法靜態檢查，
  且會禁止 `Omit<Domain, 'id'>`、`export type { Holding }` 這類有價值的轉出寫法。改採 import 路徑規則。
- **禁止 ViewModel import application 型別**——否決：VM 的職責就是翻譯層，型別耦合是它的本分；要禁的是
  把行為搬進來。禁令若涵蓋型別，mapper 就得為每個來源重寫一份同構的影子型別，兩邊必然漂移。
- **讓 infra 的 provider 直接 import UI 的 context**——否決：這會把 infra → UI 依賴加回來，抵銷
  「infra 不得 import UI」這條不變式；要的是依賴反轉，不是把箭頭反向。
- **新增 `src/shared/` 作為跨層契約層**——否決：`shared` 在文件中沒有角色定義、也沒有守門，卻已有多個
  importer；跨層契約放 domain 更安全——domain 本來就負責定義 Contracts，且既有分層已被測試覆蓋。

## Consequences

- 遷移是漸進的：既有違規曾以只減不增的 allowlist 管理，於 issue #179 清空後連同 allowlist 一起移除。
- 規範性細節以 `docs/ui/ui-layer-architecture.md` 為唯一來源，本 ADR 不重述。

## Revisit When

若出現「component 必須直接消費 use case 回傳值」的真實需求，代表 ViewModel 這層的邊界劃錯了，
應先檢討邊界而不是放寬規則。
