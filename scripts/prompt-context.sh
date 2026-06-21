#!/usr/bin/env bash
set -euo pipefail

print_if_exists() {
  local file="$1"
  if [ -f "$file" ]; then
    echo "# === $file ==="
    cat "$file"
    echo ""
  fi
}

print_if_exists AGENTS.md
print_if_exists agent-reference.md
print_if_exists conventions.md
print_if_exists docs/product.md
print_if_exists docs/open-questions.md
