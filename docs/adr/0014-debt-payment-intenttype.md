# 新增 DEBT_PAYMENT,不沿用 LIABILITY_PAYMENT

LIABILITY_PAYMENT 是通用還款意圖,借貸科目由使用者手動選擇,適合不規則的負債清償(如歸還私人借款)。定期貸款還款有兩個特殊需求:本金/利息必須拆分(利息是費用、本金是負債減少,LIABILITY_PAYMENT 只有一筆借方無法處理),且系統應自動根據 DebtAccount 的利率與剩餘本金計算拆分,不應由使用者手動算。新增 DEBT_PAYMENT 作為特化版本,固定產生三筆 entries(Dr. liability:\* / Dr. expense:interest / Cr. asset:cash),需帶入 debtAccountId。取捨是 IntentType 又多一種特化類型,但換取利息費用能正確反映在報表上。
