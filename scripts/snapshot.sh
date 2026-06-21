#!/usr/bin/env bash
set -euo pipefail

out="docs/snapshots/state-$(date -u +%Y-%m-%d).md"
mkdir -p "$(dirname "$out")"

{
  echo "# Project snapshot - $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo ""
  echo "## Specs"
  find specs -maxdepth 1 -type f -name '*.md' 2>/dev/null | sort || true
  echo ""
  echo "## Docs"
  find docs -maxdepth 2 -type f -name '*.md' 2>/dev/null | sort || true
  echo ""
  echo "## Recent commits"
  git log -10 --pretty=format:'%h %s' 2>/dev/null || echo "(not a git repository)"
  echo ""
  echo "## Open OQR items"
  grep -E '^\| Q[0-9]+ \| OPEN ' docs/open-questions.md 2>/dev/null || echo "(none open)"
} > "$out"

echo "wrote $out"
