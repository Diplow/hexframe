#!/usr/bin/env python3
"""
Data models for ESLint checking.

Contains all data structures used throughout the ESLint checking system.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set
from enum import Enum


class LintSeverity(Enum):
    """ESLint severity levels."""
    ERROR = 2
    WARNING = 1
    OFF = 0


@dataclass
class LintIssue:
    """Represents a single ESLint issue."""
    rule_id: str
    message: str
    severity: LintSeverity
    file_path: str
    line: int
    column: int
    end_line: Optional[int] = None
    end_column: Optional[int] = None
    
    @property
    def severity_name(self) -> str:
        """Get human-readable severity name."""
        return "error" if self.severity == LintSeverity.ERROR else "warning"


@dataclass
class FileResults:
    """ESLint results for a single file."""
    file_path: str
    issues: List[LintIssue] = field(default_factory=list)
    error_count: int = 0
    warning_count: int = 0
    
    def add_issue(self, issue: LintIssue) -> None:
        """Add an issue to this file's results."""
        self.issues.append(issue)
        if issue.severity == LintSeverity.ERROR:
            self.error_count += 1
        elif issue.severity == LintSeverity.WARNING:
            self.warning_count += 1
    
    @property
    def total_issues(self) -> int:
        """Total number of issues in this file."""
        return len(self.issues)


@dataclass
class DirectoryStats:
    """Statistics for a directory."""
    path: str
    total_issues: int = 0
    error_count: int = 0
    warning_count: int = 0
    files_affected: int = 0
    rule_counts: Dict[str, int] = field(default_factory=dict)


@dataclass
class RuleStats:
    """Statistics for a specific rule."""
    rule_id: str
    total_count: int = 0
    error_count: int = 0
    warning_count: int = 0
    files_affected: Set[str] = field(default_factory=set)
    
    @property
    def files_count(self) -> int:
        """Number of files affected by this rule."""
        return len(self.files_affected)


@dataclass
class LintResults:
    """Complete ESLint results with analysis."""
    files: List[FileResults] = field(default_factory=list)
    total_issues: int = 0
    total_errors: int = 0
    total_warnings: int = 0
    total_files: int = 0
    files_with_issues: int = 0
    
    # Grouped analysis
    directory_stats: Dict[str, DirectoryStats] = field(default_factory=dict)
    rule_stats: Dict[str, RuleStats] = field(default_factory=dict)
    
    def add_file_results(self, file_results: FileResults) -> None:
        """Add results for a file."""
        self.files.append(file_results)
        self.total_files += 1
        
        if file_results.total_issues > 0:
            self.files_with_issues += 1
            self.total_issues += file_results.total_issues
            self.total_errors += file_results.error_count
            self.total_warnings += file_results.warning_count
    
    def has_errors(self) -> bool:
        """Check if there are any errors."""
        return self.total_errors > 0
    
    def has_issues(self) -> bool:
        """Check if there are any issues (errors or warnings)."""
        return self.total_issues > 0
    
    def get_most_affected_files(self, limit: int = 10) -> List[FileResults]:
        """Get files with the most issues."""
        return sorted(
            [f for f in self.files if f.total_issues > 0],
            key=lambda f: f.total_issues,
            reverse=True
        )[:limit]
    
    def get_top_rules(self, limit: int = 10) -> List[RuleStats]:
        """Get the most violated rules."""
        return sorted(
            self.rule_stats.values(),
            key=lambda r: r.total_count,
            reverse=True
        )[:limit]
    
    def get_top_directories(self, limit: int = 10) -> List[DirectoryStats]:
        """Get directories with the most issues."""
        return sorted(
            self.directory_stats.values(),
            key=lambda d: d.total_issues,
            reverse=True
        )[:limit]
    
    def to_dict(self) -> Dict:
        """Convert results to dictionary for JSON serialization."""
        return {
            "summary": {
                "total_issues": self.total_issues,
                "total_errors": self.total_errors,
                "total_warnings": self.total_warnings,
                "total_files": self.total_files,
                "files_with_issues": self.files_with_issues
            },
            "files": [
                {
                    "path": f.file_path,
                    "issues": [
                        {
                            "rule": i.rule_id,
                            "message": i.message,
                            "severity": i.severity_name,
                            "line": i.line,
                            "column": i.column,
                            "end_line": i.end_line,
                            "end_column": i.end_column
                        }
                        for i in f.issues
                    ],
                    "error_count": f.error_count,
                    "warning_count": f.warning_count
                }
                for f in self.files if f.total_issues > 0
            ],
            "directory_stats": {
                path: {
                    "total_issues": stats.total_issues,
                    "error_count": stats.error_count,
                    "warning_count": stats.warning_count,
                    "files_affected": stats.files_affected,
                    "rule_counts": stats.rule_counts
                }
                for path, stats in self.directory_stats.items()
            },
            "rule_stats": {
                rule_id: {
                    "total_count": stats.total_count,
                    "error_count": stats.error_count,
                    "warning_count": stats.warning_count,
                    "files_affected": list(stats.files_affected)
                }
                for rule_id, stats in self.rule_stats.items()
            }
        }