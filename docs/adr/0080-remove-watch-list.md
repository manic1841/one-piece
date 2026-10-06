# 移除監看清單：記帳完整性檢查不再是一個獨立功能

**狀態：** 已接受（2026-10）
**規範來源：** [monthly-close.md](../monthly-close.md) §3；[development-guide.md](../development-guide.md) §3；`CONTEXT.md`

監看清單（ADR-0048）是早期設計的延伸功能，實務上沒有被使用，維護成本卻是跨四層的：一個獨立 domain、一個 repository、三個 use case、設定頁卡片，以及結算流程的零活動軟關卡都要跟著它走。我們決定完整移除它，連帶移除由它衍生的「零活動警示」與「結算前完整性檢查」兩個概念；`COMPLETENESS_CHECK` 階段保留，但退化成單純的就緒聚合（結算完成度＋交易驗證），不再依賴監看清單、也不再是 `NEEDS_REVIEW` 的來源。

## Considered Options

- **只移除 UI、保留 domain 與檢查邏輯**：留著沒有入口的邏輯是更難理解、更難刪的死碼，不採。
- **把檢查改成自動涵蓋所有啟用對象（不靠使用者標記）**：會讓每個月對所有專案／科目／債務大量示警，雜訊遠高於價值，也超出「移除未用功能」的範圍，不採。
- **為 `COMPLETENESS_CHECK` 找替代的軟關卡觸發來源**：移除零活動後沒有可信的推斷來源，強留一個空關卡只會誤導，不採。

## Consequences

- `COMPLETENESS_CHECK` 保留為報表產生前的就緒聚合（`getSettlementReadinessUseCase` 的月結算完成度＋交易驗證問題），但不再有「零活動異常」這個非阻擋例外，也不再觸發 `NEEDS_REVIEW`。移除後唯一會暫停工作流的是 ADR-0066 的連鎖降級。
- **舊資料相容**：移除前已存在的 `NEEDS_REVIEW` 期間可能帶 `reviewSourceStageId = COMPLETENESS_CHECK`。狀態機與工作流保留這條值的處理路徑（確認該階段即恢復），這類期間仍能正常收尾；新的暫停不會再產生這個值。
- **備份相容性取捨**：`schemaVersion` 維持 1，payload 的 `collections` 不再宣告 `watchList`。舊備份仍可能帶這個鍵，匯入時**接受並忽略**（不還原、不刪除本地資料、不報錯），並以回歸測試鎖定。否決「拒絕含未知鍵的備份」——那會讓舊備份必須人工編輯才能匯入，代價高於收益；也否決「只靠 schema 靜默剝除而不測試」——那會讓這個決定隱形。
- 退役集合若在 Firestore 仍有殘檔，不會被讀取，也不在匯入時清除（已無 repository 可列出）；此殘留是刻意接受的代價。

## Revisit When

若日後重新需要「提醒使用者可能的漏記」，應以新的推斷來源重新設計（例如比對歷史均值），而不是復活監看清單。
