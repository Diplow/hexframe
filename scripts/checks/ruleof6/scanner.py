#!/usr/bin/env python3
"""
File and directory scanning utilities for Rule of 6 checking.

Handles discovery and basic analysis of directories and TypeScript files.
"""

import re
from pathlib import Path
from typing import List, Set, Optional
from models import DirectoryInfo, FileAnalysis


class LegacyIgnoreManager:
    """Manages legacy .rule-of-6-ignore patterns (separate from custom thresholds)."""
    
    def __init__(self, exceptions_file: str = ".rule-of-6-ignore"):
        self.exceptions: Set[str] = set()
        self._load_exceptions(exceptions_file)
    
    def _load_exceptions(self, exceptions_file: str) -> None:
        """Load Rule of 6 exceptions from ignore file."""
        ignore_file = Path(exceptions_file)
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
                "src/server/db/schema/**",
                "**/types.ts",
                "**/types/**",
            ])
    
    def is_exception(self, path: Path) -> bool:
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


class DirectoryScanner:
    """Scans directories for Rule of 6 violations."""
    
    def __init__(self, ignore_manager: LegacyIgnoreManager):
        self.ignore_manager = ignore_manager
    
    def scan_directory(self, directory: Path) -> DirectoryInfo:
        """Scan a directory and return its info, counting only .ts/.tsx files and subdirectories."""
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
                    
                # Count directories and TypeScript files only
                if item.is_dir():
                    items.append(item.name)
                elif item.suffix in ['.ts', '.tsx']:
                    items.append(item.name)
                    
        except PermissionError:
            return DirectoryInfo(path=directory, item_count=0)
        
        return DirectoryInfo(
            path=directory,
            item_count=len(items),
            items=items
        )
    
    def find_violating_directories(self, target_path: Path, max_items: int = 6) -> List[DirectoryInfo]:
        """Find directories that violate the Rule of 6."""
        violating_dirs = []
        
        for directory in target_path.rglob("*"):
            if not directory.is_dir():
                continue
                
            if self.ignore_manager.is_exception(directory):
                continue
            
            dir_info = self.scan_directory(directory)
            
            if dir_info.item_count > max_items:
                violating_dirs.append(dir_info)
        
        return violating_dirs


class FileScanner:
    """Scans TypeScript files for basic analysis."""
    
    def __init__(self, ignore_manager: LegacyIgnoreManager):
        self.ignore_manager = ignore_manager
    
    def is_test_file(self, file_path: Path) -> bool:
        """Check if file is a test file."""
        file_str = str(file_path)
        return any(pattern in file_str for pattern in [
            ".test.", ".spec.", "__tests__/", ".stories."
        ])
    
    def scan_file(self, file_path: Path) -> Optional[FileAnalysis]:
        """Scan a TypeScript file and return basic analysis."""
        if self.ignore_manager.is_exception(file_path):
            return None
        
        if self.is_test_file(file_path):
            return None
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            lines = content.split('\n')
            
            return FileAnalysis(
                path=file_path,
                line_count=len(lines),
                function_count=0,  # Will be set by parser
                functions=[]  # Will be populated by parser
            )
            
        except (UnicodeDecodeError, OSError):
            return None
    
    def find_typescript_files(self, target_path: Path) -> List[Path]:
        """Find all TypeScript files in target path."""
        ts_files = []
        
        for pattern in ["**/*.ts", "**/*.tsx"]:
            ts_files.extend(target_path.glob(pattern))
        
        # Filter out exceptions and test files
        filtered_files = []
        for file_path in ts_files:
            if not self.ignore_manager.is_exception(file_path) and not self.is_test_file(file_path):
                filtered_files.append(file_path)
        
        return filtered_files