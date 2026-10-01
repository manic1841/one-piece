# 暫停即強制順序恢復：行走位置只在終點清除

**日期：** 2026-10-03
**狀態：** 已接受
**規範來源：** [monthly-close.md](../monthly-close.md) §2（`NEEDS_REVIEW` 段）、§3（階段規則）

Issue #196 的暫停鎖讓使用者被釘在 review 來源階段，階段跳轉與 pipeline 點擊全部失效。
決定反轉模型：暫停（`NEEDS_REVIEW`）期間瀏覽自由，但**確認**被限制在行走位置——
`CLOSE_STAGE_IDS` 順序中第一個非 `COMPLETED` 的階段；暫停只在行走終點清除
（Completeness Check 暫停在確認 review 來源階段時清除並重設 Financial Reports 與
Close Period 為 `PENDING`，連鎖降級則維持 `NEEDS_REVIEW` 直到重新關帳）。GO TO
階段跳轉在暫停期間改語意為重設：確認對話框後該階段（含）之後全部重設為 `PENDING`，
前期完成階段保留。理由是讓「發現問題 → 修正 → 依序重驗」成為唯一恢復路徑，避免
跳過中間階段造成報表基於未重驗的資料。

## Considered Options

- 重開即刪除報表檔案：否決，報表倉庫沒有刪除路徑，且刪除是破壞性動作。
- 時間戳新鮮度比較（報表比階段確認舊就擋）：否決，時鐘比較脆弱且隱性，硬性
  階段條件可掃描、可測試。
- 維持 #196 的鎖（顯示釘在 review 來源）：否決，導航全斷，使用者無法查看其他
  階段的證據。

## Consequences

- 關卡升級：`Close Period` 需要 Financial Reports 階段 `COMPLETED` **且**三張報
  表已持久化——重開後舊報表檔案殘留不再能通過關卡。
- `NEEDS_REVIEW_BLOCKED` 錯誤碼被行走規則吸收移除；暫停期間確認非行走位置改拋
  `STAGE_NOT_WALK_POSITION`。
- 連鎖降級的重開重設全部九個階段（取代 ADR-0066 的重開語意）；`CLOSED` 期間的
  重開維持 ADR-0066。
