#!/usr/bin/env python3
"""
Exception handling for architecture checker.

Handles parsing and validation of .architecture-exceptions files.
"""

import re
from pathlib import Path
from typing import Dict, Tuple, Optional


class ArchitectureException:
    """Represents a single architecture exception."""
    
    def __init__(self, path: str, threshold: int, justification: str, source_file: Path):
        self.path = path
        self.threshold = threshold
        self.justification = justification
        self.source_file = source_file
    
    def __repr__(self):
        return f"ArchitectureException({self.path}, {self.threshold}, '{self.justification[:50]}...')"


class ExceptionHandler:
    """Handles loading and applying architecture exceptions."""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self._exception_cache: Dict[Path, Dict[str, ArchitectureException]] = {}
    
    def get_custom_threshold(self, target_path: Path) -> Optional[ArchitectureException]:
        """
        Get custom threshold for a path by checking exception files.
        
        Walks up the directory tree looking for .architecture-exceptions files.
        Returns the most specific (closest) exception that matches the path.
        """
        current_path = target_path.resolve()
        
        # Make sure target path is relative to project root
        try:
            target_relative = str(current_path.relative_to(self.project_root))
        except ValueError:
            # Path is not under project root, return None
            return None
        
        # Walk up the directory tree (including the project root)
        while current_path.parent != current_path:
            exception_file = current_path / ".architecture-exceptions"
            
            if exception_file.exists():
                exceptions = self._load_exception_file(exception_file)
                
                # Check for exact match first
                if target_relative in exceptions:
                    return exceptions[target_relative]
                
                # Check for pattern matches (most specific first)
                for exception_path, exception in sorted(exceptions.items(), 
                                                       key=lambda x: len(x[0]), 
                                                       reverse=True):
                    if self._path_matches_pattern(target_relative, exception_path):
                        return exception
            
            # Stop after checking project root
            if current_path == self.project_root:
                break
                
            current_path = current_path.parent
        
        return None
    
    def _load_exception_file(self, exception_file: Path) -> Dict[str, ArchitectureException]:
        """Load and parse exception file with validation."""
        if exception_file in self._exception_cache:
            return self._exception_cache[exception_file]
        
        exceptions = {}
        
        try:
            with open(exception_file, 'r', encoding='utf-8') as f:
                for line_num, line in enumerate(f, 1):
                    line = line.strip()
                    
                    # Skip empty lines and comments
                    if not line or line.startswith('#'):
                        continue
                    
                    try:
                        path, threshold, justification = self._parse_exception_line(line, line_num)
                        
                        # Validate path exists (relative to project root)
                        full_path = self.project_root / path
                        if not full_path.exists():
                            print(f"Warning: Exception path {path} does not exist (in {exception_file}:{line_num})")
                        
                        # Validate justification exists
                        if not justification or len(justification.strip()) < 10:
                            print(f"Warning: Insufficient justification for {path} exception (in {exception_file}:{line_num})")
                        
                        exception = ArchitectureException(
                            path=path,
                            threshold=threshold,
                            justification=justification,
                            source_file=exception_file
                        )
                        
                        exceptions[path] = exception
                        
                    except ValueError as e:
                        print(f"Error parsing {exception_file}:{line_num}: {e}")
                        continue
        
        except (OSError, UnicodeDecodeError) as e:
            print(f"Error reading exception file {exception_file}: {e}")
            return {}
        
        self._exception_cache[exception_file] = exceptions
        return exceptions
    
    def _parse_exception_line(self, line: str, line_num: int) -> Tuple[str, int, str]:
        """Parse a single exception line into components."""
        # Expected format: path: threshold # justification
        if ':' not in line:
            raise ValueError(f"Missing ':' separator")
        
        if '#' not in line:
            raise ValueError(f"Missing '#' separator for justification")
        
        # Split on first ':' and first '#' after that
        path_part, rest = line.split(':', 1)
        
        if '#' not in rest:
            raise ValueError(f"Missing justification after threshold")
        
        threshold_part, justification_part = rest.split('#', 1)
        
        # Clean up parts
        path = path_part.strip()
        threshold_str = threshold_part.strip()
        justification = justification_part.strip()
        
        # Validate path format
        if not path:
            raise ValueError(f"Empty path")
        
        # Ensure path is relative
        if path.startswith('/'):
            raise ValueError(f"Path must be relative: {path}")
        
        # Validate threshold
        try:
            threshold = int(threshold_str)
            if threshold <= 0:
                raise ValueError(f"Threshold must be positive: {threshold}")
        except ValueError:
            raise ValueError(f"Invalid threshold value: {threshold_str}")
        
        # Validate justification
        if not justification:
            raise ValueError(f"Empty justification")
        
        return path, threshold, justification
    
    def _path_matches_pattern(self, target_path: str, pattern: str) -> bool:
        """
        Check if target path matches exception pattern.
        
        Currently supports exact matching. Could be extended for glob patterns.
        """
        # For now, just do exact matching
        # Could be extended to support glob patterns like src/legacy-*
        return target_path == pattern
    
    def get_exception_info_for_reporting(self, target_path: Path) -> Optional[Dict]:
        """Get exception information for reporting purposes."""
        exception = self.get_custom_threshold(target_path)
        
        if not exception:
            return None
        
        return {
            "custom_threshold": exception.threshold,
            "exception_source": str(exception.source_file.relative_to(self.project_root)),
            "justification": exception.justification
        }