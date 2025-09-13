#!/usr/bin/env python3
"""
Data models for Rule of 6 checking.

Contains all data structures used throughout the Rule of 6 checking system.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional
from enum import Enum


class ViolationType(Enum):
    """Types of Rule of 6 violations."""
    DIRECTORY_ITEMS = "directory_items"
    DIRECTORY_DOMAIN_FOLDERS = "directory_domain_folders"
    DIRECTORY_DOMAIN_FILES = "directory_domain_files"
    FILE_FUNCTIONS = "file_functions"
    FUNCTION_LINES = "function_lines"
    FUNCTION_ARGS = "function_args"
    OBJECT_KEYS = "object_keys"


class Severity(Enum):
    """Violation severity levels."""
    ERROR = "error"
    WARNING = "warning"


@dataclass
class FunctionInfo:
    """Information about a function in a TypeScript file."""
    name: str
    line_start: int
    line_end: int
    line_count: int
    arg_count: int
    file_path: Path
    
    def __post_init__(self):
        """Validate function info after initialization."""
        if self.line_start <= 0:
            raise ValueError(f"Invalid line_start: {self.line_start}")
        if self.line_end < self.line_start:
            raise ValueError(f"Invalid line_end: {self.line_end} < {self.line_start}")


@dataclass
class DirectoryInfo:
    """Information about a directory."""
    path: Path
    item_count: int
    items: List[str] = field(default_factory=list)
    
    def get_item_list_display(self, max_items: int = 8) -> str:
        """Get a display string for directory items."""
        if len(self.items) <= max_items:
            return ", ".join(self.items)
        return ", ".join(self.items[:max_items]) + "..."


@dataclass
class DomainDirectoryInfo:
    """Information about a directory with domain/generic item separation."""
    path: Path
    domain_folder_count: int
    domain_file_count: int
    generic_folder_count: int
    generic_file_count: int
    domain_folders: List[str] = field(default_factory=list)
    domain_files: List[str] = field(default_factory=list)
    generic_folders: List[str] = field(default_factory=list)
    generic_files: List[str] = field(default_factory=list)
    
    @property
    def total_item_count(self) -> int:
        """Get total count of all items (domain + generic)."""
        return (self.domain_folder_count + self.domain_file_count + 
                self.generic_folder_count + self.generic_file_count)
    
    @property
    def domain_item_count(self) -> int:
        """Get total count of domain items only."""
        return self.domain_folder_count + self.domain_file_count
    
    def get_domain_items_display(self, max_items: int = 8) -> str:
        """Get a display string for domain items."""
        domain_items = self.domain_folders + self.domain_files
        if len(domain_items) <= max_items:
            return ", ".join(domain_items)
        return ", ".join(domain_items[:max_items]) + "..."
    
    def get_generic_items_display(self, max_items: int = 8) -> str:
        """Get a display string for generic items."""
        generic_items = self.generic_folders + self.generic_files
        if len(generic_items) <= max_items:
            return ", ".join(generic_items)
        return ", ".join(generic_items[:max_items]) + "..."


@dataclass
class FileAnalysis:
    """Analysis results for a single TypeScript file."""
    path: Path
    line_count: int
    function_count: int
    functions: List[FunctionInfo] = field(default_factory=list)
    
    def get_function_names(self, max_names: int = 8) -> List[str]:
        """Get function names for display, truncated if needed."""
        names = [f.name for f in self.functions[:max_names]]
        if len(self.functions) > max_names:
            names.append("...")
        return names


@dataclass
class RuleOf6Violation:
    """Represents a Rule of 6 violation with enhanced metadata."""
    message: str
    violation_type: ViolationType
    severity: Severity = Severity.ERROR
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    recommendation: Optional[str] = None
    context: Optional[Dict] = None
    exception_source: Optional[str] = None
    custom_threshold: Optional[int] = None
    default_threshold: Optional[int] = None
    
    @classmethod
    def create_error(
        cls,
        message: str,
        violation_type: ViolationType,
        file_path: Optional[str] = None,
        line_number: Optional[int] = None,
        recommendation: Optional[str] = None,
        context: Optional[Dict] = None,
        exception_source: Optional[str] = None,
        custom_threshold: Optional[int] = None,
        default_threshold: Optional[int] = None
    ) -> "RuleOf6Violation":
        """Create a violation with ERROR severity."""
        return cls(
            message=message,
            violation_type=violation_type,
            severity=Severity.ERROR,
            file_path=file_path,
            line_number=line_number,
            recommendation=recommendation,
            context=context,
            exception_source=exception_source,
            custom_threshold=custom_threshold,
            default_threshold=default_threshold
        )
    
    @classmethod
    def create_warning(
        cls,
        message: str,
        violation_type: ViolationType,
        file_path: Optional[str] = None,
        line_number: Optional[int] = None,
        recommendation: Optional[str] = None,
        context: Optional[Dict] = None,
        exception_source: Optional[str] = None,
        custom_threshold: Optional[int] = None,
        default_threshold: Optional[int] = None
    ) -> "RuleOf6Violation":
        """Create a violation with WARNING severity."""
        return cls(
            message=message,
            violation_type=violation_type,
            severity=Severity.WARNING,
            file_path=file_path,
            line_number=line_number,
            recommendation=recommendation,
            context=context,
            exception_source=exception_source,
            custom_threshold=custom_threshold,
            default_threshold=default_threshold
        )
    
    def to_dict(self) -> Dict:
        """Convert violation to dictionary for JSON serialization."""
        result = {
            "type": self.violation_type.value,
            "severity": self.severity.value,
            "message": self.message,
            "file": self.file_path,
            "line": self.line_number,
            "recommendation": self.recommendation,
            "context": self.context
        }
        
        # Add exception metadata if available
        if self.exception_source is not None:
            result["exception_source"] = self.exception_source
        if self.custom_threshold is not None:
            result["custom_threshold"] = self.custom_threshold
        if self.default_threshold is not None:
            result["default_threshold"] = self.default_threshold
            
        return result


@dataclass
class CheckResults:
    """Results of Rule of 6 checking."""
    errors: List[RuleOf6Violation] = field(default_factory=list)
    warnings: List[RuleOf6Violation] = field(default_factory=list)
    execution_time: float = 0.0
    target_path: str = "src"
    rules_applied: Dict[str, int] = field(default_factory=dict)
    
    def add_violation(self, violation: RuleOf6Violation) -> None:
        """Add a violation to the appropriate list based on severity."""
        if violation.severity == Severity.ERROR:
            self.errors.append(violation)
        else:
            self.warnings.append(violation)
    
    def get_all_violations(self) -> List[RuleOf6Violation]:
        """Get all violations (errors + warnings)."""
        return self.errors + self.warnings
    
    def get_summary_by_type(self) -> Dict[str, int]:
        """Get count of violations by type."""
        summary = {}
        for violation in self.get_all_violations():
            violation_type = violation.violation_type.value
            summary[violation_type] = summary.get(violation_type, 0) + 1
        return summary
    
    def get_summary_by_path(self) -> Dict[str, int]:
        """Get count of violations by file path or directory."""
        summary = {}
        for violation in self.get_all_violations():
            if violation.file_path:
                path_key = str(Path(violation.file_path).parent)
                summary[path_key] = summary.get(path_key, 0) + 1
        return summary
    
    def get_summary_by_recommendation(self) -> Dict[str, int]:
        """Get count of violations by recommendation category."""
        summary = {}
        for violation in self.get_all_violations():
            if violation.recommendation:
                rec_category = self._categorize_recommendation(violation.recommendation)
                summary[rec_category] = summary.get(rec_category, 0) + 1
        return summary
    
    def get_top_exact_recommendations(self, limit: int = 5) -> List[tuple[str, int]]:
        """Get the most common exact recommendations."""
        exact_summary = {}
        
        for violation in self.get_all_violations():
            if violation.recommendation:
                exact_summary[violation.recommendation] = exact_summary.get(violation.recommendation, 0) + 1
        
        sorted_recommendations = sorted(exact_summary.items(), key=lambda x: x[1], reverse=True)
        return sorted_recommendations[:limit]
    
    def _categorize_recommendation(self, recommendation: str) -> str:
        """Categorize recommendation into types for summary."""
        if "group" in recommendation.lower() and ("subdirector" in recommendation.lower() or "folder" in recommendation.lower()):
            return "Group into subdirectories"
        elif "split" in recommendation.lower() and ("file" in recommendation.lower() or "function" in recommendation.lower()):
            return "Split files or functions"
        elif "refactor" in recommendation.lower() and ("function" in recommendation.lower() or "smaller" in recommendation.lower()):
            return "Refactor large functions"
        elif "argument" in recommendation.lower() or "parameter" in recommendation.lower():
            return "Reduce function arguments"
        elif "object" in recommendation.lower() and ("key" in recommendation.lower() or "parameter" in recommendation.lower()):
            return "Simplify object parameters"
        elif "meaningful" in recommendation.lower() or "abstraction" in recommendation.lower():
            return "Create meaningful abstractions"
        else:
            return "Other refactoring"
    
    def has_errors(self) -> bool:
        """Check if there are any errors (not warnings)."""
        return len(self.errors) > 0
    
    def to_dict(self) -> Dict:
        """Convert results to dictionary for JSON serialization."""
        all_violations = self.get_all_violations()
        return {
            "timestamp": None,  # Will be set by reporter
            "target_path": self.target_path,
            "execution_time": self.execution_time,
            "rules_applied": self.rules_applied,
            "summary": {
                "total_errors": len(self.errors),
                "total_warnings": len(self.warnings),
                "by_type": self.get_summary_by_type(),
                "by_path": self.get_summary_by_path(),
                "by_recommendation": self.get_summary_by_recommendation()
            },
            "violations": [violation.to_dict() for violation in all_violations]
        }