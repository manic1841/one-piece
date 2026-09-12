# Authorization Gap Inventory: Settlement, Report & Trend Paths

Issue: #54
Parent: #39 (Phase 2: Persistence And Access Boundaries)
Input to: #37 (Standardize application-layer authorization)

## Scope

User-facing settlement, report, and trend use cases that do NOT consistently
receive `AuthContext` or call the household permission service. This document
catalogs the current state, Firestore-rules coverage, and recommended contracts.

## Permission semantics

- `assertReadPermission` — any household member (owner/admin/member). Read.
- `assertWritePermission` — household admin or owner only. Write.
- Both short-circuit for `isGlobalAdmin`.

## Inventory

### Settlement use cases

| Use case | AuthContext? | Permission call | Permission | Firestore rules guard? |
|---|---|---|---|---|
| `previewProjectSettlementsUseCase` | No | None | None | Yes (read: member) |
| `settleProjectsUseCase` | No | None | None | Yes (write: admin) |
| `settleDebtAccountsUseCase` | No | None | None | Yes (write: admin) |
| `previewDebtSettlementsUseCase` | No | None | None | Yes (read: member) |

### Report use cases

| Use case | AuthContext? | Permission call | Permission | Firestore rules guard? |
|---|---|---|---|---|
| `previewFinancialReportsWorkflow` | Yes | `assertReadPermission` | Read | Yes (read: member) |
| `generateFinancialReportsUseCase` | Yes | `assertWritePermission` | Write | Yes (write: admin) |
| `getStoredReportUseCase` | No | None | None | Yes (read: member) |
| `getSettlementReadinessUseCase` | Yes | None (delegated) | Indirect | Yes (read: member) |

### Trend use cases

| Use case | AuthContext? | Permission call | Permission | Firestore rules guard? |
|---|---|---|---|---|
| `getTrendDataUseCase` | Partial (inline shape) | None (delegated) | Indirect (read) | Yes (read: member) |
| `listReportsUseCase` | Partial (inline shape) | `assertReadPermission` | Read | Yes (read: member) |

## Gap analysis

### High risk: settlement write paths without app-level auth

`settleProjectsUseCase` and `settleDebtAccountsUseCase` mutate data
(project snapshots, debt snapshots) without application-layer permission
checks. They rely entirely on Firestore rules. If any repository call
bypasses the caller's auth token (admin SDK, service account, emulator
context), there is no app-level guardrail.

**Recommendation:** Add `AuthContext` to request types. Call
`assertWritePermission` before mutation. These are write operations
that create persistent snapshots.

### Medium risk: settlement/report read paths without app-level auth

`previewProjectSettlementsUseCase`, `previewDebtSettlementsUseCase`, and
`getStoredReportUseCase` read data without permission checks. Firestore
rules guard these at the DB layer, but the application layer should
enforce its own contract for defense-in-depth.

**Recommendation:** Add `AuthContext` to request types. Call
`assertReadPermission` at the start of each.

### Low risk: type-consistency drift

`getTrendDataUseCase` and `listReportsUseCase` use an ad-hoc
`{ uid, isGlobalAdmin }` inline shape instead of the shared `AuthContext`
type. Functionally equivalent, but inconsistent with the report use
cases that use `AuthContext`.

**Recommendation:** Migrate to `AuthContext` type for consistency.

### UI-side gap: fabricated auth in PortfolioForm (fixed)

`PortfolioForm` called `fetchAccounts(householdId, { uid: '', email: '',
isGlobalAdmin: true }, ...)` — a fabricated identity that skipped
`assertReadPermission` in `getAccountsUseCase` and granted global-admin
read scope to any signed-in user of the household page. This was not an
application-layer contract violation (the use case still ran), but the
caller bypassed the permission check that every other `fetchAccounts`
call site performs.

**Resolution:** The component now passes the real `AuthContext` from
`useAuthContext()`, so `getAccountsUseCase` enforces
`assertReadPermission` for this call site like everywhere else.

### Indirect auth: delegation chains

`getSettlementReadinessUseCase` accepts `AuthContext` but performs no
direct permission check. It fans out to `getAccountsUseCase`,
`listPortfoliosUseCase`, `listDebtAccountsUseCase`, and
`listProjectsUseCase`. Auth coverage depends on those delegates.

**Recommendation:** Verify each delegate calls `assertReadPermission`.
Add a direct `assertReadPermission` at the entry point for
defense-in-depth.

## Recommended contract

For #37 standardization:

1. Every user-facing use case accepts `auth: AuthContext` in its request.
2. Read-side use cases call `assertReadPermission` at entry.
3. Write-side use cases call `assertWritePermission` at entry.
4. Firestore rules remain as the second layer of defense.
5. Delegated use cases should still check at their own entry point,
   not rely solely on delegates.

## No production changes

This is a documentation-only deliverable. Implementation of the
recommended contracts is deferred to #37.
