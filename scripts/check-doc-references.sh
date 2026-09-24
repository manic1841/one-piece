#!/usr/bin/env bash
# Fails if a permanent doc references the design staging area, if a parallel
# docs directory exists, or if the retired staging area has been recreated.
#
# Permanent docs are everything under docs/, plus the root-level docs that ship as
# source of truth (CONTEXT.md, AGENTS.md).
#
# Blocked references (filename level, so a deleted staging file cannot leave a dead
# link behind):
#   - the staging folder name (new-design / new_design)
#   - the spec package name (one-piece-engineering-spec-v1)
#   - staging filenames: visual-consistency.md, page-review-*, task-plans.md, and
#     NN_Title.md spec files
#   - indirect staging citations ("spec 11", "spec v1", ...)
#
# The design staging area is retired (issue #172): the repo must not carry a
# staging folder at all, so its re-creation fails the check even when no permanent
# doc points at it.
#
# `prototype/` is intentionally NOT matched: prototype branches are a legitimate,
# permanent pointer (see development-guide 原型捕獲準則).
#
# Usage: check-doc-references.sh [path ...]
#   No arguments  -> scan the repo's permanent docs (CI / pre-commit path).
#   Explicit paths -> scan those paths only (used by the negative-test guard test).
set -euo pipefail

# The docs tree is the single source of truth. A parallel docs directory
# (docs_v2, docs-new, docs_old, ...) would create a second source of truth, so
# any top-level directory whose name starts with `docs` fails the check. This
# generalizes the retired design staging area (issue #172), which was one
# instance of the same shape; the named path below stays as a regression guard.
while IFS= read -r parallel; do
  echo "docs:check: a parallel docs directory must not exist: ${parallel#./}" >&2
  exit 1
done < <(find . -maxdepth 1 -type d -name 'docs*' ! -name 'docs' 2>/dev/null)

# The staging area was retired, so it must not exist in any form.
for staging in docs/new-design docs/new_design; do
  if [ -e "$staging" ]; then
    echo "docs:check: the design staging area must not exist: $staging" >&2
    exit 1
  fi
done

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

raw=$(grep -rniHE "$pattern" "${targets[@]}" || true)

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
