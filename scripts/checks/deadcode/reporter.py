#!/usr/bin/env python3
"""
Dead code check reporting module.

Handles result reporting, JSON output generation, and console summaries.
"""

import json
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from .models import CheckResults, DeadCodeIssue, DeadCodeType, Severity


class DeadCodeReporter:
    """Handles reporting of dead code check results."""
    
    def __init__(self, output_file: str = "test-results/dead-code-check.json"):
        self.output_file = Path(output_file)
    
    def report_results(self, results: CheckResults) -> bool:
        """Report results to both JSON file and console. Returns True if no errors."""
        # Ensure output directory exists
        self.output_file.parent.mkdir(exist_ok=True)
        
        # Write detailed JSON report
        self._write_json_report(results)
        
        # Display console summary
        self._display_console_summary(results)
        
        return not results.has_errors()
    
    def _write_json_report(self, results: CheckResults) -> None:
        """Write detailed JSON report to file."""
        report_data = results.to_dict()
        report_data["timestamp"] = datetime.now().isoformat()
        
        with open(self.output_file, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
    
    def _extract_symbol_count(self, message: str) -> int:
        """Extract symbol count from issue message."""
        # Look for patterns like "({N} total symbols)", "({N} symbols in chain)"
        match = re.search(r'\((\d+).*?symbols?\)', message)
        return int(match.group(1)) if match else 1
    
    def _sort_issues_by_priority(self, issues: List[DeadCodeIssue]) -> List[DeadCodeIssue]:
        """Sort issues by symbol count (descending) for priority display."""
        def get_sort_key(issue):
            symbol_count = self._extract_symbol_count(issue.message)
            return (symbol_count, issue.file_path or "", issue.symbol_name or "")
        
        return sorted(issues, key=get_sort_key, reverse=True)
    
    def _display_console_summary(self, results: CheckResults) -> None:
        """Display simplified summary information on console."""
        print()
        
        total_errors = len(results.errors)
        
        if total_errors > 0:
            print("📊 Dead Code Analysis Summary:")
            print("=" * 72)
            print(f"• Total errors: {total_errors}")
            print(f"• Files analyzed: {results.files_analyzed}")
            print()
            
            # Get issues by category
            categories = results.get_issues_by_category()
            type_summary = results.get_summary_by_type()
            
            # Show breakdown by type
            if type_summary:
                print("🔍 By issue type:")
                type_order = ["dead_folders", "dead_files", "dead_symbols"]
                emojis = {"dead_folders": "📁", "dead_files": "📄", "dead_symbols": "💀"}
                labels = {"dead_folders": "Dead Folders", "dead_files": "Dead Files", "dead_symbols": "Dead Symbols"}
                
                for issue_type in type_order:
                    if issue_type in type_summary:
                        count = type_summary[issue_type]
                        emoji = emojis[issue_type]
                        label = labels[issue_type]
                        print(f"  {emoji} {label}: {count}")
                print()
            
            # Display sorted results
            self._display_category_section("📁 Dead Folders (by symbol count):", 
                                         categories["dead_folders"], limit=10)
            
            self._display_category_section("📄 Dead Files (by symbol count):", 
                                         categories["dead_files"], limit=10)
            
            self._display_category_section("💀 Dead Symbols (by dependency chain):", 
                                         categories["dead_symbols"], limit=10)
            
            # Reference to detailed log
            print("📋 Full Report:")
            print("-" * 72)
            print(f"{self.output_file}")
        else:
            print("✅ Dead code check passed!")
            print(f"📁 Analyzed {results.files_analyzed} files")
            print(f"📋 Report: {self.output_file}")
    
    def _display_category_section(self, title: str, issues: List[DeadCodeIssue], limit: int = 10) -> None:
        """Display a section for a specific category of issues."""
        if not issues:
            return
        
        print(title)
        sorted_issues = self._sort_issues_by_priority(issues)
        
        for issue in sorted_issues[:limit]:
            symbol_count = self._extract_symbol_count(issue.message)
            
            if issue.symbol_name == "__folder__":
                print(f"  • {issue.file_path}: {issue.message}")
            elif issue.symbol_name == "__file__":
                print(f"  • {issue.file_path}: {symbol_count} symbols")
            else:
                chain_info = ""
                if "chain" in issue.message:
                    chain_info = f" ({symbol_count} in chain)"
                print(f"  • {issue.file_path}:{issue.line_number} {issue.symbol_name}{chain_info}")
        
        if len(issues) > limit:
            print(f"  ... and {len(issues) - limit} more")
        
        print()
    
    def generate_ai_friendly_summary(self, results: CheckResults) -> str:
        """Generate a summary specifically designed for AI agents."""
        if not results.errors:
            return f"✅ Dead code check passed! Analyzed {results.files_analyzed} files. Report: {self.output_file}"
        
        categories = results.get_issues_by_category()
        folder_count = len(categories["dead_folders"])
        file_count = len(categories["dead_files"])
        symbol_count = len(categories["dead_symbols"])
        
        summary_parts = [
            f"💀 Dead code found: {folder_count} folders, {file_count} files, {symbol_count} symbols",
            f"📁 Analyzed {results.files_analyzed} files",
            f"📄 Report: {self.output_file}"
        ]
        
        return "\n".join(summary_parts)