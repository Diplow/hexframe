#!/usr/bin/env python3
"""
Dead code check reporting module.

Handles result reporting, JSON output generation, and console summaries.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict

from .models import CheckResults, DeadCodeType, Severity


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
    
    def _display_console_summary(self, results: CheckResults) -> None:
        """Display summary information on console."""
        print()
        
        # Show summary statistics
        total_errors = len(results.errors)
        total_warnings = len(results.warnings)
        
        if total_errors > 0 or total_warnings > 0:
            print("📊 Dead Code Analysis Summary:")
            print("=" * 72)
            print(f"• Total errors: {total_errors}")
            print(f"• Total warnings: {total_warnings}")
            print(f"• Files analyzed: {results.files_analyzed}")
            print()
            
            # Breakdown by issue type
            type_summary = results.get_summary_by_type()
            if type_summary:
                print("🔍 By issue type:")
                for issue_type, count in sorted(type_summary.items()):
                    emoji = self._get_type_emoji(issue_type)
                    print(f"  {emoji} {issue_type.replace('_', ' ').title()}: {count}")
                print()
            
            # Breakdown by file (top 10 most problematic)
            file_summary = results.get_summary_by_file()
            if file_summary:
                print("📁 Most problematic files:")
                sorted_files = sorted(file_summary.items(), 
                                    key=lambda x: x[1], reverse=True)
                for file_path, count in sorted_files[:10]:
                    print(f"  • {file_path}: {count} issues")
                print()
            
            # Top exact recommendations
            print("🎯 Top actionable recommendations:")
            top_exact = results.get_top_exact_recommendations(limit=10)
            if top_exact:
                for recommendation, count in top_exact:
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
            
            # AI-friendly filtering suggestions
            if total_errors > 0 or total_warnings > 0:
                print("🤖 AI-friendly filtering commands:")
                print(f"  # Get all errors: jq '.issues[] | select(.severity == \"error\")' {self.output_file}")
                print(f"  # Get all warnings: jq '.issues[] | select(.severity == \"warning\")' {self.output_file}")
                print(f"  # Get by type: jq '.issues[] | select(.type == \"unused_export\")' {self.output_file}")
                print(f"  # Get by file: jq '.issues[] | select(.file | contains(\"FILENAME\"))' {self.output_file}")
                print(f"  # Get summary: jq '.summary' {self.output_file}")
                print()
        else:
            print("✅ Dead code check passed!")
            print(f"📁 Analyzed {results.files_analyzed} files")
            print(f"📋 Detailed report: {self.output_file}")
    
    def _get_type_emoji(self, issue_type: str) -> str:
        """Get emoji for issue type."""
        emoji_map = {
            "unused_export": "📤",
            "unused_import": "📥", 
            "unused_symbol": "💀"
        }
        return emoji_map.get(issue_type, "❓")
    
    def get_grep_suggestions(self, issue_type: str = None, file_path: str = None) -> list[str]:
        """Get grep command suggestions for filtering the JSON output."""
        suggestions = []
        
        if issue_type:
            suggestions.append(f"jq '.issues[] | select(.type == \"{issue_type}\")' {self.output_file}")
        
        if file_path:
            suggestions.append(f"jq '.issues[] | select(.file | contains(\"{file_path}\"))' {self.output_file}")
        
        # General useful filters
        suggestions.extend([
            f"jq '.issues[] | select(.severity == \"error\")' {self.output_file}",
            f"jq '.issues[] | select(.severity == \"warning\")' {self.output_file}",
            f"jq '.summary' {self.output_file}",
            f"jq -r '.issues[] | \"\\(.file):\\(.line) \\(.type): \\(.message)\"' {self.output_file}"
        ])
        
        return suggestions
    
    def print_issue_breakdown(self, results: CheckResults) -> None:
        """Print detailed breakdown of issues for debugging."""
        if not results.errors and not results.warnings:
            return
        
        print("\n🔍 Issue Breakdown:")
        print("-" * 72)
        
        # Group by issue type
        by_type: Dict[DeadCodeType, list] = {}
        for issue in results.get_all_issues():
            if issue.issue_type not in by_type:
                by_type[issue.issue_type] = []
            by_type[issue.issue_type].append(issue)
        
        for issue_type, issues in by_type.items():
            emoji = self._get_type_emoji(issue_type.value)
            print(f"\n{emoji} {issue_type.value.upper().replace('_', ' ')}: {len(issues)} issues")
            print("-" * 40)
            
            # Group by file within each issue type
            by_file: Dict[str, list] = {}
            for issue in issues:
                file_path = issue.file_path or "unknown"
                if file_path not in by_file:
                    by_file[file_path] = []
                by_file[file_path].append(issue)
            
            for file_path, file_issues in by_file.items():
                severity_counts = {}
                for issue in file_issues:
                    sev = issue.severity.value
                    severity_counts[sev] = severity_counts.get(sev, 0) + 1
                
                severity_str = ", ".join(f"{sev}: {count}" for sev, count in severity_counts.items())
                print(f"  {file_path}: {len(file_issues)} ({severity_str})")
        
        print("-" * 72)
    
    def generate_ai_friendly_summary(self, results: CheckResults) -> str:
        """Generate a summary specifically designed for AI agents."""
        if not results.errors and not results.warnings:
            return f"✅ Dead code check passed! Analyzed {results.files_analyzed} files. Report: {self.output_file}"
        
        summary_parts = [
            f"💀 Dead code issues found: {len(results.errors)} errors, {len(results.warnings)} warnings",
            f"📁 Analyzed {results.files_analyzed} files",
            f"📄 Full report: {self.output_file}",
            "",
            "🎯 Quick filters for AI agents:"
        ]
        
        # Add useful jq commands for common use cases
        summary_parts.extend([
            f"  # Get all errors: jq '.issues[] | select(.severity == \"error\")' {self.output_file}",
            f"  # Get summary: jq '.summary' {self.output_file}",
            f"  # Get by type: jq '.issues[] | select(.type == \"TYPE\")' {self.output_file}",
            f"  # Get by file: jq '.issues[] | select(.file | contains(\"PATH\"))' {self.output_file}",
            ""
        ])
        
        # Show top issue types and files
        type_summary = results.get_summary_by_type()
        if type_summary:
            top_types = sorted(type_summary.items(), key=lambda x: x[1], reverse=True)[:3]
            summary_parts.append("🔥 Top issue types:")
            for issue_type, count in top_types:
                emoji = self._get_type_emoji(issue_type)
                summary_parts.append(f"  {emoji} {issue_type.replace('_', ' ').title()}: {count}")
            summary_parts.append("")
        
        file_summary = results.get_summary_by_file()
        if file_summary:
            top_files = sorted(file_summary.items(), key=lambda x: x[1], reverse=True)[:3]
            summary_parts.append("📁 Most problematic files:")
            for file_path, count in top_files:
                summary_parts.append(f"  • {file_path}: {count} issues")
        
        return "\n".join(summary_parts)