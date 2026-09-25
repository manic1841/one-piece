# 債務月紀錄可修正：同鍵重新確認覆蓋當月紀錄

**日期：** 2026-09-24
**狀態：** 已實作
**規範來源：** [monthly-close.md](../monthly-close.md) §4（債務還款列與顯示契約）；[transaction-flow.md](../transaction-flow.md) Debt Payment Retry Rule

Monthly Close 的債務還款階段原本「已完成即拒絕重新確認」，冪等鍵由期間、帳戶、金額、日期衍生；使用者改錯金額後無法在同一期間修正。我們決定把債務還款列入可重確認階段：冪等鍵改為期間 × 帳戶（不含金額與日期），同鍵未變更 payload 冪等返回、變更 payload 覆蓋當月紀錄（前筆交易刪除、快照與餘額重算）、清零（總繳款 0）取代成無還款，全部在同一筆 Firestore transaction 內。取代分支讓寫入路徑多出 delete 與讀寫順序限制（transactions 要求所有 reads 先於 writes，前筆交易在快照 upsert 之後刪除）；換取修正語意與帳戶餘額、證券買入／賣出一致，且重複確認不重複入帳。本決定同時把 ADR-0052 的「債務還款階段不納入可重確認」修訂為納入。
