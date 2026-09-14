# Implementation Status

This document is the working checkpoint for agent implementation sessions.
Historical per-issue records live in the GitHub issue tracker; design decisions
live in `docs/adr/`; schema and testing facts live in `docs/data-structure.md`
and `docs/testing.md`. This file only records what is done on the current
branch and what is next.

## Current Checkpoint

### #93 Watch list domain and settings management (commit b8c8096)

- Watch list is an independent domain (ADR-0048): households/{id}/watchList with
  one document per watched object, doc ID namespaced by target type
  (`PROJECT`/`LEDGER_CODE`/`DEBT_ACCOUNT` + target id) so ledger codes with ':'
  do not collide.
- The settings page household section gains a management card that adds and
  removes all three target types from their existing lists (projects, system
  and custom ledger codes, active debt accounts); display labels come from
  `src/ui/constants/watchListLabels.ts` as the single source.
- Completeness checking is a derived behavior and remains a later ticket; the
  list itself is data with no write path beyond add/remove.
- Firestore security rules tests cover the watch list authorization matrix
  (anonymous/non-member denied, member read-only, owner/admin read-write);
  repository persistence is covered by emulator integration tests.

Validation baseline:

- Unit tests: 90 files, 389 tests passed.
- Integration tests: 16 files, 125 tests passed.
- Lint: 0 errors, 1 existing warning.
- Production build: passed.

## Next

- Completeness checking (parent #92, settlement soft gate) reads the watch
  list before settlement and is a separate ticket.
