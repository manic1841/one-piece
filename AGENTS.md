## Agent skills

### Issue tracker

Issues and specs live as GitHub issues; use the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five canonical triage labels. The label list lives only in `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repo with root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

## Codebase graph

A local knowledge graph of this repo can be built to `graphify-out/` (gitignored) with `graphify . --code-only`; install steps are in `docs/agents/graphify.md`. Build it before relying on any of the commands below.

- For symbol-level relationships — who calls or imports what, blast radius of changing a component — run `graphify explain "<symbol>"` or `graphify path "<A>" "<B>"` before grepping.
- For full-text or cross-cutting keyword search, `grep` is still faster and more complete than `graphify query`.
- After changing code, run `graphify update .` (about a second, AST-only, no API cost).
- Subagent prompts that explore code should start with `graphify explain`.

## Simplicity First

Write the minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No flexibility or configurability that wasn't requested.
- No error handling for scenarios that cannot happen.
- If 200 lines could be 50, rewrite it.

Test: would a senior engineer call this overcomplicated? If yes, simplify.

For trivial changes (typo, obvious one-liner), use judgment; not every change needs this rigor.
