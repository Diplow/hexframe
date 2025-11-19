#!/usr/bin/env python3
"""
Subsystem structure and declaration rules.

Handles checking subsystem declarations, file/folder conflicts, and dependency format.
"""

import re
from pathlib import Path
from typing import List, Set

from ..models import ArchError, ErrorType, RecommendationType, SubsystemInfo
from ..utils.file_utils import find_typescript_files
from ..utils.path_utils import PathHelper
from ..utils.import_utils import find_redundant_ancestor_declarations


class SubsystemRuleChecker:
    """Checker for subsystem structure and declarations."""
    
    def __init__(self, path_helper: PathHelper, file_cache):
        self.path_helper = path_helper
        self.file_cache = file_cache
    
    def check_subsystem_declarations(self, subsystems: List[SubsystemInfo]) -> List[ArchError]:
        """Check that subsystems are declared in parent dependencies.json."""
        errors = []
        # print("Checking subsystem declarations...")

        for subsystem in subsystems:
            parent_dir = subsystem.parent_path

            # Skip if parent is target path itself
            if (parent_dir == self.path_helper.target_path or
                parent_dir == Path(".")):
                continue

            parent_deps_file = parent_dir / "dependencies.json"
            if parent_deps_file.exists():
                parent_deps = self.file_cache.load_dependencies_json(parent_deps_file)
                subsystems_array = parent_deps.get("subsystems", [])

                relative_path = f"./{subsystem.name}"
                if relative_path not in subsystems_array:
                    error = ArchError.create_error(
                        message=(f"❌ Subsystem {subsystem.path} not declared in {parent_deps_file}\n"
                               f"   → Add \"{relative_path}\" to the \"subsystems\" array"),
                        error_type=ErrorType.SUBSYSTEM_STRUCTURE,
                        subsystem=str(subsystem.path),
                        recommendation=f"Add \"{relative_path}\" to the \"subsystems\" array in {parent_deps_file}",
                        recommendation_type=RecommendationType.ADD_ALLOWED_CHILDREN
                    )
                    errors.append(error)

        return errors

    def check_declared_subsystems_exist(self, subsystems: List[SubsystemInfo]) -> List[ArchError]:
        """Check that declared subsystems actually have dependencies.json files."""
        errors = []
        # print("Checking declared subsystems exist...")

        for subsystem in subsystems:
            deps = subsystem.dependencies
            declared_subsystems = deps.get("subsystems", [])

            for declared_subsystem in declared_subsystems:
                # Convert relative path to absolute
                if declared_subsystem.startswith("./"):
                    subsystem_name = declared_subsystem[2:]  # Remove "./"
                    subsystem_path = subsystem.path / subsystem_name
                    deps_file = subsystem_path / "dependencies.json"

                    if not deps_file.exists():
                        # Check if directory exists at all
                        if subsystem_path.exists():
                            recommendation = (
                                f"Create {deps_file.relative_to(Path('src'))} to formalize this subsystem, "
                                f"or remove '{declared_subsystem}' from {subsystem.path}/dependencies.json 'subsystems' array if it's not a subsystem"
                            )
                        else:
                            recommendation = (
                                f"Remove '{declared_subsystem}' from {subsystem.path}/dependencies.json 'subsystems' array "
                                f"(directory does not exist)"
                            )

                        error = ArchError.create_error(
                            message=(f"❌ Declared subsystem missing dependencies.json:\n"
                                   f"  🔸 {subsystem.name} declares '{declared_subsystem}' as a subsystem\n"
                                   f"  🔸 But {deps_file.relative_to(Path('src'))} does not exist\n"
                                   f"     → Either create the dependencies.json file\n"
                                   f"     → Or remove '{declared_subsystem}' from subsystems array"),
                            error_type=ErrorType.SUBSYSTEM_STRUCTURE,
                            subsystem=str(subsystem.path),
                            recommendation=recommendation,
                            recommendation_type=RecommendationType.CREATE_OR_REMOVE_SUBSYSTEM if subsystem_path.exists() else RecommendationType.REMOVE_INVALID_SUBSYSTEM
                        )
                        errors.append(error)

        return errors
    
    def check_dependencies_json_format(self, subsystems: List[SubsystemInfo]) -> List[ArchError]:
        """Check that dependencies.json files use absolute paths."""
        errors = []
        # print("Checking dependencies.json path format...")
        
        for subsystem in subsystems:
            deps_file = subsystem.path / "dependencies.json"
            deps = subsystem.dependencies
            
            # Check allowed array for relative paths
            allowed = deps.get("allowed", [])
            for dep in allowed:
                if self._is_invalid_relative_path(dep):
                    error = ArchError.create_error(
                        message=(f"❌ Relative path in {deps_file}: '{dep}'\n"
                               f"   → Use absolute paths with ~/ prefix instead"),
                        error_type=ErrorType.DEPENDENCY_FORMAT,
                        subsystem=str(subsystem.path),
                        recommendation=f"Change relative path '{dep}' to absolute path with ~/ prefix in {deps_file}",
                        recommendation_type=RecommendationType.FIX_DEPENDENCY_PATH_FORMAT
                    )
                    errors.append(error)

            # Check allowedChildren array for relative paths
            allowed_children = deps.get("allowedChildren", [])
            for dep in allowed_children:
                if self._is_invalid_relative_path(dep):
                    error = ArchError.create_error(
                        message=(f"❌ Relative path in {deps_file}: '{dep}'\n"
                               f"   → Use absolute paths with ~/ prefix instead (except for subsystems)"),
                        error_type=ErrorType.DEPENDENCY_FORMAT,
                        subsystem=str(subsystem.path),
                        recommendation=f"Change relative path '{dep}' to absolute path with ~/ prefix in {deps_file}",
                        recommendation_type=RecommendationType.FIX_DEPENDENCY_PATH_FORMAT
                    )
                    errors.append(error)
        
        return errors
    
    def check_hierarchical_redundancy(self, subsystems: List[SubsystemInfo]) -> List[ArchError]:
        """Check for hierarchical redundancy within the same dependencies.json."""
        errors = []
        
        for subsystem in subsystems:
            deps = subsystem.dependencies
            
            # Check allowed array for hierarchical redundancy
            allowed = deps.get("allowed", [])
            if allowed:
                errors.extend(self._check_hierarchical_redundancy_in_list(
                    subsystem, allowed, "allowed"))
            
            # Check allowedChildren array for hierarchical redundancy  
            allowed_children = deps.get("allowedChildren", [])
            if allowed_children:
                errors.extend(self._check_hierarchical_redundancy_in_list(
                    subsystem, allowed_children, "allowedChildren"))
        
        return errors
    
    def check_redundant_dependencies(self, subsystems: List[SubsystemInfo]) -> List[ArchError]:
        """Check for redundant dependency declarations."""
        errors = []
        # print("Checking for redundant dependency declarations...")
        
        for subsystem in subsystems:
            parent_dir = subsystem.parent_path
            if not parent_dir or parent_dir == self.path_helper.target_path:
                continue
            
            parent_deps_file = parent_dir / "dependencies.json"
            if not parent_deps_file.exists():
                continue
            
            parent_deps = self.file_cache.load_dependencies_json(parent_deps_file)
            parent_allowed_children = parent_deps.get("allowedChildren", [])
            
            if not parent_allowed_children:
                continue
            
            # Check child's allowed array for redundancy
            child_allowed = subsystem.dependencies.get("allowed", [])
            for dep in child_allowed:
                if dep in parent_allowed_children:
                    error = ArchError.create_error(
                        message=(f"❌ Redundant dependency in {subsystem.name}:\n"
                               f"  🔸 '{dep}' is already provided by parent allowedChildren\n"
                               f"     → Remove from {subsystem.path}/dependencies.json 'allowed' array\n"
                               f"     → Parent allowedChildren automatically cascades to children"),
                        error_type=ErrorType.REDUNDANCY,
                        subsystem=str(subsystem.path),
                        recommendation=f"Remove '{dep}' from {subsystem.path}/dependencies.json 'allowed' array (redundant with parent)",
                        recommendation_type=RecommendationType.REMOVE_REDUNDANT_DEPENDENCY
                    )
                    errors.append(error)
            
            # Check child's allowedChildren array for redundancy
            child_allowed_children = subsystem.dependencies.get("allowedChildren", [])
            for dep in child_allowed_children:
                if dep in parent_allowed_children:
                    error = ArchError.create_error(
                        message=(f"❌ Redundant allowedChildren in {subsystem.name}:\n"
                               f"  🔸 '{dep}' is already provided by parent allowedChildren\n"
                               f"     → Remove from {subsystem.path}/dependencies.json 'allowedChildren' array"),
                        error_type=ErrorType.REDUNDANCY,
                        subsystem=str(subsystem.path),
                        recommendation=f"Remove '{dep}' from {subsystem.path}/dependencies.json 'allowedChildren' array (redundant with parent)",
                        recommendation_type=RecommendationType.REMOVE_REDUNDANT_DEPENDENCY
                    )
                    errors.append(error)
        
        return errors
    
    def check_ancestor_redundancy(self, subsystems: List[SubsystemInfo]) -> List[ArchError]:
        """Check for explicitly declared ancestors that should be auto-inherited."""
        errors = []
        
        for subsystem in subsystems:
            redundant_ancestors = find_redundant_ancestor_declarations(subsystem, self.file_cache)
            
            for ancestor_path in redundant_ancestors:
                error = ArchError.create_error(
                    message=(f"❌ Redundant ancestor declaration in {subsystem.name}:\n"
                           f"  🔸 '{ancestor_path}' is automatically inherited from parent subsystem\n"
                           f"     → Remove '{ancestor_path}' from {subsystem.path}/dependencies.json 'allowed' array\n"
                           f"     → Child subsystems automatically inherit access to ancestor subsystems"),
                    error_type=ErrorType.REDUNDANCY,
                    subsystem=str(subsystem.path),
                    recommendation=f"Remove '{ancestor_path}' from {subsystem.path}/dependencies.json 'allowed' array (automatically inherited)",
                    recommendation_type=RecommendationType.REMOVE_REDUNDANT_DEPENDENCY
                )
                errors.append(error)
        
        return errors
    
    def check_domain_utils_redundancy(self, subsystems: List[SubsystemInfo]) -> List[ArchError]:
        """Check for explicitly declared domain utils that should be implicitly allowed."""
        errors = []
        
        for subsystem in subsystems:
            allowed_deps = subsystem.dependencies.get("allowed", [])
            
            for dep in allowed_deps:
                # Check if it's a domain utils import that's explicitly declared
                import re
                utils_pattern = r"~/lib/domains/[^/]+/utils(?:/.*)?$"
                if re.match(utils_pattern, dep):
                    error = ArchError.create_error(
                        message=(f"❌ Redundant domain utils declaration in {subsystem.name}:\n"
                               f"  🔸 '{dep}' is implicitly allowed for all subsystems\n"
                               f"     → Remove '{dep}' from {subsystem.path}/dependencies.json 'allowed' array\n"
                               f"     → Domain utils are automatically accessible without explicit permission"),
                        error_type=ErrorType.REDUNDANCY,
                        subsystem=str(subsystem.path),
                        recommendation=f"Remove '{dep}' from {subsystem.path}/dependencies.json 'allowed' array (domain utils are implicitly allowed)",
                        recommendation_type=RecommendationType.REMOVE_REDUNDANT_DEPENDENCY
                    )
                    errors.append(error)
        
        return errors
    
    def check_nonexistent_dependencies(self, subsystems: List[SubsystemInfo]) -> List[ArchError]:
        """Check for dependencies pointing to non-existent folders."""
        errors = []
        
        for subsystem in subsystems:
            deps = subsystem.dependencies
            
            # Check allowed array for non-existent paths
            allowed = deps.get("allowed", [])
            for dep in allowed:
                if self._is_filesystem_dependency(dep):
                    resolved_path = self._resolve_dependency_path(dep)
                    if resolved_path and not self._path_exists(resolved_path):
                        error = ArchError.create_error(
                            message=(f"❌ Non-existent dependency in {subsystem.name}:\n"
                                   f"  🔸 '{dep}' points to non-existent path: {resolved_path}\n"
                                   f"     → Remove '{dep}' from {subsystem.path}/dependencies.json 'allowed' array\n"
                                   f"     → Or create the missing directory/file"),
                            error_type=ErrorType.NONEXISTENT_DEPENDENCY,
                            subsystem=str(subsystem.path),
                            recommendation=f"Remove '{dep}' from {subsystem.path}/dependencies.json 'allowed' array (path does not exist)",
                            recommendation_type=RecommendationType.REMOVE_FORBIDDEN_DEPENDENCY
                        )
                        errors.append(error)
            
            # Check allowedChildren array for non-existent paths
            allowed_children = deps.get("allowedChildren", [])
            for dep in allowed_children:
                if self._is_filesystem_dependency(dep):
                    resolved_path = self._resolve_dependency_path(dep)
                    if resolved_path and not self._path_exists(resolved_path):
                        error = ArchError.create_error(
                            message=(f"❌ Non-existent allowedChildren in {subsystem.name}:\n"
                                   f"  🔸 '{dep}' points to non-existent path: {resolved_path}\n"
                                   f"     → Remove '{dep}' from {subsystem.path}/dependencies.json 'allowedChildren' array\n"
                                   f"     → Or create the missing directory/file"),
                            error_type=ErrorType.NONEXISTENT_DEPENDENCY,
                            subsystem=str(subsystem.path),
                            recommendation=f"Remove '{dep}' from {subsystem.path}/dependencies.json 'allowedChildren' array (path does not exist)",
                            recommendation_type=RecommendationType.REMOVE_FORBIDDEN_DEPENDENCY
                        )
                        errors.append(error)
        
        return errors
    
    def check_file_folder_conflicts(self) -> List[ArchError]:
        """Check for file/folder naming conflicts."""
        errors = []
        # print("Checking for file/folder naming conflicts...")
        
        typescript_files = find_typescript_files(self.path_helper.target_path)
        
        for ts_file in typescript_files:
            stem = ts_file.stem
            if stem == "index":
                continue  # Skip index files
            
            # Check if there's a folder with same name
            potential_folder = ts_file.parent / stem
            if potential_folder.is_dir():
                error = ArchError.create_error(
                    message=(f"❌ File/folder naming conflict:\n"
                           f"  🔸 File: {ts_file.relative_to(self.path_helper.target_path)}\n"
                           f"  🔸 Folder: {potential_folder.relative_to(self.path_helper.target_path)}/\n"
                           f"     → Move file contents to {potential_folder.relative_to(self.path_helper.target_path)}/index.ts"),
                    error_type=ErrorType.FILE_CONFLICT,
                    file_path=str(ts_file.relative_to(self.path_helper.target_path)),
                    recommendation=f"Move {ts_file.relative_to(self.path_helper.target_path)} contents to {potential_folder.relative_to(self.path_helper.target_path)}/index.ts",
                    recommendation_type=RecommendationType.RESOLVE_FILE_FOLDER_CONFLICT
                )
                errors.append(error)
        
        return errors
    
    def _is_invalid_relative_path(self, dep: str) -> bool:
        """Check if dependency path is an invalid relative path."""
        return dep.startswith("../") or (dep.startswith("./") and "subsystem" not in dep)
    
    def _check_hierarchical_redundancy_in_list(self, subsystem: SubsystemInfo, 
                                             dep_list: list, list_name: str) -> List[ArchError]:
        """Check for hierarchical redundancy within a single dependency list."""
        errors = []
        
        for i, dep in enumerate(dep_list):
            for j, other_dep in enumerate(dep_list):
                if i != j and dep != other_dep:
                    # Check if dep is made redundant by other_dep (other_dep is broader)
                    if dep.startswith(f"{other_dep}/"):
                        # BUT only flag as redundant if the child path is NOT a subsystem
                        potential_subsystem_path = self._get_potential_subsystem_path(
                            other_dep, dep)
                        
                        # If child path is NOT a subsystem (no dependencies.json), it's truly redundant
                        if (potential_subsystem_path and 
                            not (potential_subsystem_path / "dependencies.json").exists()):
                            error = ArchError.create_error(
                                message=(f"❌ Hierarchical redundancy in {subsystem.name}:\n"
                                       f"  🔸 '{dep}' is redundant because '{other_dep}' already allows access\n"
                                       f"     → Remove '{dep}' from {subsystem.path}/dependencies.json '{list_name}' array\n"
                                       f"     → '{other_dep}' already provides hierarchical access"),
                                error_type=ErrorType.REDUNDANCY,
                                subsystem=str(subsystem.path),
                                recommendation=f"Remove '{dep}' from {subsystem.path}/dependencies.json '{list_name}' array (redundant with '{other_dep}')",
                                recommendation_type=RecommendationType.REMOVE_REDUNDANT_DEPENDENCY
                            )
                            errors.append(error)
                        # If child path IS a subsystem, it's NOT redundant - subsystems need explicit access
        
        return errors
    
    def _get_potential_subsystem_path(self, other_dep: str, dep: str) -> Path:
        """Get potential subsystem path for redundancy checking."""
        if other_dep.startswith("~/"):
            base_path = Path("src") / other_dep[2:]
            child_suffix = dep[len(other_dep) + 1:]  # +1 to skip the "/"
            return base_path / child_suffix
        else:
            return Path(other_dep) / dep[len(other_dep) + 1:]
    
    def _is_filesystem_dependency(self, dep: str) -> bool:
        """Check if dependency is a filesystem path (not an npm package)."""
        # Filesystem dependencies start with ~/ or are relative paths
        # npm packages don't start with these patterns
        return dep.startswith("~/") or dep.startswith("./") or dep.startswith("../")
    
    def _resolve_dependency_path(self, dep: str) -> Path:
        """Resolve dependency path to actual filesystem path."""
        if dep.startswith("~/"):
            # ~/ means src/ in our context
            return Path("src") / dep[2:]
        elif dep.startswith("./"):
            # Relative to current directory (should be rare)
            return Path(dep)
        elif dep.startswith("../"):
            # Relative parent (should be rare)
            return Path(dep)
        else:
            # Shouldn't reach here for filesystem dependencies
            return None
    
    def _path_exists(self, path: Path) -> bool:
        """Check if path exists as directory or as file with common extensions."""
        if path.exists():
            return True
        
        # If directory doesn't exist, check for files with common TypeScript/JavaScript extensions
        possible_files = []
        
        # Only add extensions if the path doesn't already have a recognized extension
        has_extension = any(str(path).endswith(ext) for ext in ['.ts', '.tsx', '.js', '.jsx', '.service'])
        
        if not has_extension:
            possible_files.extend([
                path.with_suffix('.ts'),
                path.with_suffix('.tsx'), 
                path.with_suffix('.js'),
                path.with_suffix('.jsx')
            ])
        else:
            # For paths that already have extensions like .service, try adding .ts
            possible_files.extend([
                Path(str(path) + '.ts'),
                Path(str(path) + '.tsx'),
                Path(str(path) + '.js'),
                Path(str(path) + '.jsx')
            ])
        
        # Always check for index files in the directory
        possible_files.extend([
            path / 'index.ts',
            path / 'index.tsx',
            path / 'index.js',
            path / 'index.jsx'
        ])
        
        return any(file_path.exists() for file_path in possible_files)