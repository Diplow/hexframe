#!/usr/bin/env python3
"""
File utility functions for architecture checking.

Handles file reading, caching, and line counting operations.
"""

import json
from pathlib import Path
from typing import Dict, Set

from ..models import FileInfo


class FileCache:
    """Caches file information for performance."""
    
    def __init__(self):
        self.file_cache: Dict[Path, FileInfo] = {}
        self.dependency_cache: Dict[Path, Dict] = {}
    
    def get_file_info(self, file_path: Path) -> FileInfo:
        """Get cached file info or load and cache it."""
        if file_path in self.file_cache:
            return self.file_cache[file_path]
        
        content = get_file_content(file_path)
        from .import_utils import extract_imports
        
        file_info = FileInfo(
            path=file_path,
            lines=content.count('\n') + 1 if content else 0,
            content=content,
            imports=extract_imports(content)
        )
        self.file_cache[file_path] = file_info
        return file_info
    
    def load_dependencies_json(self, deps_file: Path) -> Dict:
        """Load dependencies.json with caching."""
        if deps_file in self.dependency_cache:
            return self.dependency_cache[deps_file]
        
        try:
            with open(deps_file) as f:
                deps = json.load(f)
                self.dependency_cache[deps_file] = deps
                return deps
        except (json.JSONDecodeError, OSError):
            return {}


def get_file_content(file_path: Path) -> str:
    """Get file content with error handling."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except (UnicodeDecodeError, OSError):
        return ""


def get_file_lines(file_path: Path) -> int:
    """Get line count for a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return sum(1 for _ in f)
    except (UnicodeDecodeError, OSError):
        return 0


def is_test_file(file_path: Path) -> bool:
    """Check if file is a test file."""
    name = file_path.name
    return ".test." in name or ".spec." in name or "/__tests__/" in str(file_path)


def count_typescript_lines(directory: Path) -> int:
    """Count TypeScript lines in directory, respecting subsystem boundaries and excluding documentation files."""
    if not directory.exists():
        return 0
        
    total = 0
    
    # Count direct files in this directory
    for file in directory.glob("*.ts"):
        if not is_test_file(file) and not is_documentation_file(file):
            total += get_file_lines(file)
    
    for file in directory.glob("*.tsx"):
        if not is_test_file(file) and not is_documentation_file(file):
            total += get_file_lines(file)
    
    # Count subdirectories if they're not subsystems
    for subdir in directory.iterdir():
        if subdir.is_dir():
            deps_file = subdir / "dependencies.json"
            if not deps_file.exists():
                # Not a subsystem, count recursively
                total += count_typescript_lines(subdir)
    
    return total


def is_documentation_file(file_path: Path) -> bool:
    """Check if file is a documentation/metadata file that shouldn't count toward complexity."""
    name = file_path.name.lower()
    return name in ["readme.md", "architecture.md", "dependencies.json"]


def find_typescript_files(directory: Path) -> list[Path]:
    """Find all TypeScript files in directory tree."""
    files = []
    
    for pattern in ["*.ts", "*.tsx"]:
        for ts_file in directory.rglob(pattern):
            if not is_test_file(ts_file):
                files.append(ts_file)
    
    return files