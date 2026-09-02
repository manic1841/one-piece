# Implementation Status

This document is the continuation checkpoint for the current implementation work.

## Completed

### Tooling and development environment

The implementation for issue #38 is present on the current branch and has been
validated locally:

- Unit and integration test boundaries are separated.
- Firebase Emulator preflight fails early when the emulator is unavailable.
- Emulator reset failures are propagated instead of being ignored.
- `pnpm lint` is read-only; `pnpm lint:fix` is the explicit mutating command.
- CI runs both unit and Firebase Emulator integration tests.
- The root Docker development stack runs the Vite app and Firebase Emulator.
- Firebase development state is isolated in a named Compose volume.

Validation baseline:

- Unit tests: 55 files, 183 tests passed.
- Integration tests: 1 file, 2 tests passed.
- Lint: 0 errors, 19 existing warnings.
- Production build: passed.
- Docker Compose configuration and diff checks: passed.

Issue #38 was closed after final validation and GitHub bookkeeping.

## Completed Since Checkpoint

### #43–#46 Debt Payment

- ADR-0038 defines command classification, Firestore atomicity, idempotency keys,
   deterministic identities, operation records, retry behavior, retention, and
   cache synchronization.
- Debt Payment validates finite positive amounts, principal limits, balanced
   entries, normal principal/interest splits, and strict interest-only grace
   periods with an inclusive start and exclusive end date.
- Transaction, DebtSnapshot, DebtAccount.currentBalance, and the household
   operation record commit atomically with Firestore optimistic concurrency.
- Caller-generated idempotency keys support replay, conflict detection, and
   failure cleanup; the transaction form reuses one key for retries of one user
   action.
- Focused unit and Firebase Emulator integration coverage was added for domain
   rules, application behavior, atomic persistence, concurrency, replay, conflict,
   independent keys, and failure cleanup.

### #47 Allocation composite creation

- `INCOME` and `EXPENSE` creation with Allocation now uses one application command
   for the Transaction, deterministic Allocation, source link, and successful
   operation result.
- Caller-generated idempotency keys support same-payload replay and stable
   different-payload conflict handling; failed validation and durable writes leave
   no partial command data.
- The transaction form reuses one key for an unchanged retry and keeps ordinary
   no-Allocation Transaction creation on its existing path. Income template
   persistence remains a separate UI-assistance operation.
- Application, domain fingerprint, UI retry, and Firebase Emulator coverage was
   added for permission ordering, validation, INCOME/EXPENSE persistence,
   deterministic identity, rollback, replay, and concurrent retry.

## Remaining Implementation

No implementation remains from the #43–#46 dependency chain.

The next planned work is documented in [Post-#40 Roadmap](post-40-roadmap.md).
The next slice is #48, replacing the current Allocation atomically while keeping
the source Transaction unchanged.

The completed checkpoint listed these issues in order:

1. **#43: Architecture ADR**
   - Define command atomicity and retry policy.
   - Define idempotency keys, deterministic identities, and operation records.
   - Synchronize the debt balance-cache and strict grace-period documentation.

2. **#44: Debt Payment validation**
   - Enforce finite positive payment validation and stable error categories.
   - Implement normal-payment principal/interest rules.
   - Implement strict grace-period interest-only behavior.
   - Add focused domain and application tests without Firebase Emulator.

3. **#45: Atomic Debt Payment persistence**
   - Persist Transaction, DebtSnapshot, and DebtAccount balance atomically.
   - Use Firestore optimistic concurrency for concurrent payments.
   - Add Firebase Emulator integration coverage for success and rollback paths.

4. **#46: Debt Payment idempotency**
   - Require a caller-generated idempotency key.
   - Persist a household-scoped operation record with a versioned payload
     fingerprint and result reference.
   - Return the original result for same-key replays.
   - Reject same-key different-payload reuse with `IDEMPOTENCY_CONFLICT`.
   - Add unit and Firebase Emulator integration coverage for replay, conflict,
     independent keys, and failure cleanup.

Dependency order:

```text
#38 tooling  ->  #43 ADR  ->  #44 validation  ->  #45 atomic persistence  ->  #46 idempotency
```

The historical acceptance criteria remain in the corresponding GitHub issues. New
work should follow [ADR-0038](adr/0038-command-atomicity-and-retry-policy.md) and
[ADR-0039](adr/0039-allocation-atomicity-and-identity.md) before implementation.

## Continue In The Development Container

From the repository root:

```bash
docker compose up --build
```

If host port `5173` is occupied:

```bash
VITE_PORT=5174 docker compose up --build
```

In another terminal, open a shell in the running app container:

```bash
docker compose exec app sh
```

Run checks from the app container:

```bash
pnpm test
pnpm test:integration
pnpm lint
pnpm build
```

The source tree is bind-mounted at `/workspace`. Firebase Emulator is available
inside the Compose network as `firebase`; the published host endpoints are
listed in [the development guide](development-guide.md).

## Git State

- Branch: `refactor/code-review`
- Review base commit: `4b82e42`
- The #38 tooling changes and #43–#46 Debt Payment implementation are committed
   after final validation; issue status is managed separately in GitHub.
- Current committed baseline: `43b2017 feat: make debt payments atomic and idempotent`
