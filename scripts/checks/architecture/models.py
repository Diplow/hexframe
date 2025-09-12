#!/usr/bin/env python3
"""
Data models for architecture checking.

Contains all data structures used throughout the architecture checking system.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional
from enum import Enum


class ErrorType(Enum):
    """Types of architecture errors."""
    COMPLEXITY = "complexity"
    SUBSYSTEM_STRUCTURE = "subsystem_structure"
    IMPORT_BOUNDARY = "import_boundary"
    REEXPORT_BOUNDARY = "reexport_boundary"
    DEPENDENCY_FORMAT = "dependency_format"
    REDUNDANCY = "redundancy"
    NONEXISTENT_DEPENDENCY = "nonexistent_dependency"
    FILE_CONFLICT = "file_conflict"
    DOMAIN_STRUCTURE = "domain_structure"
    DOMAIN_IMPORT = "domain_import"


class Severity(Enum):
    """Error severity levels."""
    ERROR = "error"
    WARNING = "warning"


@dataclass
class FileInfo:
    """Information about a TypeScript file."""
    path: Path
    lines: int
    imports: List[str] = field(default_factory=list)
    content: str = ""


@dataclass  
class SubsystemInfo:
    """Information about a subsystem (directory with dependencies.json)."""
    path: Path
    name: str
    dependencies: Dict = field(default_factory=dict)
    files: List[FileInfo] = field(default_factory=list)
    total_lines: int = 0
    parent_path: Optional[Path] = None


@dataclass
class ArchError:
    """Represents an architectural error with enhanced metadata."""
    message: str
    error_type: ErrorType
    severity: Severity = Severity.ERROR
    subsystem: Optional[str] = None
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    recommendation: Optional[str] = None
    metadata: Optional[Dict] = field(default_factory=dict)
    
    @classmethod
    def create_error(
        cls,
        message: str,
        error_type: ErrorType,
        subsystem: Optional[str] = None,
        file_path: Optional[str] = None,
        line_number: Optional[int] = None,
        recommendation: Optional[str] = None
    ) -> "ArchError":
        """Create an error with ERROR severity."""
        return cls(
            message=message,
            error_type=error_type,
            severity=Severity.ERROR,
            subsystem=subsystem,
            file_path=file_path,
            line_number=line_number,
            recommendation=recommendation
        )
    
    @classmethod
    def create_warning(
        cls,
        message: str,
        error_type: ErrorType,
        subsystem: Optional[str] = None,
        file_path: Optional[str] = None,
        line_number: Optional[int] = None,
        recommendation: Optional[str] = None
    ) -> "ArchError":
        """Create an error with WARNING severity."""
        return cls(
            message=message,
            error_type=error_type,
            severity=Severity.WARNING,
            subsystem=subsystem,
            file_path=file_path,
            line_number=line_number,
            recommendation=recommendation
        )
    
    def to_dict(self) -> Dict:
        """Convert error to dictionary for JSON serialization."""
        result = {
            "type": self.error_type.value,
            "severity": self.severity.value,
            "message": self.message,
            "subsystem": self.subsystem,
            "file": self.file_path,
            "line": self.line_number,
            "recommendation": self.recommendation
        }
        
        # Add metadata if present
        if self.metadata:
            result.update(self.metadata)
        
        return result


@dataclass
class CheckResults:
    """Results of architecture checking."""
    errors: List[ArchError] = field(default_factory=list)
    warnings: List[ArchError] = field(default_factory=list)
    execution_time: float = 0.0
    target_path: str = "src"
    
    def add_error(self, error: ArchError) -> None:
        """Add an error to the appropriate list based on severity."""
        if error.severity == Severity.ERROR:
            self.errors.append(error)
        else:
            self.warnings.append(error)
    
    def get_all_issues(self) -> List[ArchError]:
        """Get all issues (errors + warnings)."""
        return self.errors + self.warnings
    
    def get_summary_by_type(self) -> Dict[str, int]:
        """Get count of issues by error type."""
        summary = {}
        for issue in self.get_all_issues():
            error_type = issue.error_type.value
            summary[error_type] = summary.get(error_type, 0) + 1
        return summary
    
    def get_summary_by_subsystem(self) -> Dict[str, int]:
        """Get count of issues by subsystem."""
        summary = {}
        for issue in self.get_all_issues():
            if issue.subsystem:
                subsystem = issue.subsystem
                summary[subsystem] = summary.get(subsystem, 0) + 1
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
                # Count exact recommendation text
                exact_summary[issue.recommendation] = exact_summary.get(issue.recommendation, 0) + 1
            else:
                # Track issues without recommendations
                missing_recommendations.append(issue)
        
        # Warn about missing recommendations
        if missing_recommendations:
            print(f"⚠️  Warning: {len(missing_recommendations)} issues missing recommendations:")
            for issue in missing_recommendations[:3]:  # Show first 3 as examples
                print(f"   • {issue.error_type.value}: {issue.message[:80]}...")
            if len(missing_recommendations) > 3:
                print(f"   • ... and {len(missing_recommendations) - 3} more")
            print()
        
        # Return top exact recommendations
        sorted_recommendations = sorted(exact_summary.items(), key=lambda x: x[1], reverse=True)
        return sorted_recommendations[:limit]
    
    def _categorize_recommendation(self, recommendation: str) -> str:
        """Categorize recommendation into types for summary."""
        # Handle service import violations
        if "Move service import" in recommendation and "API/server code" in recommendation:
            return "Move service to API layer"
        elif "Remove service import" in recommendation and "only domain index.ts and services/*" in recommendation:
            return "Fix domain service import"
        elif "Remove cross-domain import" in recommendation:
            return "Remove cross-domain import"
        
        # Handle file creation patterns (with new WARNING/ERROR prefixes)
        elif "Create missing files" in recommendation or "ERROR: Create missing files" in recommendation:
            return "Create missing subsystem files"
        elif ("Create" in recommendation and "README.md file" in recommendation) or ("WARNING: Create" in recommendation and "README.md file" in recommendation) or ("ERROR: Create" in recommendation and "README.md file" in recommendation):
            return "Create README documentation"
        elif "Create or update" in recommendation and "index.ts to reexport" in recommendation:
            return "Create subsystem index"
        
        # Handle import fixes
        elif "Change import from" in recommendation and "via index.ts" in recommendation:
            return "Use subsystem interface"
        elif "Change import from" in recommendation and "use utils index.ts" in recommendation:
            return "Use utils interface"
        
        # Handle dependency management
        elif "Add" in recommendation and "dependencies.json" in recommendation:
            if "'allowed'" in recommendation:
                return "Add to allowed dependencies"
            elif "'allowedChildren'" in recommendation:
                return "Add to allowedChildren"
        elif "Remove" in recommendation and "redundant" in recommendation:
            return "Remove redundant dependency"
        elif "Remove" in recommendation and "dependencies.json" in recommendation:
            return "Remove forbidden dependency"
        
        # Handle structural issues
        elif "Move file contents" in recommendation:
            return "Resolve file/folder conflict"
        elif "reexport" in recommendation.lower():
            return "Fix reexport boundary"
        
        # Legacy fallbacks (for backwards compatibility)
        elif "missing:" in recommendation:
            if "dependencies.json" in recommendation:
                return "Create dependencies.json"
            elif "README.md" in recommendation:
                return "Create README.md"
            elif "ARCHITECTURE.md" in recommendation:
                return "Create ARCHITECTURE.md"
        elif "index.ts" in recommendation:
            return "Use subsystem interface"
        
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
            "summary": {
                "total_errors": len(self.errors),
                "total_warnings": len(self.warnings),
                "by_type": self.get_summary_by_type(),
                "by_subsystem": self.get_summary_by_subsystem(),
                "by_recommendation": self.get_summary_by_recommendation()
            },
            "errors": [issue.to_dict() for issue in all_issues]
        }