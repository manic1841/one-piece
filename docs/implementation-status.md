# Implementation Status

This document is the continuation checkpoint for the current implementation work.

## Completed

### Tooling and development environment

The implementation for issue #38 is present in the working tree and has been
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

The #38 changes are not committed yet, and issue #38 remains open pending final
review and GitHub bookkeeping.

## Remaining Implementation

Work through these issues in order:

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

The full acceptance criteria remain in the corresponding GitHub issues. Do not
close an issue until its acceptance criteria and focused validation are complete.

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

## Git State At Checkpoint

- Branch: `refactor/code-review`
- Base commit: `4b82e42`
- Current #38 implementation and Docker changes: uncommitted working-tree changes
- `CONTEXT.md`: existing untracked domain glossary; preserve it
