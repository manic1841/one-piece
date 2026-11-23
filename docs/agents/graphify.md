# graphify

Local codebase graph. Used for symbol-level relationship queries — see the
"Codebase graph" rules in `AGENTS.md`, and the `PreToolUse` hooks in
`.claude/settings.json`.

The dev container image installs the CLI (`Dockerfile`, pinned to the version in
`.agents/skills/graphify/.graphify_version`), so `graphify` is already on `PATH`
and `graphify install --project` has already been run — the skill and hooks are
committed. The hooks fail silently if the binary is missing, so a checkout
outside the container still works, just without them.

## Install (outside the dev container)

Requires `uv`. If it is not present:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
```

Then install the tool and the project-scoped skill:

```bash
uv tool install --python 3.12 graphifyy
graphify install --project
```

`uv tool install graphifyy` puts `graphify` in `~/.local/bin`, which must be on `PATH`
for both the CLI and the `PreToolUse` hooks in `.claude/settings.json`. `--python 3.12`
matters: `tree-sitter` ships no wheel for the newest interpreters, so the install falls
back to a source build and fails without a C compiler.

Bump the pinned version in `Dockerfile` together with
`.agents/skills/graphify/.graphify_version`.

## Build

```bash
graphify . --code-only
```

`package.json` is skipped via `.graphifyignore` — its dependency nodes add nothing the source
graph doesn't already carry. Add `--force` when the build now prunes nodes (graphify refuses a
rebuild that yields fewer nodes than the previous graph).

Output goes to `graphify-out/` (gitignored). Rebuild is required on a fresh clone;
after that, `graphify update .` keeps it current incrementally.
