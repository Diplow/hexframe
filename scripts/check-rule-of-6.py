#!/usr/bin/env python3
"""
Rule of 6 Enforcement Script

Validates adherence to the Rule of 6 architecture principle:
- Max 6 items per directory (files/subdirectories)
- Max 6 functions per file
- Max 50 lines per function (flexible for low-level code)
- Max 3 arguments per function (or 1 object with max 6 keys)

Usage:
    python3 scripts/check-rule-of-6.py [path]
    pnpm check:rule-of-6 [path]
"""

import os
import re
import sys
import time
from pathlib import Path
from typing import Dict, List, Set, Optional, Tuple, NamedTuple
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict


@dataclass
class Function:
    """Represents a function in a TypeScript file."""
    name: str
    line_start: int
    line_end: int
    line_count: int
    arg_count: int
    file_path: Path


@dataclass
class DirectoryInfo:
    """Information about a directory."""
    path: Path
    item_count: int
    items: List[str] = field(default_factory=list)


@dataclass
class FileInfo:
    """Information about a TypeScript file."""
    path: Path
    line_count: int
    function_count: int
    functions: List[Function] = field(default_factory=list)


class RuleOf6Error:
    """Represents a Rule of 6 violation."""
    def __init__(self, message: str, severity: str = "error"):
        self.message = message
        self.severity = severity


