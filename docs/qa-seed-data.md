# QA Seed 資料設計

本文件說明 `qa:seed` 的設計：固定窗口、組裝管線與各 builder 的資料邊界。實作住在
`scripts/qa/plan/`；操作方式見 [testing.md](testing.md) 與 `scripts/admin/README.md`。

## 1. 原則

- **純 builder、寫入分離**：資料在記憶體組裝，I/O 集中在一處。
- **推導一致性**：快照與報表經生產路徑的純 calculator 推導，不手寫數字。
- **schema 即時驗證**：每份文件在 emit 時過 domain schema，漂移在 seed 時就大聲失敗。
- **確定性**：固定 doc id 與固定時鐘，upsert 而非 append，重跑收斂到同一狀態。

## 2. 固定窗口

窗口固定，所有交易必須落在窗口內，越界即失敗。密度不均勻是設計決策：前一年度支撐
退休基準所需的上一完整年度，後一年度鋪多帳戶資金流、貸款、投資與關帳形狀。

帳戶之間不安排內部資金移動（提領、轉入、換匯都不種），各帳戶只靠外部事件進出。交易
不記錄帳戶，帳戶資訊只存在分錄裡，帳戶快照由分錄推導。

## 3. 組裝管線

依賴是單向的，builder 之間互不 import；跨 builder 的交易 journal 由 orchestrator 持有
傳遞。順序為：靜態設定文件 → 一般交易與分配 → 帳戶、債務與帳戶快照 → 專案與 portfolio
快照 → 退休計畫與投影 → 報表與期間矩陣。

支出流的逐筆規格是獨立資料檔，由交易 builder 消費。單一入口匯出完整 plan，seam test
直接 import 它。

退休計畫的規則覆蓋每個 Method 與三種來源，其中一條支出規則刻意把成長率設在通膨率之下
並開啟「維持實質價值」，讓投影走過 clamp 分支。

## 4. 期間矩陣

期間狀態語意見 [monthly-close.md](monthly-close.md) §2；本節只定義種子覆蓋哪些形狀：
一個待確認期間（帶降級記號）、兩個已關帳期間（供重開與連鎖降級的 E2E 使用），以及一個
刻意不寫期間紀錄、但快照齊全的月份，作為「從尚未開始關帳走完關帳」的目標。

更早的月份不寫紀錄；operation 集合不 seed。

## 5. 守護

seam test 驗證組合順序與跨 builder 一致性（確定性、薪水與分配雙向連結、journal 平衡、
窗口不變式、快照與分錄的對應關係）。per-builder 的文件數與鍵存在性不另測——emit 的
schema 驗證已即時守住漂移。

## 6. 展示環境（live）

seed 只寫 emulator（`applyEmulatorEnv` 強制指向本機埠、身分寫死 `qa_household`）。
live 的展示家戶改走備份：`pnpm demo:backup` 用同一份 plan 產生 `schemaVersion: 2` 的
備份 JSON，再由使用者在 live 以正常的還原流程匯入。腳本不連 Firestore，不需要服務
帳號。

```bash
pnpm demo:backup -- --household <householdId> --uid <ownerUid> --email <ownerEmail>
```

預設輸出 `examples/demo-backup.json`（gitignore：檔案帶 live uid、email 與餘額）。

`--household` 是 live 家戶 id，`--uid` 是該家戶 owner 帳號的 Auth uid（Firebase
Console → Authentication，或 `node scripts/admin/list-users.js`），`--email` 是同一個
帳號的 email。匯入位置是 `/settings/backup` 的「還原備份」。

- identity 換成 live 擁有者，`createdBy`/`updatedBy` 與 household 的 owner 成員因此
  是真人；還原會覆寫 household 文件，這是成員得以保留的原因。
- 純組裝在 `scripts/qa/demoBackup.ts`，CLI 只負責參數與寫檔；`src/test/demoBackup.test.ts`
  鎖住 plan→payload 的完整對應（每份 seed 文件都要落地），並要求結果通過
  `HouseholdBackupPayloadSchema`，漂移在寫檔前失敗。`--dry-run` 只組裝與驗證，
  `--force` 才覆蓋既有檔案。
- 窗口仍固定在 2025-01～2026-09。展示日與窗口末端的落差不是壞資料：`2026-09` 是
  「尚未開始」的關帳目標月，展示就從那裡開始。
- 第一次匯入後立刻從 live 匯出一份備份；每場展示結束以該檔還原，覆蓋觀眾期間新增
  的資料。

`users` 與 `access_control` 不在備份內：展示帳號仍需具備 whitelist 與 household
成員身分。
