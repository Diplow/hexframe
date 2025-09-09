#!/usr/bin/env python3
"""
Rule of 6 check reporting module.

Handles result reporting, JSON output generation, and console summaries.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict

from models import CheckResults, ViolationType, Severity


class RuleOf6Reporter:
    """Handles reporting of Rule of 6 check results."""
    
    def __init__(self, output_file: str = "test-results/rule-of-6-check.json"):
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
    
    def _display_console_summary(self, results: CheckResults) -> None:
        """Display concise summary information on console."""        
        # Show summary statistics
        total_errors = len(results.errors)
        total_warnings = len(results.warnings)
        
        if total_errors > 0 or total_warnings > 0:
            print(f"📐 Rule of 6: {total_errors} errors, {total_warnings} warnings")
            print()
            
            # Show top 10 violations by type with smart sorting
            self._display_top_violations(results)
            
            print(f"📄 Detailed report: {self.output_file}")
            
        else:
            print("✅ Rule of 6 checks passed!")
            print(f"📄 Detailed report: {self.output_file}")
    
    def _display_top_violations(self, results: CheckResults) -> None:
        """Display top 10 violations with smart sorting."""
        # Group violations by type
        by_type: Dict[ViolationType, list] = {}
        for violation in results.get_all_violations():
            if violation.violation_type not in by_type:
                by_type[violation.violation_type] = []
            by_type[violation.violation_type].append(violation)
        
        # Process each violation type with smart sorting
        all_top_violations = []
        
        for violation_type, violations in by_type.items():
            if violation_type == ViolationType.DIRECTORY_ITEMS:
                # Sort by item count (highest first)
                sorted_violations = sorted(violations, 
                    key=lambda v: v.context.get('item_count', 0) if v.context else 0, 
                    reverse=True)
            elif violation_type == ViolationType.FILE_FUNCTIONS:
                # Sort by function count (highest first)
                sorted_violations = sorted(violations,
                    key=lambda v: v.context.get('function_count', 0) if v.context else 0,
                    reverse=True)
            elif violation_type == ViolationType.FUNCTION_LINES:
                # Sort by line count (highest first)
                sorted_violations = sorted(violations,
                    key=lambda v: v.context.get('line_count', 0) if v.context else 0,
                    reverse=True)
            else:
                # For other types, keep as-is
                sorted_violations = violations
            
            # Add top violations from this type
            for violation in sorted_violations[:10]:  # Top 10 per type
                severity_icon = "❌" if violation.severity == Severity.ERROR else "⚠️"
                
                if violation_type == ViolationType.DIRECTORY_ITEMS:
                    count = violation.context.get('item_count', 0) if violation.context else 0
                    priority_score = count
                elif violation_type == ViolationType.FILE_FUNCTIONS:
                    count = violation.context.get('function_count', 0) if violation.context else 0
                    priority_score = count
                elif violation_type == ViolationType.FUNCTION_LINES:
                    count = violation.context.get('line_count', 0) if violation.context else 0
                    priority_score = count
                else:
                    priority_score = 1
                
                all_top_violations.append({
                    'violation': violation,
                    'priority_score': priority_score,
                    'severity_icon': severity_icon
                })
        
        # Sort all violations by priority score and show top 10
        all_top_violations.sort(key=lambda x: x['priority_score'], reverse=True)
        
        for item in all_top_violations[:10]:
            violation = item['violation']
            severity_icon = item['severity_icon']
            
            print(f"{severity_icon} {violation.message}")
            if violation.file_path and violation.line_number:
                print(f"   {violation.file_path}:{violation.line_number}")
            elif violation.file_path:
                print(f"   {violation.file_path}")
            print()
        
        if len(all_top_violations) > 10:
            print(f"... and {len(all_top_violations) - 10} more violations")
            print()
    
    def _format_violation_type(self, violation_type: str) -> str:
        """Format violation type for display."""
        type_names = {
            "directory_items": "Directory items",
            "file_functions": "Functions per file",
            "function_lines": "Function lines",
            "function_args": "Function arguments",
            "object_keys": "Object parameter keys"
        }
        return type_names.get(violation_type, violation_type.replace("_", " ").title())
    
    def _format_rule_name(self, rule_name: str) -> str:
        """Format rule name for display."""
        rule_names = {
            "directory_items": "Max items per directory",
            "functions_per_file": "Max functions per file",
            "function_lines_warning": "Max lines per function (warning)",
            "function_lines_error": "Max lines per function (error)",
            "function_args": "Max arguments per function",
            "object_keys": "Max keys per object parameter"
        }
        return rule_names.get(rule_name, rule_name.replace("_", " ").title())
    
    
    def generate_ai_friendly_summary(self, results: CheckResults) -> str:
        """Generate a summary specifically designed for AI agents."""
        if not results.errors and not results.warnings:
            return f"✅ Rule of 6 check passed! Report: {self.output_file}"
        
        summary_parts = [
            f"📐 Rule of 6 violations found: {len(results.errors)} errors, {len(results.warnings)} warnings",
            f"📄 Full report: {self.output_file}",
            "",
            "🎯 Quick filters for AI agents:"
        ]
        
        # Add useful jq commands
        summary_parts.extend([
            f"  # Get all errors: jq '.violations[] | select(.severity == \"error\")' {self.output_file}",
            f"  # Get summary: jq '.summary' {self.output_file}",
            f"  # Get by type: jq '.violations[] | select(.type == \"TYPE\")' {self.output_file}",
            f"  # Get by path: jq '.violations[] | select(.file | contains(\"PATH\"))' {self.output_file}",
            ""
        ])
        
        # Show top violation types
        type_summary = results.get_summary_by_type()
        if type_summary:
            top_types = sorted(type_summary.items(), key=lambda x: x[1], reverse=True)[:3]
            summary_parts.append("🔥 Top violation types:")
            for violation_type, count in top_types:
                type_name = self._format_violation_type(violation_type)
                summary_parts.append(f"  • {type_name}: {count}")
            summary_parts.append("")
        
        # Show top problematic paths
        path_summary = results.get_summary_by_path()
        if path_summary:
            top_paths = sorted(path_summary.items(), key=lambda x: x[1], reverse=True)[:3]
            summary_parts.append("📁 Most problematic paths:")
            for path, count in top_paths:
                summary_parts.append(f"  • {path}: {count}")
            summary_parts.append("")
        
        # Emphasize meaningful refactoring
        summary_parts.extend([
            "⚠️  IMPORTANT: Avoid meaningless abstractions when fixing violations.",
            "Focus on creating logical groupings and clear responsibilities.",
            "The Rule of 6 promotes better design, not artificial complexity."
        ])
        
        return "\n".join(summary_parts)