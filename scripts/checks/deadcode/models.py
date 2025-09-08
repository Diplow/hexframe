#!/usr/bin/env python3
"""
Data models for dead code checking.

Contains all data structures used throughout the dead code checking system.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Set
from enum import Enum


class DeadCodeType(Enum):
    """Types of dead code violations."""
    UNUSED_EXPORT = "unused_export"
    UNUSED_IMPORT = "unused_import" 
    UNUSED_SYMBOL = "unused_symbol"


class Severity(Enum):
    """Error severity levels."""
    ERROR = "error"
    WARNING = "warning"


@dataclass
class Export:
    """Represents an exported symbol."""
    name: str
    file_path: Path
    line_number: int
    export_type: str  # 'default', 'named', 'type', 'interface'
    is_reexport: bool = False


@dataclass
class Import:
    """Represents an imported symbol."""
    name: str
    from_path: str
    file_path: Path
    line_number: int
    import_type: str  # 'default', 'named', 'type', 'namespace'


@dataclass
class Symbol:
    """Represents a local symbol (function, variable, etc.)."""
    name: str
    file_path: Path
    line_number: int
    symbol_type: str  # 'function', 'variable', 'const', 'class', 'interface', 'type'
    is_exported: bool = False


@dataclass
class FileAnalysis:
    """Analysis results for a single file."""
    path: Path
    exports: List[Export] = field(default_factory=list)
    imports: List[Import] = field(default_factory=list) 
    symbols: List[Symbol] = field(default_factory=list)
    used_symbols: Set[str] = field(default_factory=set)
    content: str = ""
    lines: int = 0


@dataclass
class DeadCodeIssue:
    """Represents a dead code violation with enhanced metadata."""
    message: str
    issue_type: DeadCodeType
    severity: Severity = Severity.WARNING
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    recommendation: Optional[str] = None
    symbol_name: Optional[str] = None
    
    @classmethod
    def create_error(
        cls,
        message: str,
        issue_type: DeadCodeType,
        file_path: Optional[str] = None,
        line_number: Optional[int] = None,
        recommendation: Optional[str] = None,
        symbol_name: Optional[str] = None
    ) -> "DeadCodeIssue":
        """Create an issue with ERROR severity."""
        return cls(
            message=message,
            issue_type=issue_type,
            severity=Severity.ERROR,
            file_path=file_path,
            line_number=line_number,
            recommendation=recommendation,
            symbol_name=symbol_name
        )
    
    @classmethod
    def create_warning(
        cls,
        message: str,
        issue_type: DeadCodeType,
        file_path: Optional[str] = None,
        line_number: Optional[int] = None,
        recommendation: Optional[str] = None,
        symbol_name: Optional[str] = None
    ) -> "DeadCodeIssue":
        """Create an issue with WARNING severity."""
        return cls(
            message=message,
            issue_type=issue_type,
            severity=Severity.WARNING,
            file_path=file_path,
            line_number=line_number,
            recommendation=recommendation,
            symbol_name=symbol_name
        )
    
    def to_dict(self) -> Dict:
        """Convert issue to dictionary for JSON serialization."""
        return {
            "type": self.issue_type.value,
            "severity": self.severity.value,
            "message": self.message,
            "file": self.file_path,
            "line": self.line_number,
            "recommendation": self.recommendation,
            "symbol_name": self.symbol_name
        }


@dataclass
class CheckResults:
    """Results of dead code checking."""
    errors: List[DeadCodeIssue] = field(default_factory=list)
    warnings: List[DeadCodeIssue] = field(default_factory=list)
    execution_time: float = 0.0
    target_path: str = "src"
    files_analyzed: int = 0
    
    def add_issue(self, issue: DeadCodeIssue) -> None:
        """Add an issue to the appropriate list based on severity."""
        if issue.severity == Severity.ERROR:
            self.errors.append(issue)
        else:
            self.warnings.append(issue)
    
    def get_all_issues(self) -> List[DeadCodeIssue]:
        """Get all issues (errors + warnings)."""
        return self.errors + self.warnings
    
    def get_summary_by_type(self) -> Dict[str, int]:
        """Get count of issues by dead code type."""
        summary = {}
        for issue in self.get_all_issues():
            issue_type = issue.issue_type.value
            summary[issue_type] = summary.get(issue_type, 0) + 1
        return summary
    
    def get_summary_by_file(self) -> Dict[str, int]:
        """Get count of issues by file."""
        summary = {}
        for issue in self.get_all_issues():
            if issue.file_path:
                summary[issue.file_path] = summary.get(issue.file_path, 0) + 1
        return summary
    
    def get_summary_by_recommendation(self) -> Dict[str, int]:
        """Get count of issues by recommendation type."""
        summary = {}
        for issue in self.get_all_issues():
            if issue.recommendation:
                rec_type = self._categorize_recommendation(issue.recommendation)
                summary[rec_type] = summary.get(rec_type, 0) + 1
        return summary
    
    def get_top_exact_recommendations(self, limit: int = 3) -> List[tuple[str, int]]:
        """Get the most common exact recommendations."""
        exact_summary = {}
        missing_recommendations = []
        
        for issue in self.get_all_issues():
            if issue.recommendation:
                exact_summary[issue.recommendation] = exact_summary.get(issue.recommendation, 0) + 1
            else:
                missing_recommendations.append(issue)
        
        # Return top exact recommendations
        sorted_recommendations = sorted(exact_summary.items(), key=lambda x: x[1], reverse=True)
        return sorted_recommendations[:limit]
    
    def _categorize_recommendation(self, recommendation: str) -> str:
        """Categorize recommendation into types for summary."""
        if "Remove unused export" in recommendation:
            return "Remove unused export"
        elif "Remove unused import" in recommendation:
            return "Remove unused import"
        elif "Remove unused" in recommendation and "symbol" in recommendation:
            return "Remove unused symbol"
        elif "Consider refactoring" in recommendation:
            return "Refactoring suggestion"
        elif "Move to utility" in recommendation:
            return "Extract to utility"
        
        return "Other"
    
    def has_errors(self) -> bool:
        """Check if there are any errors (not warnings)."""
        return len(self.errors) > 0
    
    def to_dict(self) -> Dict:
        """Convert results to dictionary for JSON serialization."""
        all_issues = self.get_all_issues()
        return {
            "timestamp": None,  # Will be set by reporter
            "target_path": self.target_path,
            "execution_time": self.execution_time,
            "files_analyzed": self.files_analyzed,
            "summary": {
                "total_errors": len(self.errors),
                "total_warnings": len(self.warnings),
                "by_type": self.get_summary_by_type(),
                "by_file": self.get_summary_by_file(),
                "by_recommendation": self.get_summary_by_recommendation()
            },
            "issues": [issue.to_dict() for issue in all_issues]
        }