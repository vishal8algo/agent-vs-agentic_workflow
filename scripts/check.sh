#!/usr/bin/env bash
set -euo pipefail

echo "Checking project documentation scaffold..."

required_files=(
  "AGENTS.md"
  "agent-reference.md"
  "conventions.md"
  "docs/product.md"
  "docs/architecture.md"
  "docs/api-contract.md"
  "docs/open-questions.md"
  "docs/roadmap.md"
  "specs/_template.md"
  "specs/_change-request-template.md"
  "specs/01-pr-review-tool.md"
  "specs/02-fixed-workflow-review.md"
  "specs/03-autonomous-agent-review.md"
  "specs/04-comparison-report.md"
)

for file in "${required_files[@]}"; do
  if [ ! -f "$file" ]; then
    echo "missing required file: $file"
    exit 1
  fi
done

if grep -R "TODO" AGENTS.md agent-reference.md conventions.md docs specs >/dev/null 2>&1; then
  echo "found TODO markers in documentation"
  exit 1
fi

echo "Documentation scaffold OK."
