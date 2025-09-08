#!/usr/bin/env python3
"""
Clean up unused imports based on dead-code-check.json results
"""

import json
import re
from pathlib import Path

def remove_unused_imports():
    """Remove unused imports based on dead-code-check.json results"""
    
    # Read the dead code results
    results_file = Path("test-results/dead-code-check.json")
    if not results_file.exists():
        print("No dead code results found. Run dead code checker first.")
        return
    
    with open(results_file) as f:
        results = json.load(f)
    
    # Group issues by file - only unused imports
    issues_by_file = {}
    for issue in results["issues"]:
        if issue["type"] == "unused_import":
            file_path = Path("src") / issue["file"]
            if file_path not in issues_by_file:
                issues_by_file[file_path] = []
            issues_by_file[file_path].append({
                "line": issue["line"],
                "symbol_name": issue["symbol_name"]
            })
    
    print(f"Processing {len(issues_by_file)} files with unused imports...")
    
    # Process each file
    for file_path, issues in issues_by_file.items():
        if not file_path.exists():
            print(f"Skipping {file_path} - file not found")
            continue
            
        print(f"Fixing {file_path} - {len(issues)} issues")
        
        # Read file content
        with open(file_path, 'r') as f:
            lines = f.readlines()
        
        # Sort issues by line number (descending) to avoid line number shifts
        issues.sort(key=lambda x: x["line"], reverse=True)
        
        # Remove unused imports
        for issue in issues:
            line_idx = issue["line"] - 1  # Convert to 0-based index
            if line_idx >= len(lines):
                print(f"Warning: Line {issue['line']} out of range in {file_path}")
                continue
                
            line = lines[line_idx]
            symbol_name = issue["symbol_name"]
            
            # Handle different import patterns
            patterns_to_try = [
                # Single named import: import { foo } from 'bar'
                (rf'import\s*\{{\s*{re.escape(symbol_name)}\s*\}}\s*from\s*["\'][^"\']*["\'];?\s*\n?', ''),
                # Named import in list: import { foo, bar } from 'baz' -> import { bar } from 'baz'
                (rf'(\s*{re.escape(symbol_name)}\s*,\s*)', ''),
                (rf'(,\s*{re.escape(symbol_name)}\s*)', ''),
                # Type import: import type { Foo } from 'bar'
                (rf'import\s+type\s*\{{\s*{re.escape(symbol_name)}\s*\}}\s*from\s*["\'][^"\']*["\'];?\s*\n?', ''),
                # Type in list: import type { foo, bar } -> import type { bar }
                (rf'(\s*{re.escape(symbol_name)}\s*,\s*)', ''),
                (rf'(,\s*{re.escape(symbol_name)}\s*)', ''),
            ]
            
            original_line = line
            line_modified = False
            
            for pattern, replacement in patterns_to_try:
                new_line = re.sub(pattern, replacement, line, flags=re.MULTILINE)
                if new_line != line:
                    line = new_line
                    line_modified = True
                    break
            
            if line_modified:
                lines[line_idx] = line
                print(f"  Line {issue['line']}: Removed unused import '{symbol_name}'")
            else:
                print(f"  Line {issue['line']}: Could not remove unused import '{symbol_name}' - pattern not matched")
                print(f"    Line content: {repr(original_line.strip())}")
        
        # Clean up any empty import lines
        cleaned_lines = []
        for line in lines:
            # Remove lines that are now just "import {} from 'somewhere';"
            if re.match(r'^\s*import\s*\{\s*\}\s*from\s*["\'][^"\']*["\'];?\s*$', line):
                continue
            # Remove lines that are now just "import type {} from 'somewhere';"
            if re.match(r'^\s*import\s+type\s*\{\s*\}\s*from\s*["\'][^"\']*["\'];?\s*$', line):
                continue
            cleaned_lines.append(line)
        
        # Write back the file
        with open(file_path, 'w') as f:
            f.writelines(cleaned_lines)

if __name__ == "__main__":
    remove_unused_imports()
    print("Done! Run dead code checker again to verify.")