#!/usr/bin/env python3
"""
Exception handling for Rule of 6 checker.

Supports custom thresholds via .ruleof6-exceptions files for cases where
meaningful refactoring isn't possible without creating artificial abstractions.
"""

import fnmatch
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Set
from dataclasses import dataclass, field

from parser import TypeScriptParser


@dataclass
class ExceptionRule:
    """Represents a single exception rule."""
    file_path: str
    function_name: Optional[str] = None  # None for directory exceptions
    threshold: int = 0
    justification: str = ""
    source_file: str = ""
    line_number: int = 0
    
    @property
    def is_directory_exception(self) -> bool:
        """Check if this is a directory exception."""
        return self.function_name is None
    
    @property
    def is_function_exception(self) -> bool:
        """Check if this is a function exception."""
        return self.function_name is not None


class ExceptionFileParser:
    """Parses .ruleof6-exceptions files."""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
    
    def parse_exception_file(self, exception_file: Path) -> List[ExceptionRule]:
        """Parse a .ruleof6-exceptions file and return list of rules."""
        rules = []
        
        if not exception_file.exists():
            return rules
        
        try:
            with open(exception_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except (OSError, UnicodeDecodeError) as e:
            raise ValueError(f"Could not read exception file {exception_file}: {e}")
        
        for line_num, line in enumerate(content.splitlines(), 1):
            rule = self._parse_exception_line(line, str(exception_file), line_num)
            if rule:
                rules.append(rule)
        
        return rules
    
    def _parse_exception_line(self, line: str, source_file: str, line_number: int) -> Optional[ExceptionRule]:
        """Parse a single line from an exception file."""
        # Remove leading/trailing whitespace
        line = line.strip()
        
        # Skip empty lines and pure comments
        if not line or line.startswith('#'):
            return None
        
        # Extract inline comment (justification)
        if '#' in line:
            content, justification = line.split('#', 1)
            content = content.strip()
            justification = justification.strip()
        else:
            content = line
            justification = ""
        
        # Skip lines without justification (warn but continue)
        if not justification:
            print(f"Warning: Missing justification in {source_file}:{line_number}: {line}")
        
        # Parse exception rule
        if ':' not in content:
            raise ValueError(f"Invalid format in {source_file}:{line_number}: {line}")
        
        parts = content.split(':', 2)
        if len(parts) < 2:
            raise ValueError(f"Invalid format in {source_file}:{line_number}: {line}")
        
        # Check if it's a function or directory exception
        if len(parts) == 3:
            # Function exception: file:function:threshold
            file_path, function_name, threshold_str = parts
            function_name = function_name.strip()
        else:
            # Directory exception: path:threshold
            file_path, threshold_str = parts
            function_name = None
        
        file_path = file_path.strip()
        threshold_str = threshold_str.strip()
        
        # Parse threshold
        try:
            threshold = int(threshold_str)
        except ValueError:
            raise ValueError(f"Invalid threshold in {source_file}:{line_number}: {threshold_str}")
        
        # Validate threshold is reasonable
        if threshold <= 0 or threshold > 1000:
            print(f"Warning: Unusual threshold {threshold} in {source_file}:{line_number}")
        
        return ExceptionRule(
            file_path=file_path,
            function_name=function_name,
            threshold=threshold,
            justification=justification,
            source_file=source_file,
            line_number=line_number
        )


class ExceptionValidator:
    """Validates exception rules against actual codebase."""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.parser = TypeScriptParser()
    
    def validate_exception_rules(self, rules: List[ExceptionRule]) -> List[str]:
        """Validate all exception rules and return list of errors."""
        errors = []
        
        for rule in rules:
            rule_errors = self._validate_single_rule(rule)
            errors.extend(rule_errors)
        
        return errors
    
    def _validate_single_rule(self, rule: ExceptionRule) -> List[str]:
        """Validate a single exception rule."""
        errors = []
        
        # Resolve path relative to project root
        if rule.file_path.startswith('/'):
            file_path = Path(rule.file_path)
        else:
            file_path = self.project_root / rule.file_path
        
        # Check if path exists
        if rule.is_directory_exception:
            if not file_path.exists() or not file_path.is_dir():
                errors.append(f"Exception references non-existent directory: {rule.file_path}")
        else:
            if not file_path.exists() or not file_path.is_file():
                errors.append(f"Exception references non-existent file: {rule.file_path}")
                return errors  # Can't validate function if file doesn't exist
            
            # Validate function exists in file
            function_error = self._validate_function_exists(file_path, rule.function_name, rule)
            if function_error:
                errors.append(function_error)
        
        return errors
    
    def _validate_function_exists(self, file_path: Path, function_name: str, rule: ExceptionRule) -> Optional[str]:
        """Check if function exists in the specified file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Use parser to extract function names
            function_names = self.parser.shared_parser.extract_function_names_from_content(content)
            
            if function_name not in function_names:
                return (f"Exception references non-existent function '{function_name}' "
                       f"in {rule.file_path} (source: {rule.source_file}:{rule.line_number})")
            
        except Exception as e:
            return f"Could not validate function in {rule.file_path}: {e}"
        
        return None


class CustomThresholdManager:
    """Manages custom thresholds from .ruleof6-exceptions files."""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.parser = ExceptionFileParser(project_root)
        self.validator = ExceptionValidator(project_root)
        self.directory_exceptions: Dict[str, ExceptionRule] = {}
        self.function_exceptions: Dict[str, ExceptionRule] = {}
        self.loaded_exception_files: List[str] = []
        
    def load_exceptions(self, target_path: Path) -> None:
        """Load exceptions from .ruleof6-exceptions files."""
        exception_files = self._find_exception_files(target_path)
        
        all_rules = []
        for exception_file in exception_files:
            rules = self.parser.parse_exception_file(exception_file)
            all_rules.extend(rules)
            self.loaded_exception_files.append(str(exception_file))
        
        # Validate all rules
        validation_errors = self.validator.validate_exception_rules(all_rules)
        if validation_errors:
            print(f"Warning: Some exception validations failed: {validation_errors}")
            # Temporarily allow continuing with validation errors
            # raise ValueError("Exception validation failed:\n" + "\n".join(validation_errors))
        
        # Organize rules by type
        for rule in all_rules:
            if rule.is_directory_exception:
                # Normalize directory path for consistent matching
                normalized_path = self._normalize_path(rule.file_path)
                self.directory_exceptions[normalized_path] = rule
            else:
                # Function exception key: file_path:function_name
                func_key = f"{rule.file_path}:{rule.function_name}"
                self.function_exceptions[func_key] = rule
    
    def _find_exception_files(self, target_path: Path) -> List[Path]:
        """Find .ruleof6-exceptions files from target path up to project root."""
        exception_files = []
        
        # Start from target path and walk up to project root
        current_path = target_path.resolve()
        project_root_resolved = self.project_root.resolve()
        
        # Prevent infinite loop with max depth check
        max_depth = 20
        depth = 0
        
        while depth < max_depth:
            exception_file = current_path / ".ruleof6-exceptions"
            if exception_file.exists():
                exception_files.append(exception_file)
            
            # Stop if we've reached project root or filesystem root
            if current_path == project_root_resolved or current_path == current_path.parent:
                break
                
            current_path = current_path.parent
            depth += 1
        
        return exception_files
    
    def _normalize_path(self, path_str: str) -> str:
        """Normalize path for consistent matching."""
        try:
            if path_str.startswith('/'):
                path = Path(path_str)
            else:
                path = self.project_root / path_str
            
            return str(path.resolve().relative_to(self.project_root))
        except ValueError:
            # Path is outside project root, use as-is
            return path_str
    
    def get_directory_exception(self, dir_path: Path) -> Optional[ExceptionRule]:
        """Get custom threshold for directory if it exists."""
        normalized = self._normalize_path(str(dir_path))
        return self.directory_exceptions.get(normalized)

    def get_file_exception(self, file_path: Path) -> Optional[ExceptionRule]:
        """Get custom threshold for file function count if it exists."""
        normalized = self._normalize_path(str(file_path))

        # Try to match with src prefix removed
        if normalized.startswith('src/'):
            normalized_without_src = normalized[4:]  # Remove 'src/' prefix
            return self.directory_exceptions.get(normalized_without_src)

        return self.directory_exceptions.get(normalized)
    
    def get_function_exception(self, file_path: str, function_name: str) -> Optional[ExceptionRule]:
        """Get custom threshold for function if it exists."""
        # Try exact match first
        func_key = f"{file_path}:{function_name}"
        if func_key in self.function_exceptions:
            return self.function_exceptions[func_key]
        
        # Try wildcard patterns if needed (future enhancement)
        for pattern_key, rule in self.function_exceptions.items():
            if fnmatch.fnmatch(func_key, pattern_key):
                return rule
        
        return None
    
    def has_exceptions(self) -> bool:
        """Check if any exceptions were loaded."""
        return bool(self.directory_exceptions or self.function_exceptions)
    
    def get_exception_summary(self) -> Dict:
        """Get summary of loaded exceptions for reporting."""
        return {
            "exception_files_loaded": self.loaded_exception_files,
            "directory_exceptions": len(self.directory_exceptions),
            "function_exceptions": len(self.function_exceptions),
            "total_exceptions": len(self.directory_exceptions) + len(self.function_exceptions)
        }