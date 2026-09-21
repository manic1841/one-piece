# incomeCalculationMode 三態設計

## Status

Superseded by [ADR-0057](0057-retirement-v1-flat-amount-fields.md) (2026-09-21)

FIXED(使用者手動輸入,按 baseAmount + growthRate)、IMPORTED(交易分錄導入,按 baseAmount + growthRate)、DERIVED(由另一收入來源衍生,見 ADR-028)。三態涵蓋「純手填」「自動匯入」「跟隨其他收入變動」三種真實情境,避免用單一 growthRate 欄位混淆語意。
