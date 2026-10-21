# 退休系統設計與資料流

> 本文件描述退休計畫與現金流投影：計畫是可重複使用的假設模板，投影是凍結的計算結果。決策理由見 [ADR-0083](adr/0083-projection-is-frozen-plan-is-template.md) 至 [ADR-0089](adr/0089-delete-legacy-no-migration.md)。

本文件的章節骨架已定，各章內容隨重設計實作補齊；資料結構的欄位清單住在 [data-structure.md](data-structure.md)。

## 1. 系統目標與範圍

退休功能要回答「照這組假設走到預期壽命會發生什麼」，並把答案凍結下來供日後閱讀。本章要說清楚計畫與投影的分工，以及它不取代實際記帳。

## 2. 資料模型

`retirementPlans` 是單一文件，`projections` 是它的三份固定子文件；兩者的集合路徑、寫入與刪除邊界。

## 3. 投影假設

五個必填假設欄位、`birthYear` 錨定與 `currentAge` 推導、比率以小數儲存、驗證時機。

## 4. 投影規則與 Method

規則的來源與方向正交、Method 的判別聯集、`debtAmortization` 只計現金流出、結束年度語意；債務如何被匯入成規則。

## 5. 人生事件與 Phase

事件無來源、Phase 必填且排序不重疊、成長率缺省跟隨假設。

## 6. 基準解析與錯誤語意

期初餘額的推導與手動覆寫、規則基準取淨額、`MISSING_BASELINE`、時序異常只警告。

## 7. 投影引擎與輸出

純函式契約、報酬套期初、破產續算不歸零、逐年 breakdown 與六欄 summary、null 哨兵。

## 8. 投影工作區與唯讀檢視

設定到預覽的兩階段、計算不落地、dirty 攔截、三 tab 唯讀檢視、`engineVersion` 過舊提示。

`CALCULATE` 是 setup 的唯一前進動作：先以共用 plan schema 驗證三群組與期初，失敗時一次露出全部行內錯誤且不換階段；通過後才跑解析與引擎。解析錯誤全數列出且不落庫，警告列在結果區上方但不阻擋儲存。結果含六欄 summary、淨資產軌跡與逐年 breakdown；未計算時結果區不佔位。

寫入只發生在預覽的 `SAVE` dialog：名稱必填、預填工作區名稱或本地時間戳，儲存中停在 dialog 且 Esc／背景點擊無效。失敗顯示 `RETRY`，成功關閉、留在預覽、顯示檢視頁連結，並以最後名稱預填下一次。`BACK TO SETUP` 只丟棄結果，不動草稿。

`/retirement` 只列投影，固定欄序、名稱後接 `engineVersion` 過舊 glyph，淨資產為 null 時顯示破折號。頁首唯一的建立入口是 `NEW PROJECTION`；空清單不出現表頭或行動連結。

`/retirement/projections/:id` 唯讀：只有名稱可改，其餘設定與結果皆不可編輯。`SOURCE` 從 `config` 文件溯源，`PROJECTION` 呈現歷史輸出。過舊投影顯示重算提示並連回工作區；`SAVE AS PLAN` 以新 plan schema 建立可重用 plan，`Danger Zone` 刪除投影。

`?from=` 會預載來源投影的設定與結果，但期初淨資產仍即時重算；來源缺失時留白並提示。手動改期初或重新解析後的衍生值會蓋過預載，後續編輯以修改後的內容為準。

## 9. 備份與還原

`projections` 以三份固定子文件進入 payload、還原沿用原 id、v1 備份直接拒絕。

## 10. 驗證重點

schema 邊界、環偵測、原子性與錯誤碼。建立投影另驗：計算被無效輸入擋下且全數錯誤可見、警告與結果並存、儲存 dialog 的必填／loading／失敗重試／成功連結與重新預填，以及 `PROJECTION_TOO_LARGE`、`PROJECTION_WRITE_FAILED` 的穩定對應。
