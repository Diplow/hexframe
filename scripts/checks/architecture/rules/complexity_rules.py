#!/usr/bin/env python3
"""
Complexity-based architecture rules.

Handles checking for complexity-based documentation requirements.
"""

from pathlib import Path
from typing import List

from ..models import ArchError, ErrorType, RecommendationType, SubsystemInfo
from ..utils.file_utils import count_typescript_lines
from ..utils.path_utils import PathHelper


class ComplexityRuleChecker:
    """Checker for complexity-based documentation requirements."""
    
    def __init__(self, path_helper: PathHelper, file_cache=None, exception_handler=None,
                 complexity_threshold: int = 1000, 
                 doc_threshold: int = 500):
        self.path_helper = path_helper
        self.file_cache = file_cache
        self.exception_handler = exception_handler
        self.complexity_threshold = complexity_threshold
        self.doc_threshold = doc_threshold
    
    def check_complexity_requirements(self) -> List[ArchError]:
        """Check directories for complexity-based documentation requirements."""
        errors = []
        # print("Scanning directories for complexity requirements...")
        
        directories_to_check = self.path_helper.get_directories_to_check()
        
        for directory in directories_to_check:
            if not directory.is_dir():
                continue
                
            # Skip directories that should not be traversed at all
            if self.path_helper.is_traversal_exception(directory):
                continue
            
            # Skip if parent is already a subsystem AND this directory is declared as a subsystem
            if self._is_declared_child_subsystem(directory, self.file_cache):
                continue
            
            lines = count_typescript_lines(directory)
            
            # Only apply architecture requirements if directory is NOT a rule exception
            if not self.path_helper.is_rule_exception(directory):
                # Check for custom thresholds from exception files
                custom_thresholds = self._get_custom_thresholds(directory)
                complexity_threshold = custom_thresholds.get("complexity", self.complexity_threshold)
                doc_threshold = custom_thresholds.get("doc", self.doc_threshold)
                exception_info = custom_thresholds.get("exception_info")
                
                if lines > complexity_threshold:
                    # Complex folder needs full subsystem structure
                    missing = self._get_missing_subsystem_files(directory)
                    
                    if missing:
                        threshold_msg = f" (custom threshold {complexity_threshold})" if exception_info else ""
                        recommendation = f"ERROR: Create {directory}/README.md file (follow guidelines in scripts/checks/architecture/README-STRUCTURE.md)" if missing == ["README.md"] else f"ERROR: Create missing files in {directory}: {', '.join(missing)} (for README.md follow guidelines in scripts/checks/architecture/README-STRUCTURE.md)"
                        
                        rec_type = RecommendationType.CREATE_README if missing == ["README.md"] else RecommendationType.CREATE_SUBSYSTEM_FILES
                        error = ArchError.create_error(
                            message=f"❌ {directory} ({lines} lines){threshold_msg} missing: {' '.join(missing)}",
                            error_type=ErrorType.COMPLEXITY,
                            subsystem=str(directory),
                            recommendation=recommendation,
                            recommendation_type=rec_type
                        )
                        
                        # Add exception info for reporting
                        if exception_info:
                            error.metadata = {
                                "custom_threshold": complexity_threshold,
                                "default_threshold": self.complexity_threshold,
                                "exception_source": exception_info.get("exception_source"),
                                "justification": exception_info.get("justification")
                            }
                        
                        errors.append(error)
                
                elif lines > doc_threshold:
                    # Medium complexity needs README
                    if not (directory / "README.md").exists():
                        threshold_msg = f" (custom threshold {doc_threshold})" if exception_info else ""
                        
                        warning = ArchError.create_warning(
                            message=f"⚠️  {directory} ({lines} lines){threshold_msg} - missing README.md",
                            error_type=ErrorType.COMPLEXITY,
                            subsystem=str(directory),
                            recommendation=f"WARNING: Create {directory}/README.md file (follow guidelines in scripts/checks/architecture/README-STRUCTURE.md)",
                            recommendation_type=RecommendationType.CREATE_README
                        )
                        
                        # Add exception info for reporting
                        if exception_info:
                            warning.metadata = {
                                "custom_threshold": doc_threshold,
                                "default_threshold": self.doc_threshold,
                                "exception_source": exception_info.get("exception_source"),
                                "justification": exception_info.get("justification")
                            }
                        
                        errors.append(warning)
        
        return errors
    
    def check_subsystem_completeness(self, subsystems: List[SubsystemInfo]) -> List[ArchError]:
        """Check that subsystems have all required files."""
        errors = []
        # print("Checking subsystems for completeness...")
        
        for subsystem in subsystems:
            # Check for custom thresholds from exception files
            custom_thresholds = self._get_custom_thresholds(subsystem.path)
            complexity_threshold = custom_thresholds.get("complexity", self.complexity_threshold)
            exception_info = custom_thresholds.get("exception_info")
            
            # Only require documentation for complex subsystems (over threshold)
            if subsystem.total_lines <= complexity_threshold:
                continue
                
            missing = self._get_missing_subsystem_files(subsystem.path)
            
            if missing:
                threshold_msg = f" (custom threshold {complexity_threshold})" if exception_info else ""
                recommendation = f"ERROR: Create {subsystem.path}/README.md file (follow guidelines in scripts/checks/architecture/README-STRUCTURE.md)" if missing == ["README.md"] else f"ERROR: Create missing files in {subsystem.path}: {', '.join(missing)} (for README.md follow guidelines in scripts/checks/architecture/README-STRUCTURE.md)"
                
                rec_type = RecommendationType.CREATE_README if missing == ["README.md"] else RecommendationType.CREATE_SUBSYSTEM_FILES
                error = ArchError.create_error(
                    message=(f"❌ Subsystem {subsystem.path} ({subsystem.total_lines} lines){threshold_msg} "
                           f"missing: {' '.join(missing)}"),
                    error_type=ErrorType.SUBSYSTEM_STRUCTURE,
                    subsystem=str(subsystem.path),
                    recommendation=recommendation,
                    recommendation_type=rec_type
                )
                
                # Add exception info for reporting
                if exception_info:
                    error.metadata = {
                        "custom_threshold": complexity_threshold,
                        "default_threshold": self.complexity_threshold,
                        "exception_source": exception_info.get("exception_source"),
                        "justification": exception_info.get("justification")
                    }
                
                errors.append(error)
        
        return errors
    
    def _is_declared_child_subsystem(self, directory: Path, file_cache=None) -> bool:
        """Check if directory is a declared child subsystem of its parent."""
        parent = directory.parent
        if parent == directory or not (parent / "dependencies.json").exists():
            return False
        
        # Use provided file cache or create temporary one
        if file_cache:
            parent_deps = file_cache.load_dependencies_json(parent / "dependencies.json")
        else:
            import json
            try:
                with open(parent / "dependencies.json") as f:
                    parent_deps = json.load(f)
            except (json.JSONDecodeError, OSError):
                parent_deps = {}
        
        subsystems_array = parent_deps.get("subsystems", [])
        relative_path = f"./{directory.name}"
        
        # Only skip if this directory is properly declared as a subsystem
        return relative_path in subsystems_array
    
    def _get_missing_subsystem_files(self, directory: Path) -> List[str]:
        """Get list of missing required files for a subsystem."""
        missing = []
        
        if not (directory / "dependencies.json").exists():
            missing.append("dependencies.json")
        if not (directory / "README.md").exists():
            missing.append("README.md")
        # ARCHITECTURE.md no longer required - consolidated into README.md
        
        return missing
    
    def _get_custom_thresholds(self, directory: Path) -> dict:
        """Get custom thresholds for a directory from exception files."""
        if not self.exception_handler:
            return {}
        
        exception = self.exception_handler.get_custom_threshold(directory)
        if not exception:
            return {}
        
        # For now, use the custom threshold for both complexity and doc thresholds
        # Could be extended to support separate thresholds
        custom_threshold = exception.threshold
        
        # Scale the doc threshold proportionally
        doc_ratio = self.doc_threshold / self.complexity_threshold
        custom_doc_threshold = int(custom_threshold * doc_ratio)
        
        return {
            "complexity": custom_threshold,
            "doc": custom_doc_threshold,
            "exception_info": {
                "exception_source": str(exception.source_file.relative_to(self.exception_handler.project_root)),
                "justification": exception.justification
            }
        }