#!/usr/bin/env python3
"""
Path utility functions for architecture checking.

Handles path manipulation and exception checking.
"""

from pathlib import Path
from typing import Set


class PathHelper:
    """Helper class for path-related operations."""
    
    def __init__(self, target_path: str = "src"):
        self.target_path = Path(target_path)
        self.rule_exceptions: Set[str] = set()
        self.traversal_exceptions: Set[str] = set()
        self._load_exceptions()
    
    def _load_exceptions(self) -> None:
        """Load architecture exceptions from .architecture-ignore file."""
        ignore_file = Path(".architecture-ignore")
        if ignore_file.exists():
            with open(ignore_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        # Most exceptions are rule exceptions (exempt from architecture rules)
                        self.rule_exceptions.add(line)
                        # Only add specific patterns to traversal exceptions
                        if ("node_modules" in line or "__tests__" in line or 
                            "__fixtures__" in line or "__mocks__" in line):
                            self.traversal_exceptions.add(line)
        else:
            self.rule_exceptions.add("src/components")
    
    def is_traversal_exception(self, path: Path) -> bool:
        """Check if path should be skipped entirely during traversal."""
        path_str = str(path)
        return any(path_str.startswith(exc) for exc in self.traversal_exceptions)
    
    def is_rule_exception(self, path: Path) -> bool:
        """Check if path is exempt from architecture rules."""
        path_str = str(path)
        
        for exc in self.rule_exceptions:
            # Exact match for simple paths
            if path_str == exc:
                return True
            # Pattern matching for /** patterns
            elif exc.endswith('/**') and path_str.startswith(exc[:-3] + '/'):
                return True
            # Pattern matching for /** in the middle or other glob patterns
            elif '**' in exc:
                # This is a pattern, we could implement more sophisticated matching if needed
                # For now, just do prefix matching for ** patterns
                if exc.endswith('**') and path_str.startswith(exc[:-2]):
                    return True
        
        return False
    
    def is_domain_path(self, path: Path) -> bool:
        """Check if path is in a domain."""
        return str(path).startswith("src/lib/domains/")
    
    def get_directories_to_check(self) -> list[Path]:
        """Get all directories that should be checked for complexity requirements."""
        directories_to_check = [self.target_path]
        
        # Then add all subdirectories, but skip traversal exceptions
        for d in self.target_path.rglob("*"):
            if d.is_dir() and not self.is_traversal_exception(d):
                directories_to_check.append(d)
        
        return directories_to_check
    
    def find_dependencies_files(self) -> list[Path]:
        """Find all dependencies.json files in target path."""
        deps_files = []
        for deps_file in self.target_path.rglob("dependencies.json"):
            if "node_modules" not in str(deps_file):
                deps_files.append(deps_file)
        return deps_files