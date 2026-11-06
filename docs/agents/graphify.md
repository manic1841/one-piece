# graphify

Optional local codebase graph. Used for symbol-level relationship queries — see the
"Codebase graph" rules in `AGENTS.md`. Nothing else in the repo depends on it, and the
hooks fail silently if the binary is missing, so install it only if you want it.

## Install

Requires `uv`. If it is not present:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
```

Then install the tool and the project-scoped skill:

```bash
uv tool install graphifyy
graphify install --project
```

`uv tool install graphifyy` puts `graphify` in `~/.local/bin`, which must be on `PATH`
for both the CLI and the `PreToolUse` hooks in `.claude/settings.json`.

## Build

```bash
graphify . --code-only
```

Output goes to `graphify-out/` (gitignored). Rebuild is required on a fresh clone;
after that, `graphify update .` keeps it current incrementally.
