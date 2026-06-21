#!/usr/bin/env bash
set -euo pipefail

name="${1:-}"
if [ -z "$name" ]; then
  echo "usage: $0 <cr-name>"
  exit 1
fi

next=$(ls specs/ 2>/dev/null | grep -E '^cr-[0-9]+-' | sed -E 's/^cr-([0-9]+)-.*/\1/' | sort -n | tail -1 || echo "00")
next=$(printf '%02d' $((10#$next + 1)))
dest="specs/cr-${next}-${name}.md"

cp specs/_change-request-template.md "$dest"
sed -i.bak "s/CR-NN/CR-${next}/g; s/\[short name\]/${name}/g" "$dest" && rm "${dest}.bak"

echo "wrote $dest"
