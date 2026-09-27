# 新增 DEBT_PAYMENT,不沿用 LIABILITY_PAYMENT

**狀態：** 已接受
**規範來源：** [debt-accounts.md](../debt-accounts.md) §5.5；[transaction-flow.md](../transaction-flow.md)

LIABILITY_PAYMENT 是通用還款意圖，借貸科目由使用者手動選擇，適合不規則的負債清償。定期貸款還款有兩個特殊需求：本金與利息必須拆分（利息是費用、本金是負債減少，通用意圖只有一筆借方無法處理），且應由系統依 DebtAccount 的利率與剩餘本金自動計算拆分。因此新增特化的 DEBT_PAYMENT。取捨是 IntentType 又多一種特化類型，但換取利息費用能正確反映在報表上。
