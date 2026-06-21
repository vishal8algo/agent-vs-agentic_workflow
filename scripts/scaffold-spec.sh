#!/usr/bin/env bash
set -euo pipefail

name="${1:-}"
if [ -z "$name" ]; then
  echo "usage: $0 <feature-name>"
  exit 1
fi

next=$(ls specs/ 2>/dev/null | grep -E '^[0-9]+-' | sed -E 's/^([0-9]+)-.*/\1/' | sort -n | tail -1 || echo "00")
next=$(printf '%02d' $((10#$next + 1)))
dest="specs/${next}-${name}.md"

cp specs/_template.md "$dest"
sed -i.bak "s/\[Feature Name\]/${name}/g" "$dest" && rm "${dest}.bak"

echo "wrote $dest"
