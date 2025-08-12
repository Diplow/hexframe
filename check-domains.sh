#!/bin/bash

echo "Checking domains..."
for domain in agentic iam mapping utils; do
  dir="src/lib/domains/$domain"
  if [ -d "$dir" ]; then
    # Count lines (non-recursive, only direct files)
    lines=$(find "$dir" -maxdepth 1 -type f \( -name "*.ts" -o -name "*.tsx" \) -not -name "*.test.*" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo 0)
    echo ""
    echo "$domain: $lines lines (direct files only)"
    
    # Check for required files
    [ -f "$dir/interface.ts" ] && echo "  ✓ interface.ts" || echo "  ✗ interface.ts"
    [ -f "$dir/dependencies.json" ] && echo "  ✓ dependencies.json" || echo "  ✗ dependencies.json"
    [ -f "$dir/README.md" ] && echo "  ✓ README.md" || echo "  ✗ README.md"
    [ -f "$dir/ARCHITECTURE.md" ] && echo "  ✓ ARCHITECTURE.md" || echo "  ✗ ARCHITECTURE.md"
  fi
done