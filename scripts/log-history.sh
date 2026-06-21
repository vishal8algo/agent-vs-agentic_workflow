#!/usr/bin/env bash
set -euo pipefail

mkdir -p logs
today="$(date -u +%Y-%m-%d)"
hash="$(git rev-parse --short HEAD 2>/dev/null || echo no-git)"
subject="$(git log -1 --pretty=%s 2>/dev/null || echo manual-entry)"

{
  echo "- ${today} ${hash} ${subject}"
} >> logs/history.md