class RuleOf6Checker:
    """Validates adherence to the Rule of 6 architecture principle."""
    
    def __init__(self, target_path: str = "src"):
        self.target_path = Path(target_path)
        self.max_directory_items = 6
        self.max_functions_per_file = 6
        self.max_function_lines = 50
        self.max_function_args = 3
        self.max_object_keys = 6
        
        self.errors: List[RuleOf6Error] = []
        self.warnings: List[RuleOf6Error] = []
        self.exceptions: Set[str] = set()
        
        self._load_exceptions()
    
    def _load_exceptions(self) -> None:
        """Load Rule of 6 exceptions from .rule-of-6-ignore file."""
        ignore_file = Path(".rule-of-6-ignore")
        if ignore_file.exists():
            with open(ignore_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        self.exceptions.add(line)
        else:
            # Default exceptions
            self.exceptions.update([
                "node_modules/**",
                ".next/**",
                ".git/**",
                "dist/**",
                "build/**",
                "**/__tests__/**",
                "**/*.test.ts",
                "**/*.test.tsx",
                "**/*.spec.ts",
                "**/*.spec.tsx",
                "**/*.stories.ts",
                "**/*.stories.tsx",
                # Database schema files often have many exports
                "src/server/db/schema/**",
                # Type definition files
                "**/types.ts",
                "**/types/**",
            ])
    
    def _is_exception(self, path: Path) -> bool:
        """Check if path matches any exception pattern."""
        path_str = str(path)
        return any(
            self._matches_pattern(path_str, pattern) 
            for pattern in self.exceptions
        )
    
    def _matches_pattern(self, path_str: str, pattern: str) -> bool:
        """Check if path matches a glob-like pattern."""
        if "**" in pattern:
            # Convert ** pattern to regex
            regex_pattern = pattern.replace("**", ".*").replace("*", "[^/]*")
            return bool(re.search(regex_pattern, path_str))
        elif "*" in pattern:
            regex_pattern = pattern.replace("*", "[^/]*")
            return bool(re.search(regex_pattern, path_str))
        else:
            return pattern in path_str
    
    def _is_test_file(self, file_path: Path) -> bool:
        """Check if file is a test file."""
        file_str = str(file_path)
        return any(pattern in file_str for pattern in [
            ".test.", ".spec.", "__tests__/", ".stories."
        ])
    
    def _count_directory_items(self, directory: Path) -> DirectoryInfo:
        """Count items in a directory."""
        if not directory.is_dir():
            return DirectoryInfo(path=directory, item_count=0)
        
        items = []
        try:
            for item in directory.iterdir():
                # Skip hidden files and common build artifacts
                if item.name.startswith('.'):
                    continue
                if item.name in ['node_modules', 'dist', 'build', '__pycache__']:
                    continue
                items.append(item.name)
        except PermissionError:
            return DirectoryInfo(path=directory, item_count=0)
        
        return DirectoryInfo(
            path=directory,
            item_count=len(items),
            items=items
        )
    
    def _extract_functions(self, content: str, file_path: Path) -> List[Function]:
        """Extract function information from file content."""
        functions = []
        lines = content.split('\n')
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('//') or line.startswith('/*'):
                i += 1
                continue
            
            # Function declaration patterns (more specific to avoid control flow)
            func_patterns = [
                r'(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)',  # function declarations
                r'(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>',  # arrow functions
                r'(\w+)\s*:\s*(?:async\s*)?\(([^)]*)\)\s*=>',  # object method arrow functions
                r'(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{',  # class methods
            ]
            
            # Keywords to exclude (control flow, etc.)
            excluded_keywords = {
                'if', 'else', 'for', 'while', 'switch', 'case', 'default', 'try', 'catch', 
                'finally', 'with', 'return', 'throw', 'break', 'continue', 'do', 'typeof',
                'instanceof', 'in', 'new', 'delete', 'void', 'yield', 'await'
            }
            
            function_match = None
            for pattern in func_patterns:
                match = re.search(pattern, line)
                if match:
                    func_name = match.group(1)
                    # Skip if it's a control flow keyword
                    if func_name.lower() not in excluded_keywords:
                        function_match = match
                        break
            
            if function_match:
                func_name = function_match.group(1)
                args_str = function_match.group(2) if len(function_match.groups()) > 1 else ""
                
                # Count arguments
                args = [arg.strip() for arg in args_str.split(',') if arg.strip()]
                # Filter out empty args and type annotations
                real_args = []
                for arg in args:
                    # Remove type annotations and default values
                    arg = arg.split(':')[0].split('=')[0].strip()
                    if arg and arg != '':
                        real_args.append(arg)
                
                arg_count = len(real_args)
                
                # Find function end and count lines
                line_start = i + 1
                brace_count = 0
                line_end = i + 1
                found_opening_brace = False
                
                # Look for opening brace
                for j in range(i, min(i + 5, len(lines))):  # Check next few lines
                    if '{' in lines[j]:
                        found_opening_brace = True
                        brace_count = lines[j].count('{') - lines[j].count('}')
                        break
                
                if found_opening_brace:
                    # Find matching closing brace
                    j = i + 1
                    while j < len(lines) and brace_count > 0:
                        brace_count += lines[j].count('{') - lines[j].count('}')
                        j += 1
                    line_end = j
                else:
                    # Arrow function or single line
                    line_end = i + 1
                    for j in range(i + 1, min(i + 10, len(lines))):
                        if lines[j].strip().endswith(';') or lines[j].strip().endswith(','):
                            line_end = j + 1
                            break
                
                line_count = line_end - line_start + 1
                
                functions.append(Function(
                    name=func_name,
                    line_start=line_start,
                    line_end=line_end,
                    line_count=line_count,
                    arg_count=arg_count,
                    file_path=file_path
                ))
            
            i += 1
        
        return functions
    
    def _analyze_file(self, file_path: Path) -> FileInfo:
        """Analyze a TypeScript file for Rule of 6 violations."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            functions = self._extract_functions(content, file_path)
            
            return FileInfo(
                path=file_path,
                line_count=len(content.split('\n')),
                function_count=len(functions),
                functions=functions
            )
            
        except (UnicodeDecodeError, OSError):
            return FileInfo(
                path=file_path,
                line_count=0,
                function_count=0
            )
    
    def _check_directory_rule(self) -> None:
        """Check that directories have max 6 items."""
        print("Checking directory item counts...")
        
        for directory in self.target_path.rglob("*"):
            if not directory.is_dir():
                continue
                
            if self._is_exception(directory):
                continue
            
            dir_info = self._count_directory_items(directory)
            
            if dir_info.item_count > self.max_directory_items:
                items_list = ", ".join(dir_info.items[:8])  # Show first 8 items
                if len(dir_info.items) > 8:
                    items_list += "..."
                
                self.errors.append(RuleOf6Error(
                    f"❌ Directory {directory.relative_to(self.target_path) if directory != self.target_path else '.'} "
                    f"has {dir_info.item_count} items (max {self.max_directory_items})\n"
                    f"   Items: {items_list}\n"
                    f"   → Consider grouping related items into subdirectories"
                ))
    
    def _check_file_function_rule(self) -> None:
        """Check that files have max 6 functions."""
        print("Checking file function counts...")
        
        # Find all TypeScript files
        ts_files = []
        for pattern in ["**/*.ts", "**/*.tsx"]:
            ts_files.extend(self.target_path.glob(pattern))
        
        # Filter out exceptions and test files
        ts_files = [
            f for f in ts_files 
            if not self._is_exception(f) and not self._is_test_file(f)
        ]
        
        # Analyze files in parallel
        with ThreadPoolExecutor(max_workers=4) as executor:
            future_to_file = {
                executor.submit(self._analyze_file, file_path): file_path
                for file_path in ts_files
            }
            
            for future in as_completed(future_to_file):
                file_info = future.result()
                
                if file_info.function_count > self.max_functions_per_file:
                    func_names = [f.name for f in file_info.functions[:8]]  # Show first 8
                    if len(file_info.functions) > 8:
                        func_names.append("...")
                    
                    self.errors.append(RuleOf6Error(
                        f"❌ File {file_info.path.relative_to(self.target_path)} "
                        f"has {file_info.function_count} functions (max {self.max_functions_per_file})\n"
                        f"   Functions: {', '.join(func_names)}\n"
                        f"   → Consider splitting into multiple files or grouping related functions"
                    ))
                
                # Check individual function rules
                for func in file_info.functions:
                    # Check function line count
                    if func.line_count > self.max_function_lines:
                        if func.line_count < 100:
                            # Warning for functions between 50-100 lines
                            self.warnings.append(RuleOf6Error(
                                f"⚠️  Function '{func.name}' in {func.file_path.relative_to(self.target_path)} "
                                f"has {func.line_count} lines (recommended max {self.max_function_lines})\n"
                                f"   Lines {func.line_start}-{func.line_end}\n"
                                f"   → Consider refactoring into smaller functions for better readability",
                                severity="warning"
                            ))
                        else:
                            # Error for functions 100+ lines
                            self.errors.append(RuleOf6Error(
                                f"❌ Function '{func.name}' in {func.file_path.relative_to(self.target_path)} "
                                f"has {func.line_count} lines (max 100 lines enforced)\n"
                                f"   Lines {func.line_start}-{func.line_end}\n"
                                f"   → Break into max {self.max_functions_per_file} function calls at the same abstraction level"
                            ))
                    
                    # Check function argument count
                    if func.arg_count > self.max_function_args:
                        self.errors.append(RuleOf6Error(
                            f"❌ Function '{func.name}' in {func.file_path.relative_to(self.target_path)} "
                            f"has {func.arg_count} arguments (max {self.max_function_args})\n"
                            f"   Line {func.line_start}\n"
                            f"   → Use max 3 arguments, or 1 object with max {self.max_object_keys} keys"
                        ))
    
    def _check_object_parameter_rule(self) -> None:
        """Check object parameters have max 6 keys (basic implementation)."""
        print("Checking object parameter complexity...")
        
        # This is a simplified check - would need more sophisticated parsing for full accuracy
        ts_files = []
        for pattern in ["**/*.ts", "**/*.tsx"]:
            ts_files.extend(self.target_path.glob(pattern))
        
        ts_files = [
            f for f in ts_files 
            if not self._is_exception(f) and not self._is_test_file(f)
        ]
        
        for file_path in ts_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Look for object parameter patterns
                lines = content.split('\n')
                for i, line in enumerate(lines, 1):
                    # Look for object destructuring in function parameters
                    obj_param_match = re.search(r'\{\s*([^}]+)\s*\}\s*:', line)
                    if obj_param_match:
                        params_str = obj_param_match.group(1)
                        params = [p.strip() for p in params_str.split(',')]
                        # Filter out empty params
                        params = [p for p in params if p and not p.startswith('...')]
                        
                        if len(params) > self.max_object_keys:
                            self.warnings.append(RuleOf6Error(
                                f"⚠️  Object parameter in {file_path.relative_to(self.target_path)}:{i} "
                                f"has {len(params)} keys (max {self.max_object_keys})\n"
                                f"   → Consider grouping related keys or splitting the object",
                                severity="warning"
                            ))
                            
            except (UnicodeDecodeError, OSError):
                continue
    
    def run_all_checks(self) -> bool:
        """Run all Rule of 6 checks and return True if no critical errors."""
        start_time = time.time()
        
        print(f"📏 Checking Rule of 6 adherence in {self.target_path}...")
        
        # Run all checks
        self._check_directory_rule()
        self._check_file_function_rule()
        self._check_object_parameter_rule()
        
        elapsed = time.time() - start_time
        print(f"⏱️  Completed in {elapsed:.2f} seconds")
        
        # Report results
        if self.errors:
            print("\n📐 Rule of 6 violations:")
            print("=" * 72)
            for error in self.errors:
                print(error.message)
            
            print("\n📋 Rule of 6 Requirements:")
            print("-" * 72)
            print(f"• Max {self.max_directory_items} items per directory")
            print(f"• Max {self.max_functions_per_file} functions per file")
            print(f"• Max {self.max_function_lines} lines per function (warning), 100+ lines (error)")
            print(f"• Max {self.max_function_args} arguments per function (or 1 object with max {self.max_object_keys} keys)")
            print("=" * 72)
        
        if self.warnings:
            print("\n⚠️  Rule of 6 warnings:")
            print("-" * 72)
            for warning in self.warnings:
                print(warning.message)
            print("-" * 72)
        
        if not self.errors and not self.warnings:
            print("✅ All Rule of 6 checks passed!")
            return True
        
        if not self.errors:  # Only warnings
            print("✅ Rule of 6 checks passed (warnings only)!")
            return True
        
        return False


def main():
    """Main entry point."""
    target_path = sys.argv[1] if len(sys.argv) > 1 else "src"
    
    checker = RuleOf6Checker(target_path)
    success = checker.run_all_checks()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()