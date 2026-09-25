# Monthly close reopen and cascade demotion

**日期：** 2026-09-24
**狀態：** 已接受
**規範來源：** [monthly-close.md](../monthly-close.md) §2（`重新開啟`、`連鎖降級` 段）

Reopening a closed monthly close was requested: a user may need to correct
history after the period was finalized. We decided reopening withdraws only
the finalize decision — the period returns to `IN_PROGRESS` with Financial
Reports and Close Period reset to `PENDING` (reports regenerate and the period
is re-closed through normal confirmation), while earlier completed stages are
kept. Because a later closed period may rest on pre-correction history,
reopening a period also demotes every later `CLOSED` period to `NEEDS_REVIEW`
with `reviewSourceStageId = null`; those periods never auto-restore and are
recovered by manually reopening them through the same confirm-dialog flow.

Considered options: a new `REOPENED` status value (rejected — indistinguishable
from `IN_PROGRESS` in every consumer), resetting all nine stages to `PENDING`
(rejected — loses confirmation history and risks duplicate ledger entries from
re-running transaction stages), and cascading to all later periods regardless
of status (rejected — `IN_PROGRESS`/`OPEN` periods have no finalized output to
invalidate; their Financial Reports confirmation computes from corrected data).

Consequences: the reopen guard accepts both `CLOSED` and cascade-demoted
(`NEEDS_REVIEW` with `reviewSourceStageId = null`) periods, which is the
marker distinguishing a cascade pause from a Completeness Check pause; the
reopened period and its cascade demotions commit in a single Firestore batch,
so the reopen is all-or-nothing; the Dashboard's "latest closed month" anchor
temporarily falls back to the previous closed period until the reopened month
is re-closed.
