#!/usr/bin/env python3
"""
ESLint results reporter module.

Handles result reporting, JSON output generation, and console summaries.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from models import LintResults, FileResults, DirectoryStats, RuleStats


class LintReporter:
    """Handles reporting of ESLint check results."""
    
    def __init__(self, output_file: str = "test-results/lint-check.json"):
        self.output_file = Path(output_file)
    
    def report_results(self, results: LintResults, verbose: bool = False, 
                      json_only: bool = False, by_rule: bool = False) -> bool:
        """
        Report results to both JSON file and console.
        
        Args:
            results: LintResults to report
            verbose: Show detailed file-by-file breakdown
            json_only: Only output JSON, no console output
            by_rule: Group console output by rule instead of by file
            
        Returns:
            True if no errors found
        """
        # Ensure output directory exists
        self.output_file.parent.mkdir(exist_ok=True)
        
        # Write detailed JSON report
        self._write_json_report(results)
        
        # Display console output unless json_only
        if not json_only:
            if by_rule:
                self._display_by_rule_summary(results, verbose)
            else:
                self._display_console_summary(results, verbose)
        
        return not results.has_errors()
    
    def _write_json_report(self, results: LintResults) -> None:
        """Write detailed JSON report to file."""
        report_data = results.to_dict()
        report_data["timestamp"] = datetime.now().isoformat()
        report_data["tool"] = "eslint"
        
        with open(self.output_file, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
    
    def _display_console_summary(self, results: LintResults, verbose: bool = False) -> None:
        """Display summary information on console grouped by files/directories."""
        print("\n" + "=" * 50)
        print("ESLint Check Results")
        print("=" * 50)
        
        # Summary statistics
        print(f"\nSummary:")
        print(f"  Total Issues: {results.total_issues}")
        print(f"  Errors: {results.total_errors}")
        print(f"  Warnings: {results.total_warnings}")
        print(f"  Files Affected: {results.files_with_issues}/{results.total_files}")
        
        if not results.has_issues():
            print("\n✅ No linting issues found!")
            return
        
        # Top rule violations
        top_rules = results.get_top_rules(10)
        if top_rules:
            print(f"\nTop Rule Violations:")
            for i, rule in enumerate(top_rules, 1):
                error_part = f"{rule.error_count} errors" if rule.error_count > 0 else ""
                warning_part = f"{rule.warning_count} warnings" if rule.warning_count > 0 else ""
                severity_info = ", ".join(filter(None, [error_part, warning_part]))
                
                print(f"  {i:2d}. {rule.rule_id}: {rule.total_count} violations "
                      f"({severity_info}, {rule.files_count} files)")
        
        # Directory breakdown
        top_dirs = results.get_top_directories(10)
        if top_dirs:
            print(f"\nIssues by Directory:")
            for i, dir_stats in enumerate(top_dirs, 1):
                error_part = f"{dir_stats.error_count} errors" if dir_stats.error_count > 0 else ""
                warning_part = f"{dir_stats.warning_count} warnings" if dir_stats.warning_count > 0 else ""
                severity_info = ", ".join(filter(None, [error_part, warning_part]))
                
                print(f"  {i:2d}. {dir_stats.path}/: {dir_stats.total_issues} issues "
                      f"({severity_info}, {dir_stats.files_affected} files)")
        
        # Most affected files
        most_affected = results.get_most_affected_files(10)
        if most_affected:
            print(f"\nMost Affected Files:")
            for i, file_result in enumerate(most_affected, 1):
                error_part = f"{file_result.error_count} errors" if file_result.error_count > 0 else ""
                warning_part = f"{file_result.warning_count} warnings" if file_result.warning_count > 0 else ""
                severity_info = ", ".join(filter(None, [error_part, warning_part]))
                
                print(f"  {i:2d}. {file_result.file_path}: {file_result.total_issues} issues ({severity_info})")
        
        # Verbose file-by-file breakdown
        if verbose:
            self._display_verbose_breakdown(results)
        else:
            print(f"\nRun with --verbose for detailed file-by-file breakdown")
    
    def _display_by_rule_summary(self, results: LintResults, verbose: bool = False) -> None:
        """Display summary information grouped by rules."""
        print("\n" + "=" * 50)
        print("ESLint Check Results (Grouped by Rule)")
        print("=" * 50)
        
        # Summary statistics
        print(f"\nSummary:")
        print(f"  Total Issues: {results.total_issues}")
        print(f"  Errors: {results.total_errors}")
        print(f"  Warnings: {results.total_warnings}")
        print(f"  Files Affected: {results.files_with_issues}/{results.total_files}")
        print(f"  Rules Violated: {len(results.rule_stats)}")
        
        if not results.has_issues():
            print("\n✅ No linting issues found!")
            return
        
        # Group by rule
        top_rules = results.get_top_rules(50)  # Show more rules in rule-focused view
        
        for rule in top_rules:
            print(f"\n📋 {rule.rule_id}")
            print(f"   Total: {rule.total_count} violations in {rule.files_count} files")
            
            error_part = f"{rule.error_count} errors" if rule.error_count > 0 else ""
            warning_part = f"{rule.warning_count} warnings" if rule.warning_count > 0 else ""
            severity_info = ", ".join(filter(None, [error_part, warning_part]))
            if severity_info:
                print(f"   Severity: {severity_info}")
            
            if verbose and rule.files_count <= 20:  # Don't spam for rules affecting many files
                print(f"   Affected files:")
                for file_path in sorted(rule.files_affected):
                    # Count issues for this rule in this file
                    file_result = next((f for f in results.files if f.file_path == file_path), None)
                    if file_result:
                        rule_issues = [i for i in file_result.issues if i.rule_id == rule.rule_id]
                        print(f"     • {file_path} ({len(rule_issues)} issues)")
            elif rule.files_count > 20:
                print(f"   Too many files to list ({rule.files_count} files)")
        
        if not verbose:
            print(f"\nRun with --verbose to see affected files for each rule")
    
    def _display_verbose_breakdown(self, results: LintResults) -> None:
        """Display detailed file-by-file breakdown."""
        print(f"\n📁 Detailed File Breakdown:")
        print("-" * 50)
        
        # Group files by directory for better organization
        files_by_dir = {}
        for file_result in results.files:
            if file_result.total_issues > 0:
                dir_path = str(Path(file_result.file_path).parent)
                if dir_path == '.':
                    dir_path = 'root'
                
                if dir_path not in files_by_dir:
                    files_by_dir[dir_path] = []
                files_by_dir[dir_path].append(file_result)
        
        # Display files grouped by directory
        for dir_path in sorted(files_by_dir.keys()):
            files = sorted(files_by_dir[dir_path], key=lambda f: f.total_issues, reverse=True)
            
            print(f"\n📂 {dir_path}/")
            for file_result in files:
                error_part = f"{file_result.error_count}E" if file_result.error_count > 0 else ""
                warning_part = f"{file_result.warning_count}W" if file_result.warning_count > 0 else ""
                severity_badge = "/".join(filter(None, [error_part, warning_part]))
                
                file_name = Path(file_result.file_path).name
                print(f"   📄 {file_name} ({severity_badge})")
                
                # Group issues by rule for this file
                issues_by_rule = {}
                for issue in file_result.issues:
                    if issue.rule_id not in issues_by_rule:
                        issues_by_rule[issue.rule_id] = []
                    issues_by_rule[issue.rule_id].append(issue)
                
                # Display issues grouped by rule
                for rule_id in sorted(issues_by_rule.keys()):
                    rule_issues = issues_by_rule[rule_id]
                    count = len(rule_issues)
                    severity_icon = "🔴" if any(i.severity.value == 2 for i in rule_issues) else "🟡"
                    
                    print(f"      {severity_icon} {rule_id}: {count} issue{'s' if count > 1 else ''}")
                    
                    # Show first few issues for this rule
                    for issue in rule_issues[:3]:  # Limit to first 3 issues per rule
                        line_info = f"L{issue.line}:{issue.column}" if issue.line > 0 else ""
                        print(f"         {line_info} {issue.message}")
                    
                    if len(rule_issues) > 3:
                        print(f"         ... and {len(rule_issues) - 3} more")
    
    def display_no_issues_message(self) -> None:
        """Display message when no linting issues are found."""
        print("\n" + "=" * 50)
        print("ESLint Check Results")
        print("=" * 50)
        print("\n✅ No linting issues found!")
        print("\nAll files pass ESLint checks.")
    
    def display_execution_error(self, error_message: str) -> None:
        """Display error message when ESLint execution fails."""
        print("\n" + "=" * 50)
        print("ESLint Check Results")
        print("=" * 50)
        print(f"\n❌ ESLint execution failed:")
        print(f"   {error_message}")
        print("\nPlease check your ESLint configuration and try again.")