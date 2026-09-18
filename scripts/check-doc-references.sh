#!/usr/bin/env bash
# Fails if any permanent doc under docs/ references the new-design staging folder.
set -euo pipefail

hits=$(grep -rnE 'new[-_]design|one-piece-engineering-spec' docs --exclude-dir=new-design || true)

if [ -n "$hits" ]; then
  echo "docs/ (excluding new-design/) must not reference the design staging folder:"
  echo "$hits"
  exit 1
fi

echo "docs:check OK"
