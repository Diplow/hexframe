#!/bin/bash
# Find folders with 500-1000 lines

for dir in src/app/map/* src/lib/domains/* src/server/* src/components/*; do
  if [ -d "$dir" ]; then
    lines=$(find "$dir" -maxdepth 1 -name "*.ts" -o -name "*.tsx" 2>/dev/null | grep -v test | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo 0)
    if [ "$lines" -gt 500 ] && [ "$lines" -lt 1000 ]; then
      echo "$dir: $lines lines (warning threshold)"
    fi
  fi
done