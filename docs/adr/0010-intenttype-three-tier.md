# IntentType 分三層

日常記帳(EXPENSE / INCOME)佔 90% 使用頻率,需要極度簡化,使用者只選分類,系統自動產生借貸分錄,不需要懂會計。但人生中偶爾會有特殊財務事件(買房、借款、還貸款),這些交易的借貸 type 固定,使用者只需從該 type 下選具體科目(ASSET_PURCHASE、LIABILITY_BORROW、LIABILITY_PAYMENT)。極少數完全不規則的交易走 MANUAL 進階模式,系統只驗證借貸平衡。取捨是三層設計比單一模式複雜,但換取 80% 日常無感、20% 特殊情況有路可走。
