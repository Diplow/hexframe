#!/usr/bin/env python3
"""
Main architecture checker orchestration.

Coordinates all rule checkers and manages the overall checking process.
"""

import time
from pathlib import Path
from typing import List

from .models import CheckResults, SubsystemInfo, FileInfo
from .rules import ComplexityRuleChecker, SubsystemRuleChecker, ImportRuleChecker, DomainRuleChecker
from .utils import FileCache, PathHelper
from .utils.file_utils import find_typescript_files


class ArchitectureChecker:
    """Main architecture checker that orchestrates all rule checking."""
    
    def __init__(self, target_path: str = "src"):
        self.path_helper = PathHelper(target_path)
        self.file_cache = FileCache()
        
        # Initialize rule checkers
        self.complexity_checker = ComplexityRuleChecker(self.path_helper, self.file_cache)
        self.subsystem_checker = SubsystemRuleChecker(self.path_helper, self.file_cache)
        self.import_checker = ImportRuleChecker(self.path_helper, self.file_cache)
        self.domain_checker = DomainRuleChecker(self.path_helper, self.file_cache)
        
        # Track subsystems for cross-rule coordination
        self.subsystems: List[SubsystemInfo] = []
    
    def run_all_checks(self) -> CheckResults:
        """Run all architecture checks and return results."""
        start_time = time.time()
        results = CheckResults(target_path=str(self.path_helper.target_path))
        
        # print(f"🏗️ Checking architectural boundaries in {self.path_helper.target_path}...")
        
        # Single pass: find all subsystems and cache file info
        self.subsystems = self._find_all_subsystems()
        
        # Run all checks in logical order
        self._run_complexity_checks(results)
        self._run_subsystem_checks(results)
        self._run_import_checks(results)
        self._run_domain_checks(results)
        
        results.execution_time = time.time() - start_time
        return results
    
    def _find_all_subsystems(self) -> List[SubsystemInfo]:
        """Find all subsystems in target path."""
        subsystems = []
        
        deps_files = self.path_helper.find_dependencies_files()
        
        for deps_file in deps_files:
            subsystem_dir = deps_file.parent
            
            # Load subsystem info
            dependencies = self.file_cache.load_dependencies_json(deps_file)
            
            # Find all TypeScript files in subsystem
            files = self._find_subsystem_files(subsystem_dir)
            total_lines = sum(f.lines for f in files)
            
            subsystem = SubsystemInfo(
                path=subsystem_dir,
                name=subsystem_dir.name,
                dependencies=dependencies,
                files=files,
                total_lines=total_lines,
                parent_path=subsystem_dir.parent
            )
            
            subsystems.append(subsystem)
        
        return subsystems
    
    def _find_subsystem_files(self, subsystem_dir: Path) -> List[FileInfo]:
        """Find and cache all TypeScript files in a subsystem."""
        files = []
        
        for pattern in ["*.ts", "*.tsx"]:
            for ts_file in subsystem_dir.rglob(pattern):
                if not self._is_test_file(ts_file):
                    file_info = self.file_cache.get_file_info(ts_file)
                    files.append(file_info)
        
        return files
    
    def _is_test_file(self, file_path: Path) -> bool:
        """Check if file is a test file."""
        name = file_path.name
        return ".test." in name or ".spec." in name or "/__tests__/" in str(file_path)
    
    def _run_complexity_checks(self, results: CheckResults) -> None:
        """Run complexity-based checks."""
        # Check complexity requirements for all directories
        errors = self.complexity_checker.check_complexity_requirements()
        for error in errors:
            results.add_error(error)
        
        # Check subsystem completeness
        errors = self.complexity_checker.check_subsystem_completeness(self.subsystems)
        for error in errors:
            results.add_error(error)
    
    def _run_subsystem_checks(self, results: CheckResults) -> None:
        """Run subsystem-related checks."""
        # Check subsystem declarations
        errors = self.subsystem_checker.check_subsystem_declarations(self.subsystems)
        for error in errors:
            results.add_error(error)
        
        # Check dependencies.json format
        errors = self.subsystem_checker.check_dependencies_json_format(self.subsystems)
        for error in errors:
            results.add_error(error)
        
        # Check for redundancy
        errors = self.subsystem_checker.check_hierarchical_redundancy(self.subsystems)
        for error in errors:
            results.add_error(error)
        
        errors = self.subsystem_checker.check_redundant_dependencies(self.subsystems)
        for error in errors:
            results.add_error(error)
        
        # Check file/folder conflicts
        errors = self.subsystem_checker.check_file_folder_conflicts()
        for error in errors:
            results.add_error(error)
    
    def _run_import_checks(self, results: CheckResults) -> None:
        """Run import-related checks."""
        # Check import boundaries
        errors = self.import_checker.check_import_boundaries(self.subsystems)
        for error in errors:
            results.add_error(error)
        
        # Check reexport boundaries
        errors = self.import_checker.check_reexport_boundaries(self.subsystems)
        for error in errors:
            results.add_error(error)
        
        # Check outbound dependencies
        errors = self.import_checker.check_outbound_dependencies_parallel(self.subsystems)
        for error in errors:
            results.add_error(error)
    
    def _run_domain_checks(self, results: CheckResults) -> None:
        """Run domain-specific checks."""
        # Check domain structure
        errors = self.domain_checker.check_domain_structure()
        for error in errors:
            results.add_error(error)
        
        # Check domain import restrictions
        errors = self.domain_checker.check_domain_import_restrictions()
        for error in errors:
            results.add_error(error)