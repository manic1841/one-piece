/**
 * 讀取上限。Firestore 的 `list` 沒有上限時會把整個集合收完，集合隨時間長大
 * （尤其報表與快照）時，延遲與計費就跟著帳齡線性上升。這裡集中放「清單型讀取
 * 最多回幾筆」，避免每個 use case 各自發明數字；哪些讀取該設上限見
 * docs/architecture.md。
 *
 * 每個數字都遠高於單一 household 的實際規模；它的作用是擋住失控成長，不是分頁
 * 機制。真正需要翻頁時（例如交易）另外走 cursor，不靠這裡。
 */

/** 主檔型集合（專案、投資組合、分攤範本、自訂科目）。人手建立，成長極慢。 */
export const MASTER_LIST_LIMIT = 200;

/** 自訂科目要撐起整份標籤對照表，比其他主檔寬鬆。 */
export const LEDGER_CODE_LIST_LIMIT = 1000;

/** 一個帳號可能同時屬於多個家庭，但正常只有個位數。 */
export const HOUSEHOLD_LIST_LIMIT = 50;

/**
 * 快照類歷史。240 個月＝20 年，超過這個範圍的明細在畫面上已經沒有可讀性，
 * 一律由查詢端帶入更窄的期間條件。
 */
export const SNAPSHOT_HISTORY_LIMIT = 240;

/**
 * 已產生報表。一年 12 個月 × 3 種報表 ＝ 36 筆，600 筆約 16 年。
 * 搭配 `yearMonth` 由新到舊排序，截斷才會落在最舊的一端。
 */
export const REPORT_LIST_LIMIT = 600;

/**
 * 關帳期間。一個月一筆，600 筆約 50 年，同樣由新到舊截斷。
 * 關帳與重開要看所有先行期間，所以數字刻意比快照寬。
 */
export const PERIOD_LIST_LIMIT = 600;

/** 退休試算快照。手動儲存，筆數零星。 */
export const PROJECTION_LIST_LIMIT = MASTER_LIST_LIMIT;
