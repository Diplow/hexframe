#!/usr/bin/env python3
"""
Main Rule of 6 checker orchestration.

Coordinates all rule checking and manages the overall checking process.
"""

import time
from pathlib import Path
from typing import List
from concurrent.futures import ThreadPoolExecutor, as_completed

from models import CheckResults, ViolationType, RuleOf6Violation, FileAnalysis
from scanner import ExceptionManager, DirectoryScanner, FileScanner
from parser import TypeScriptParser


class RuleOf6Checker:
    """Main Rule of 6 checker that orchestrates all validation."""
    
    def __init__(self, target_path: str = "src"):
        self.target_path = Path(target_path)
        
        # Rule thresholds
        self.max_directory_items = 6
        self.max_functions_per_file = 6
        self.max_function_lines = 50
        self.max_function_args = 3
        self.max_object_keys = 6
        self.max_function_lines_error = 100  # Hard limit for errors
        
        # Initialize components
        self.exception_manager = ExceptionManager()
        self.directory_scanner = DirectoryScanner(self.exception_manager)
        self.file_scanner = FileScanner(self.exception_manager)
        self.parser = TypeScriptParser()
    
    def run_all_checks(self) -> CheckResults:
        """Run all Rule of 6 checks and return results."""
        start_time = time.time()
        results = CheckResults(target_path=str(self.target_path))
        
        # Run all checks
        self._check_directory_rule(results)
        self._check_file_function_rules(results)
        self._check_object_parameter_rule(results)
        
        results.execution_time = time.time() - start_time
        
        # Track which rules were applied
        results.rules_applied = {
            "directory_items": self.max_directory_items,
            "functions_per_file": self.max_functions_per_file,
            "function_lines_warning": self.max_function_lines,
            "function_lines_error": self.max_function_lines_error,
            "function_args": self.max_function_args,
            "object_keys": self.max_object_keys
        }
        
        return results
    
    def _check_directory_rule(self, results: CheckResults) -> None:
        """Check that directories have max 6 items."""
        violating_dirs = self.directory_scanner.find_violating_directories(
            self.target_path, self.max_directory_items
        )
        
        for dir_info in violating_dirs:
            relative_path = str(dir_info.path.relative_to(self.target_path) if dir_info.path != self.target_path else '.')
            items_display = dir_info.get_item_list_display()
            
            violation = RuleOf6Violation.create_error(
                message=f"Directory '{relative_path}' has {dir_info.item_count} items (max {self.max_directory_items})",
                violation_type=ViolationType.DIRECTORY_ITEMS,
                file_path=str(dir_info.path),
                recommendation="Group related items into subdirectories with meaningful names. Avoid creating empty subdirectories just to meet the rule.",
                context={
                    "item_count": dir_info.item_count,
                    "items": dir_info.items,
                    "items_display": items_display
                }
            )
            results.add_violation(violation)
    
    def _check_file_function_rules(self, results: CheckResults) -> None:
        """Check file function count and individual function rules."""        
        # Find all TypeScript files
        ts_files = self.file_scanner.find_typescript_files(self.target_path)
        
        # Analyze files in parallel
        with ThreadPoolExecutor(max_workers=4) as executor:
            # Submit all file scanning tasks
            file_futures = {
                executor.submit(self.file_scanner.scan_file, file_path): file_path
                for file_path in ts_files
            }
            
            # Process scanned files and parse them
            parse_futures = {}
            for future in as_completed(file_futures):
                file_analysis = future.result()
                if file_analysis:
                    # Read content and parse functions
                    parse_future = executor.submit(self._parse_file_functions, file_analysis)
                    parse_futures[parse_future] = file_analysis
            
            # Process parsed results
            for future in as_completed(parse_futures):
                file_analysis = future.result()
                if file_analysis:
                    self._check_single_file(file_analysis, results)
    
    def _parse_file_functions(self, file_analysis: FileAnalysis) -> FileAnalysis:
        """Parse functions in a single file."""
        try:
            with open(file_analysis.path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            return self.parser.parse_file(file_analysis, content)
        except (UnicodeDecodeError, OSError):
            return file_analysis
    
    def _check_single_file(self, file_analysis: FileAnalysis, results: CheckResults) -> None:
        """Check a single file for Rule of 6 violations."""
        relative_path = str(file_analysis.path.relative_to(self.target_path))
        
        # Check function count per file
        if file_analysis.function_count > self.max_functions_per_file:
            func_names = file_analysis.get_function_names()
            
            violation = RuleOf6Violation.create_error(
                message=f"File '{relative_path}' has {file_analysis.function_count} functions (max {self.max_functions_per_file})",
                violation_type=ViolationType.FILE_FUNCTIONS,
                file_path=relative_path,
                recommendation="Split into multiple files by grouping related functions. Consider extracting utility functions or creating separate modules for distinct concerns.",
                context={
                    "function_count": file_analysis.function_count,
                    "function_names": func_names
                }
            )
            results.add_violation(violation)
        
        # Check individual function rules
        for func in file_analysis.functions:
            self._check_function_lines(func, relative_path, results)
            self._check_function_arguments(func, relative_path, results)
    
    def _check_function_lines(self, func, relative_path: str, results: CheckResults) -> None:
        """Check function line count."""
        if func.line_count > self.max_function_lines:
            if func.line_count < self.max_function_lines_error:
                # Warning for functions between 50-100 lines
                violation = RuleOf6Violation.create_warning(
                    message=f"Function '{func.name}' has {func.line_count} lines (recommended max {self.max_function_lines})",
                    violation_type=ViolationType.FUNCTION_LINES,
                    file_path=relative_path,
                    line_number=func.line_start,
                    recommendation="Break down into max 6 smaller functions at the same abstraction level. Focus on single responsibility and meaningful function names.",
                    context={
                        "function_name": func.name,
                        "line_count": func.line_count,
                        "line_range": f"{func.line_start}-{func.line_end}"
                    }
                )
            else:
                # Error for functions 100+ lines
                violation = RuleOf6Violation.create_error(
                    message=f"Function '{func.name}' has {func.line_count} lines (enforced max {self.max_function_lines_error})",
                    violation_type=ViolationType.FUNCTION_LINES,
                    file_path=relative_path,
                    line_number=func.line_start,
                    recommendation="Immediately refactor into max 6 function calls at the same abstraction level. Avoid creating meaningless wrapper functions.",
                    context={
                        "function_name": func.name,
                        "line_count": func.line_count,
                        "line_range": f"{func.line_start}-{func.line_end}"
                    }
                )
            
            results.add_violation(violation)
    
    def _check_function_arguments(self, func, relative_path: str, results: CheckResults) -> None:
        """Check function argument count."""
        if func.arg_count > self.max_function_args:
            violation = RuleOf6Violation.create_error(
                message=f"Function '{func.name}' has {func.arg_count} arguments (max {self.max_function_args})",
                violation_type=ViolationType.FUNCTION_ARGS,
                file_path=relative_path,
                line_number=func.line_start,
                recommendation=f"Use max 3 arguments, or 1 object with max {self.max_object_keys} keys. Group related parameters meaningfully.",
                context={
                    "function_name": func.name,
                    "arg_count": func.arg_count
                }
            )
            results.add_violation(violation)
    
    def _check_object_parameter_rule(self, results: CheckResults) -> None:
        """Check object parameters have max 6 keys."""        
        ts_files = self.file_scanner.find_typescript_files(self.target_path)
        
        for file_path in ts_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                violations = self.parser.find_object_parameter_violations(
                    content, file_path, self.max_object_keys
                )
                
                relative_path = str(file_path.relative_to(self.target_path))
                
                for line_num, key_count, params_preview in violations:
                    violation = RuleOf6Violation.create_warning(
                        message=f"Object parameter has {key_count} keys (max {self.max_object_keys})",
                        violation_type=ViolationType.OBJECT_KEYS,
                        file_path=relative_path,
                        line_number=line_num,
                        recommendation="Group related keys into nested objects or split into multiple focused parameters with clear semantic meaning.",
                        context={
                            "key_count": key_count,
                            "params_preview": params_preview
                        }
                    )
                    results.add_violation(violation)
                    
            except (UnicodeDecodeError, OSError):
                continue