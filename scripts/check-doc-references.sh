#!/usr/bin/env bash
# Fails if a permanent doc references the design staging area.
#
# Permanent docs are everything under docs/ except the staging folder itself, plus
# the root-level docs that ship as source of truth (CONTEXT.md, AGENTS.md).
#
# Blocked references (filename level, so a deleted staging file cannot leave a dead
# link behind):
#   - the staging folder name (new-design / new_design)
#   - the spec package name (one-piece-engineering-spec-v1)
#   - staging filenames: visual-consistency.md, page-review-*, task-plans.md, and
#     NN_Title.md spec files
#   - indirect staging citations ("spec 11", "spec v1", ...)
#
# `prototype/` is intentionally NOT matched: prototype branches are a legitimate,
# permanent pointer (see development-guide 原型捕獲準則).
#
# Usage: check-doc-references.sh [path ...]
#   No arguments  -> scan the repo's permanent docs (CI / pre-commit path).
#   Explicit paths -> scan those paths only (used by the negative-test guard test).
set -euo pipefail

if [ "$#" -gt 0 ]; then
  targets=("$@")
else
  targets=(docs CONTEXT.md AGENTS.md)
fi

for target in "${targets[@]}"; do
  if [ ! -e "$target" ]; then
    echo "docs:check: path not found: $target" >&2
    exit 2
  fi
done

pattern='new[-_]design|one-piece-engineering-spec|visual-consistency\.md|page-review-|task-plans\.md|[0-9]{2}_[A-Za-z][A-Za-z0-9_]*\.md|spec[ 　]?[0-9]{1,2}([^0-9]|$)|spec[ 　]?v[0-9]'

raw=$(grep -rniHE "$pattern" "${targets[@]}" --exclude-dir=new-design --exclude-dir=new_design || true)

# A `prototype/<name>` pointer is legitimate, so blank out those tokens before
# deciding: a prototype branch may legitimately be named after the spec package
# (prototype/one-piece-engineering-spec-v1), and that must not trip the guard.
matches=()
while IFS= read -r line; do
  [ -z "$line" ] && continue
  stripped=$(printf '%s' "$line" | sed -E 's#prototype/[A-Za-z0-9._/-]+#PROTOTYPE_REF#g')
  if printf '%s' "$stripped" | grep -qiE "$pattern"; then
    matches+=("$line")
  fi
done <<< "$raw"

if [ "${#matches[@]}" -gt 0 ]; then
  echo "Permanent docs must not reference the design staging area:"
  printf '%s\n' "${matches[@]}"
  exit 1
fi

echo "docs:check OK"
