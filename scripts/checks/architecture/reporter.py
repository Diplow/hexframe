#!/usr/bin/env python3
"""
Architecture check reporting module.

Handles result reporting, JSON output generation, and console summaries.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict

from .models import CheckResults, ErrorType, Severity


class ArchitectureReporter:
    """Handles reporting of architecture check results."""
    
    def __init__(self, output_file: str = "test-results/architecture-check.json"):
        self.output_file = Path(output_file)
        self.complexity_threshold = 1000
        self.doc_threshold = 500
    
    def report_results(self, results: CheckResults, format_type: str = "console", suppressed_warning_count: int = 0) -> bool:
        """Report results to both JSON file and console. Returns True if no errors."""
        # Ensure output directory exists
        self.output_file.parent.mkdir(exist_ok=True)

        # Write detailed JSON report
        self._write_json_report(results)

        # Display results based on format
        if format_type == "json":
            self._display_json_output(results)
        else:
            self._display_console_summary(results, suppressed_warning_count=suppressed_warning_count)

        return not results.has_errors()
    
    def _write_json_report(self, results: CheckResults) -> None:
        """Write detailed JSON report to file."""
        report_data = results.to_dict()
        report_data["timestamp"] = datetime.now().isoformat()
        
        with open(self.output_file, 'w') as f:
            json.dump(report_data, f, indent=2, default=str)
    
    def _display_console_summary(self, results: CheckResults, suppressed_warning_count: int = 0) -> None:
        """Display summary information on console."""
        # print(f"⏱️  Completed in {results.execution_time:.2f} seconds")
        print()

        # Show summary statistics
        total_errors = len(results.errors)
        total_warnings = len(results.warnings)
        
        # Check for custom thresholds usage
        custom_threshold_count = sum(1 for issue in results.get_all_issues() 
                                   if issue.metadata and 'custom_threshold' in issue.metadata)
        
        if custom_threshold_count > 0:
            print(f"🔧 Using custom thresholds from .architecture-exceptions for {custom_threshold_count} issue(s)")
            print()
        
        if total_errors > 0 or total_warnings > 0:
            print("📊 Summary:")
            print("=" * 72)
            print(f"• Total errors: {total_errors}")
            print(f"• Total warnings: {total_warnings}")
            print()
            
            # Breakdown by error type
            type_summary = results.get_summary_by_type()
            if type_summary:
                print("🔍 By error type:")
                for error_type, count in sorted(type_summary.items()):
                    print(f"  • {error_type}: {count}")
                print()
            
            # Breakdown by subsystem
            subsystem_summary = results.get_summary_by_subsystem()
            if subsystem_summary:
                print("📁 By subsystem:")
                # Show top 10 subsystems with most issues
                sorted_subsystems = sorted(subsystem_summary.items(), 
                                         key=lambda x: x[1], reverse=True)
                for subsystem, count in sorted_subsystems:
                    print(f"  • {subsystem}: {count}")
                print()
            
            # Top exact recommendations (with missing recommendation check)
            print("🎯 Top actionable recommendations:")
            top_exact = results.get_top_exact_recommendations(limit=10)
            if top_exact:
                for recommendation, count in top_exact:
                    # Show full recommendation without truncation
                    print(f"  • ({count}×) {recommendation}")
                print()
            
            # Breakdown by recommendation category  
            recommendation_summary = results.get_summary_by_recommendation()
            if recommendation_summary:
                print("📊 By recommendation type:")
                sorted_recommendations = sorted(recommendation_summary.items(), 
                                              key=lambda x: x[1], reverse=True)[:8]
                for recommendation, count in sorted_recommendations:
                    print(f"  • {recommendation}: {count}")
                print()
            
            # Reference to detailed log
            print("📋 Detailed results:")
            print("-" * 72)
            print(f"Full report: {self.output_file}")
            print()
        else:
            print("✅ Architecture check passed!")
            if suppressed_warning_count > 0:
                print(f"ℹ️  {suppressed_warning_count} warning(s) suppressed - run with --include-warnings to see them")
            print(f"Detailed report: {self.output_file}")
    
    def get_grep_suggestions(self, error_type: str = None, subsystem: str = None) -> list[str]:
        """Get grep command suggestions for filtering the JSON output."""
        suggestions = []
        
        if error_type:
            suggestions.append(f"jq '.errors[] | select(.type == \"{error_type}\")' {self.output_file}")
        
        if subsystem:
            suggestions.append(f"jq '.errors[] | select(.subsystem | contains(\"{subsystem}\"))' {self.output_file}")
        
        # General useful filters
        suggestions.extend([
            f"jq '.errors[] | select(.severity == \"error\")' {self.output_file}",
            f"jq '.errors[] | select(.severity == \"warning\")' {self.output_file}",
            f"jq '.summary' {self.output_file}",
            f"jq -r '.errors[] | \"\\(.file):\\(.line) \\(.type): \\(.message)\"' {self.output_file}"
        ])
        
        return suggestions
    
    def print_error_breakdown(self, results: CheckResults) -> None:
        """Print detailed breakdown of errors for debugging."""
        if not results.errors and not results.warnings:
            return
        
        print("\n🔍 Error Breakdown:")
        print("-" * 72)
        
        # Group by error type
        by_type: Dict[ErrorType, list] = {}
        for issue in results.get_all_issues():
            if issue.error_type not in by_type:
                by_type[issue.error_type] = []
            by_type[issue.error_type].append(issue)
        
        for error_type, issues in by_type.items():
            print(f"\n{error_type.value.upper()}: {len(issues)} issues")
            print("-" * 40)
            
            # Group by subsystem within each error type
            by_subsystem: Dict[str, list] = {}
            for issue in issues:
                subsystem = issue.subsystem or "unknown"
                if subsystem not in by_subsystem:
                    by_subsystem[subsystem] = []
                by_subsystem[subsystem].append(issue)
            
            for subsystem, subsystem_issues in by_subsystem.items():
                severity_counts = {}
                for issue in subsystem_issues:
                    sev = issue.severity.value
                    severity_counts[sev] = severity_counts.get(sev, 0) + 1
                
                severity_str = ", ".join(f"{sev}: {count}" for sev, count in severity_counts.items())
                print(f"  {subsystem}: {len(subsystem_issues)} ({severity_str})")
        
        print("-" * 72)
    
    def generate_ai_friendly_summary(self, results: CheckResults) -> str:
        """Generate a summary specifically designed for AI agents."""
        if not results.errors and not results.warnings:
            return f"✅ Architecture check passed! Report: {self.output_file}"
        
        summary_parts = [
            f"🚨 Architecture issues found: {len(results.errors)} errors, {len(results.warnings)} warnings",
            f"📄 Full report: {self.output_file}",
            "",
            "🎯 Quick filters for AI agents:"
        ]
        
        # Add useful jq commands for common use cases
        summary_parts.extend([
            f"  # Get all errors: jq '.errors[] | select(.severity == \"error\")' {self.output_file}",
            f"  # Get summary: jq '.summary' {self.output_file}",
            f"  # Get by type: jq '.errors[] | select(.type == \"TYPE\")' {self.output_file}",
            f"  # Get by subsystem: jq '.errors[] | select(.subsystem | contains(\"PATH\"))' {self.output_file}",
            ""
        ])
        
        # Show top error types and subsystems
        type_summary = results.get_summary_by_type()
        if type_summary:
            top_types = sorted(type_summary.items(), key=lambda x: x[1], reverse=True)[:3]
            summary_parts.append("🔥 Top error types:")
            for error_type, count in top_types:
                summary_parts.append(f"  • {error_type}: {count}")
            summary_parts.append("")
        
        subsystem_summary = results.get_summary_by_subsystem()
        if subsystem_summary:
            top_subsystems = sorted(subsystem_summary.items(), key=lambda x: x[1], reverse=True)[:3]
            summary_parts.append("📁 Top problematic subsystems:")
            for subsystem, count in top_subsystems:
                summary_parts.append(f"  • {subsystem}: {count}")
        
        return "\n".join(summary_parts)
    
    def _display_json_output(self, results: CheckResults) -> None:
        """Display results in JSON format."""
        report_data = results.to_dict()
        report_data["timestamp"] = datetime.now().isoformat()
        print(json.dumps(report_data, indent=2, default=str))