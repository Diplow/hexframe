#!/usr/bin/env python3
"""
ESLint output parser module.

Parses ESLint JSON output and converts it to structured data models.
"""

from pathlib import Path
from typing import Dict, List
import re

from models import LintIssue, LintSeverity, FileResults, LintResults, DirectoryStats, RuleStats


class ESLintParser:
    """Parses ESLint JSON output into structured data models."""
    
    def __init__(self, project_root: Path = None):
        """Initialize parser with project root for path normalization."""
        self.project_root = project_root or Path.cwd()
    
    def parse_json_output(self, eslint_data: List[Dict]) -> LintResults:
        """
        Parse ESLint JSON output into LintResults.
        
        Args:
            eslint_data: Raw ESLint JSON output (list of file objects)
            
        Returns:
            LintResults object with parsed and analyzed data
        """
        results = LintResults()
        
        # Process each file in the ESLint output
        for file_data in eslint_data:
            file_results = self._parse_file_data(file_data)
            results.add_file_results(file_results)
            
            # Process issues for aggregated statistics
            for issue in file_results.issues:
                self._add_to_directory_stats(results, file_results.file_path, issue)
                self._add_to_rule_stats(results, file_results.file_path, issue)
        
        return results
    
    def _parse_file_data(self, file_data: Dict) -> FileResults:
        """Parse data for a single file."""
        file_path = self._normalize_file_path(file_data.get('filePath', ''))
        file_results = FileResults(file_path=file_path)
        
        # Parse each message/issue in the file
        for message in file_data.get('messages', []):
            issue = self._parse_issue(message, file_path)
            file_results.add_issue(issue)
        
        return file_results
    
    def _parse_issue(self, message: Dict, file_path: str) -> LintIssue:
        """Parse a single ESLint issue/message."""
        # Map ESLint severity numbers to our enum
        severity_map = {
            2: LintSeverity.ERROR,
            1: LintSeverity.WARNING,
            0: LintSeverity.OFF
        }
        
        severity = severity_map.get(message.get('severity', 1), LintSeverity.WARNING)
        
        return LintIssue(
            rule_id=message.get('ruleId', 'unknown'),
            message=message.get('message', ''),
            severity=severity,
            file_path=file_path,
            line=message.get('line', 0),
            column=message.get('column', 0),
            end_line=message.get('endLine'),
            end_column=message.get('endColumn')
        )
    
    def _normalize_file_path(self, file_path: str) -> str:
        """Normalize file path relative to project root."""
        try:
            path = Path(file_path)
            if path.is_absolute():
                # Try to make it relative to project root
                try:
                    rel_path = path.relative_to(self.project_root)
                    return str(rel_path)
                except ValueError:
                    # Path is not under project root, return as-is
                    return file_path
            else:
                # Already relative
                return file_path
        except Exception:
            # If any error occurs, return original path
            return file_path
    
    def _add_to_directory_stats(self, results: LintResults, file_path: str, issue: LintIssue) -> None:
        """Add issue statistics to directory aggregation."""
        # Extract directory path
        dir_path = str(Path(file_path).parent)
        if dir_path == '.':
            dir_path = 'root'
        
        # Initialize directory stats if not exists
        if dir_path not in results.directory_stats:
            results.directory_stats[dir_path] = DirectoryStats(path=dir_path)
        
        stats = results.directory_stats[dir_path]
        stats.total_issues += 1
        
        if issue.severity == LintSeverity.ERROR:
            stats.error_count += 1
        elif issue.severity == LintSeverity.WARNING:
            stats.warning_count += 1
        
        # Track rule counts in this directory
        rule_id = issue.rule_id
        if rule_id not in stats.rule_counts:
            stats.rule_counts[rule_id] = 0
        stats.rule_counts[rule_id] += 1
        
        # Count files affected (we'll calculate this differently in post-processing)
    
    def _add_to_rule_stats(self, results: LintResults, file_path: str, issue: LintIssue) -> None:
        """Add issue statistics to rule aggregation."""
        rule_id = issue.rule_id
        
        # Initialize rule stats if not exists
        if rule_id not in results.rule_stats:
            results.rule_stats[rule_id] = RuleStats(rule_id=rule_id)
        
        stats = results.rule_stats[rule_id]
        stats.total_count += 1
        stats.files_affected.add(file_path)
        
        if issue.severity == LintSeverity.ERROR:
            stats.error_count += 1
        elif issue.severity == LintSeverity.WARNING:
            stats.warning_count += 1
    
    def post_process_results(self, results: LintResults) -> None:
        """Post-process results to calculate derived statistics."""
        # Calculate files affected per directory
        file_to_dir_map = {}
        for file_result in results.files:
            if file_result.total_issues > 0:
                dir_path = str(Path(file_result.file_path).parent)
                if dir_path == '.':
                    dir_path = 'root'
                
                if dir_path not in file_to_dir_map:
                    file_to_dir_map[dir_path] = set()
                file_to_dir_map[dir_path].add(file_result.file_path)
        
        # Update directory stats with files affected count
        for dir_path, files in file_to_dir_map.items():
            if dir_path in results.directory_stats:
                results.directory_stats[dir_path].files_affected = len(files)
    
    def filter_results(self, results: LintResults, errors_only: bool = False, 
                      rule_filter: str = None) -> LintResults:
        """
        Filter results based on criteria.
        
        Args:
            results: Original results to filter
            errors_only: If True, only include errors
            rule_filter: If provided, only include issues from this rule
            
        Returns:
            Filtered LintResults object
        """
        filtered_results = LintResults()
        
        for file_result in results.files:
            filtered_file = FileResults(file_path=file_result.file_path)
            
            for issue in file_result.issues:
                # Apply filters
                if errors_only and issue.severity != LintSeverity.ERROR:
                    continue
                
                if rule_filter and issue.rule_id != rule_filter:
                    continue
                
                filtered_file.add_issue(issue)
            
            # Only include file if it has issues after filtering
            if filtered_file.total_issues > 0:
                filtered_results.add_file_results(filtered_file)
                
                # Rebuild aggregated stats for filtered results
                for issue in filtered_file.issues:
                    self._add_to_directory_stats(filtered_results, filtered_file.file_path, issue)
                    self._add_to_rule_stats(filtered_results, filtered_file.file_path, issue)
        
        # Post-process filtered results
        self.post_process_results(filtered_results)
        
        return filtered_results