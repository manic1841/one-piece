## Agent skills

### Issue tracker

Issues and specs live as GitHub issues; use the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five canonical triage labels. The label list lives only in `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo with root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

## Codebase graph

`graphify` ships in the dev container image. `graphify-out/` (gitignored) is built once per clone with `graphify . --code-only`; install and rebuild rules live in `docs/agents/graphify.md`.

- Symbol-level questions — who calls or imports what, blast radius — start with `graphify explain "<symbol>"` or `graphify path "<A>" "<B>"` instead of grepping. Subagent prompts that explore code start the same way.
- After changing code, run `graphify update .`.
- Exact-text search stays `grep`.

## Simplicity First

Write the minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No flexibility or configurability that wasn't requested.
- No error handling for scenarios that cannot happen.
- If 200 lines could be 50, rewrite it.

Test: would a senior engineer call this overcomplicated? If yes, simplify.

For trivial changes (typo, obvious one-liner), use judgment; not every change needs this rigor.
