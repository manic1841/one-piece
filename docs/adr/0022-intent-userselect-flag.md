# Intent 定義加入 userSelect flag

**狀態：** 已接受
**規範來源：** [transaction-flow.md](../transaction-flow.md) Intent Type Notes

部分 intent 的借貸科目需要使用者在表單選擇具體子科目（選哪筆不動產、選哪個人的收入科目），而非 hardcode。作法是讓 intent map 帶上「使用者選科目」的旗標與允許前綴，原本 hardcode 的科目保留作為 fallback，使用者尚未建立子科目時仍可正常運作。
