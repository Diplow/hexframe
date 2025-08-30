#!/usr/bin/env python3
"""
Architecture Boundary Check - Python Implementation

A faster, more maintainable version of the bash architecture check script.
Provides 3-5x performance improvement through single-pass traversal and caching.

Usage:
    python3 scripts/check-architecture.py [path]
    pnpm check:architecture [path]
"""

import os
import re
import json
import sys
import time
from pathlib import Path
from typing import Dict, List, Set, Optional, Tuple, NamedTuple
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict


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


class ArchError:
    """Represents an architectural error with severity."""
    def __init__(self, message: str, is_warning: bool = False):
        self.message = message
        self.is_warning = is_warning


class ArchitectureChecker:
    """Fast architecture boundary checker with caching and parallelization."""
    
    def __init__(self, target_path: str = "src"):
        self.target_path = Path(target_path)
        self.complexity_threshold = 1000
        self.doc_threshold = 500
        
        # Caches for performance
        self.file_cache: Dict[Path, FileInfo] = {}
        self.subsystem_cache: Dict[Path, SubsystemInfo] = {}
        self.dependency_cache: Dict[Path, Dict] = {}
        self.exceptions: Set[str] = set()
        
        # Results
        self.errors: List[ArchError] = []
        self.warnings: List[ArchError] = []
        
        self._load_exceptions()
    
    def _load_exceptions(self) -> None:
        """Load architecture exceptions from .architecture-ignore file."""
        ignore_file = Path(".architecture-ignore")
        if ignore_file.exists():
            with open(ignore_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        self.exceptions.add(line)
        else:
            self.exceptions.add("src/components")
    
    def _is_exception(self, path: Path) -> bool:
        """Check if path matches any exception pattern."""
        path_str = str(path)
        return any(path_str.startswith(exc) for exc in self.exceptions)
    
    def _is_domain_path(self, path: Path) -> bool:
        """Check if path is in a domain."""
        return str(path).startswith("src/lib/domains/")
    
    def _count_ts_lines(self, directory: Path) -> int:
        """Count TypeScript lines in directory, respecting subsystem boundaries."""
        if not directory.exists():
            return 0
            
        total = 0
        
        # Count direct files in this directory
        for file in directory.glob("*.ts"):
            if not self._is_test_file(file):
                total += self._get_file_lines(file)
        
        for file in directory.glob("*.tsx"):
            if not self._is_test_file(file):
                total += self._get_file_lines(file)
        
        # Count subdirectories if they're not subsystems
        for subdir in directory.iterdir():
            if subdir.is_dir():
                deps_file = subdir / "dependencies.json"
                if not deps_file.exists():
                    # Not a subsystem, count recursively
                    total += self._count_ts_lines(subdir)
        
        return total
    
    def _is_test_file(self, file: Path) -> bool:
        """Check if file is a test file."""
        name = file.name
        return ".test." in name or ".spec." in name or "/__tests__/" in str(file)
    
    def _get_file_lines(self, file: Path) -> int:
        """Get line count for a file."""
        try:
            with open(file, 'r', encoding='utf-8') as f:
                return sum(1 for _ in f)
        except (UnicodeDecodeError, OSError):
            return 0
    
    def _get_file_content(self, file: Path) -> str:
        """Get file content with caching."""
        if file in self.file_cache:
            return self.file_cache[file].content
        
        try:
            with open(file, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # Cache file info
                file_info = FileInfo(
                    path=file,
                    lines=content.count('\n') + 1,
                    content=content,
                    imports=self._extract_imports(content)
                )
                self.file_cache[file] = file_info
                return content
        except (UnicodeDecodeError, OSError):
            return ""
    
    def _extract_imports(self, content: str) -> List[str]:
        """Extract import paths from TypeScript content."""
        import_pattern = r'from\s+["\']([^"\']+)["\']'
        return re.findall(import_pattern, content)
    
    def _load_dependencies_json(self, deps_file: Path) -> Dict:
        """Load dependencies.json with caching."""
        if deps_file in self.dependency_cache:
            return self.dependency_cache[deps_file]
        
        try:
            with open(deps_file) as f:
                deps = json.load(f)
                self.dependency_cache[deps_file] = deps
                return deps
        except (json.JSONDecodeError, OSError):
            return {}
    
    def _find_all_subsystems(self) -> List[SubsystemInfo]:
        """Find all subsystems in target path."""
        subsystems = []
        
        for deps_file in self.target_path.rglob("dependencies.json"):
            if "node_modules" in str(deps_file):
                continue
                
            subsystem_dir = deps_file.parent
            if subsystem_dir in self.subsystem_cache:
                subsystems.append(self.subsystem_cache[subsystem_dir])
                continue
            
            # Load subsystem info
            dependencies = self._load_dependencies_json(deps_file)
            
            # Find all TypeScript files in subsystem
            files = []
            for ts_file in subsystem_dir.rglob("*.ts"):
                if not self._is_test_file(ts_file):
                    self._get_file_content(ts_file)  # Cache file info
                    files.append(self.file_cache[ts_file])
            
            for ts_file in subsystem_dir.rglob("*.tsx"):
                if not self._is_test_file(ts_file):
                    self._get_file_content(ts_file)  # Cache file info
                    files.append(self.file_cache[ts_file])
            
            total_lines = sum(f.lines for f in files)
            
            subsystem = SubsystemInfo(
                path=subsystem_dir,
                name=subsystem_dir.name,
                dependencies=dependencies,
                files=files,
                total_lines=total_lines,
                parent_path=subsystem_dir.parent
            )
            
            self.subsystem_cache[subsystem_dir] = subsystem
            subsystems.append(subsystem)
        
        return subsystems
    
    def _check_complexity_requirements(self) -> None:
        """Check directories for complexity-based documentation requirements."""
        print("Scanning directories for complexity requirements...")
        
        for directory in self.target_path.rglob("*"):
            if not directory.is_dir():
                continue
                
            if self._is_exception(directory):
                continue
            
            # Skip if parent is already a subsystem
            parent = directory.parent
            if parent != directory and (parent / "dependencies.json").exists():
                continue
            
            lines = self._count_ts_lines(directory)
            
            if lines > self.complexity_threshold:
                # Complex folder needs full subsystem structure
                missing = []
                if not (directory / "dependencies.json").exists():
                    missing.append("dependencies.json")
                if not (directory / "README.md").exists():
                    missing.append("README.md")
                if not (directory / "ARCHITECTURE.md").exists():
                    missing.append("ARCHITECTURE.md")
                
                if missing:
                    self.errors.append(ArchError(
                        f"❌ {directory} ({lines} lines) missing: {' '.join(missing)}"
                    ))
            
            elif lines > self.doc_threshold:
                # Medium complexity needs README
                if not (directory / "README.md").exists():
                    self.warnings.append(ArchError(
                        f"⚠️  {directory} ({lines} lines) - missing README.md",
                        is_warning=True
                    ))
    
    def _check_subsystem_completeness(self, subsystems: List[SubsystemInfo]) -> None:
        """Check that subsystems have all required files."""
        print("Checking subsystems for completeness...")
        
        for subsystem in subsystems:
            # Only require documentation for complex subsystems (over threshold)
            if subsystem.total_lines <= self.complexity_threshold:
                continue
                
            missing = []
            
            if not (subsystem.path / "README.md").exists():
                missing.append("README.md")
            if not (subsystem.path / "ARCHITECTURE.md").exists():
                missing.append("ARCHITECTURE.md")
            
            if missing:
                self.errors.append(ArchError(
                    f"❌ Subsystem {subsystem.path} ({subsystem.total_lines} lines) missing: {' '.join(missing)}"
                ))
    
    def _check_subsystem_declarations(self, subsystems: List[SubsystemInfo]) -> None:
        """Check that subsystems are declared in parent dependencies.json."""
        print("Checking subsystem declarations...")
        
        for subsystem in subsystems:
            parent_dir = subsystem.parent_path
            
            # Skip if parent is target path itself
            if parent_dir == self.target_path or parent_dir == Path("."):
                continue
            
            parent_deps_file = parent_dir / "dependencies.json"
            if parent_deps_file.exists():
                parent_deps = self._load_dependencies_json(parent_deps_file)
                subsystems_array = parent_deps.get("subsystems", [])
                
                relative_path = f"./{subsystem.name}"
                if relative_path not in subsystems_array:
                    self.errors.append(ArchError(
                        f"❌ Subsystem {subsystem.path} not declared in {parent_deps_file}\n"
                        f"   → Add \"{relative_path}\" to the \"subsystems\" array"
                    ))
    
    def _check_import_boundaries(self, subsystems: List[SubsystemInfo]) -> None:
        """Check that external imports go through subsystem index files."""
        print("Checking import boundaries...")
        
        for subsystem in subsystems:
            violations = []
            
            # We want to find EXTERNAL files that import directly into this subsystem
            for ts_file in self.target_path.rglob("*.ts"):
                if self._is_test_file(ts_file):
                    continue
                
                # Skip index.ts files - they're allowed to import from their children
                if ts_file.name == "index.ts":
                    continue
                
                file_str = str(ts_file)
                
                # Skip if file IS within this subsystem (internal files, not external importers)
                if str(subsystem.path) in file_str:
                    continue
                
                # Skip if file is in a child subsystem (children can import parent freely)  
                if self._is_child_of_subsystem(ts_file, subsystem):
                    continue
                
                # Now check if this external file imports into the subsystem
                content = self._get_file_content(ts_file)
                if not content:
                    continue
                
                # Find imports that bypass index.ts
                # Use full subsystem path for precise matching
                subsystem_abs_path = f"~/{subsystem.path.relative_to(Path('src'))}"
                import_pattern = rf'from\s+["\']{re.escape(subsystem_abs_path)}/([^"\']*)["\']'
                matches = re.finditer(import_pattern, content, re.MULTILINE)
                
                for match in matches:
                    import_path = match.group(1)
                    # Skip if importing from index or root
                    if not import_path or import_path == "index":
                        continue
                    
                    # Check if importing file has permission through its own inheritance chain
                    full_import_path = f"{subsystem_abs_path}/{import_path}"
                    if self._file_has_import_permission(ts_file, full_import_path):
                        continue
                    
                    line_num = content[:match.start()].count('\n') + 1
                    violations.append({
                        'file': ts_file,
                        'line': line_num,
                        'import': match.group(0)
                    })
            
            if violations:
                self.errors.append(ArchError(
                    f"❌ External imports bypass {subsystem.name}/index:"
                ))
                for v in violations:
                    self.errors.append(ArchError(
                        f"  🔸 {v['file']}:{v['line']}\n     {v['import']}"
                    ))
    
    def _check_reexport_boundaries(self, subsystems: List[SubsystemInfo]) -> None:
        """Check that index.ts files only reexport from child subsystems or internal files."""
        print("Checking reexport boundaries...")
        
        for subsystem in subsystems:
            index_file = subsystem.path / "index.ts"
            if not index_file.exists():
                continue
                
            content = self._get_file_content(index_file)
            if not content:
                continue
            
            # Find all reexport statements (export { ... } from '...')
            reexport_pattern = r'export\s+\{[^}]*\}\s+from\s+["\']([^"\']+)["\']'
            reexport_type_pattern = r'export\s+type\s+\{[^}]*\}\s+from\s+["\']([^"\']+)["\']'
            
            violations = []
            
            for pattern in [reexport_pattern, reexport_type_pattern]:
                matches = re.finditer(pattern, content, re.MULTILINE)
                
                for match in matches:
                    import_path = match.group(1)
                    line_num = content[:match.start()].count('\n') + 1
                    
                    # STRICT RULE: Only allow reexports from child subsystems or internal files
                    if import_path.startswith('./'):
                        # This is a child reference - check if it's a declared child subsystem or internal file
                        child_name = import_path[2:]  # Remove './'
                        child_subsystems = subsystem.dependencies.get("subsystems", [])
                        
                        if f"./{child_name}" in child_subsystems:
                            continue  # Valid child subsystem reexport
                        else:
                            # Check if it's a file within the current subsystem
                            potential_file = subsystem.path / f"{child_name}.ts"
                            potential_tsx_file = subsystem.path / f"{child_name}.tsx"
                            # Also check for directories with index files
                            potential_dir_index = subsystem.path / child_name / "index.ts"
                            potential_dir_index_tsx = subsystem.path / child_name / "index.tsx"
                            
                            if (potential_file.exists() or potential_tsx_file.exists() or 
                                potential_dir_index.exists() or potential_dir_index_tsx.exists()):
                                continue  # Valid internal file reexport
                    
                    elif import_path.startswith('../'):
                        # STRICT: No reexports from siblings or parents
                        violations.append({
                            'line': line_num,
                            'import': import_path,
                            'full_statement': match.group(0),
                            'reason': 'reexport from external subsystem violates encapsulation'
                        })
                    
                    elif import_path.startswith('~/'):
                        # Check if this is an internal absolute path within the same subsystem
                        subsystem_abs_path = f"~/{subsystem.path.relative_to(Path('src'))}"
                        
                        if import_path.startswith(f"{subsystem_abs_path}/"):
                            # This is an internal absolute path reexport - allowed
                            continue
                        else:
                            # This is an external absolute path reexport - not allowed
                            violations.append({
                                'line': line_num,
                                'import': import_path,
                                'full_statement': match.group(0),
                                'reason': 'reexport from external subsystem violates encapsulation'
                            })
                    
                    else:
                        # Check for external library imports (node_modules, etc.) - these are allowed
                        if not import_path.startswith('.') and not import_path.startswith('~'):
                            continue  # External library reexport is allowed
                        
                        # Any other pattern is invalid
                        violations.append({
                            'line': line_num,
                            'import': import_path,
                            'full_statement': match.group(0),
                            'reason': 'invalid reexport pattern'
                        })
            
            if violations:
                self.errors.append(ArchError(
                    f"❌ Invalid reexports in {subsystem.name}/index.ts:"
                ))
                for v in violations:
                    self.errors.append(ArchError(
                        f"  🔸 Line {v['line']}: {v['full_statement']}\n"
                        f"     → {v['reason']}\n"
                        f"     → Reexports should only expose child subsystems or internal files\n"
                        f"     → External dependencies should be imported directly where needed"
                    ))
    
    def _check_dependencies_json_format(self, subsystems: List[SubsystemInfo]) -> None:
        """Check that dependencies.json files use absolute paths."""
        print("Checking dependencies.json path format...")
        
        for subsystem in subsystems:
            deps_file = subsystem.path / "dependencies.json"
            deps = subsystem.dependencies
            
            # Check allowed array for relative paths
            allowed = deps.get("allowed", [])
            for dep in allowed:
                if dep.startswith("../") or (dep.startswith("./") and "subsystem" not in dep):
                    self.errors.append(ArchError(
                        f"❌ Relative path in {deps_file}: '{dep}'\n"
                        f"   → Use absolute paths with ~/ prefix instead"
                    ))
            
            # Check allowedChildren array for relative paths  
            allowed_children = deps.get("allowedChildren", [])
            for dep in allowed_children:
                if dep.startswith("../") or (dep.startswith("./") and "subsystem" not in dep):
                    self.errors.append(ArchError(
                        f"❌ Relative path in {deps_file}: '{dep}'\n"
                        f"   → Use absolute paths with ~/ prefix instead (except for subsystems)"
                    ))
    
    def _resolve_inheritance_chain(self, subsystem: SubsystemInfo) -> List[str]:
        """Resolve full inheritance chain of allowedChildren from ancestors."""
        inherited = []
        current_dir = subsystem.path.parent
        
        # Walk up the directory tree to find all parents with dependencies.json
        # Stop at src/ directory level, not at target_path.parent
        src_dir = Path("src")
        while current_dir and current_dir != src_dir and current_dir != Path(".") and current_dir != Path("/"):
            deps_file = current_dir / "dependencies.json"
            
            if deps_file.exists():
                deps = self._load_dependencies_json(deps_file)
                allowed_children = deps.get("allowedChildren", [])
                inherited.extend(allowed_children)
            
            parent = current_dir.parent
            if parent == current_dir:  # Reached root
                break
            current_dir = parent
        
        return inherited
    
    def _is_child_of_subsystem(self, file_path: Path, parent_subsystem: SubsystemInfo) -> bool:
        """Check if a file is in a child subsystem of the given parent."""
        # Find all child subsystems of parent
        for child_subsystem in self.subsystem_cache.values():
            if child_subsystem.parent_path == parent_subsystem.path:
                if str(child_subsystem.path) in str(file_path):
                    return True
        return False
    
    def _file_has_import_permission(self, file_path: Path, import_path: str) -> bool:
        """Check if a file has permission to import from the given path through inheritance."""
        # Find which subsystem this file belongs to
        file_subsystem = None
        for subsystem in self.subsystem_cache.values():
            if str(subsystem.path) in str(file_path):
                # Choose the most specific subsystem (deepest path)
                if file_subsystem is None or len(str(subsystem.path)) > len(str(file_subsystem.path)):
                    file_subsystem = subsystem
        
        if not file_subsystem:
            return False
        
        # Get all allowed dependencies for this file's subsystem (local + inherited)
        allowed_deps = set(file_subsystem.dependencies.get("allowed", []))
        allowed_children = set(file_subsystem.dependencies.get("allowedChildren", []))
        inherited = set(self._resolve_inheritance_chain(file_subsystem))
        all_allowed = allowed_deps | allowed_children | inherited
        
        # Check if import is allowed using the same logic as outbound dependency checking
        return self._is_import_allowed_by_set(import_path, all_allowed, file_subsystem.path)
    
    def _is_import_allowed_by_set(self, import_path: str, allowed_set: Set[str], subsystem_path: Path) -> bool:
        """Check if import is allowed by a set of allowed dependencies with proper hierarchical logic."""
        # Convert subsystem_path to absolute path format for internal import checking
        subsystem_abs_path = f"~/{subsystem_path.relative_to(Path('src'))}"
        
        # Allow internal imports within the same subsystem
        if import_path.startswith(f"{subsystem_abs_path}/") or import_path == subsystem_abs_path:
            return True
        
        # Check direct matches and hierarchical matches
        for allowed_dep in allowed_set:
            if not allowed_dep:
                continue
                
            # Direct match
            if import_path == allowed_dep:
                return True
            
            # Hierarchical match: if ~/lib/utils is allowed, allow ~/lib/utils/something
            # Also handle patterns ending with / (like ~/components/ui/)
            allowed_dep_normalized = allowed_dep.rstrip('/')
            
            if import_path.startswith(f"{allowed_dep_normalized}/") or (allowed_dep.endswith('/') and import_path.startswith(allowed_dep)):
                # Extract the child path
                prefix = allowed_dep if allowed_dep.endswith('/') else f"{allowed_dep_normalized}/"
                child_path = import_path[len(prefix):]
                
                if not child_path:  # Empty child path means exact match
                    return True
                
                # Convert ~/path to src/path for file system checking
                if allowed_dep_normalized.startswith("~/"):
                    potential_subsystem_path = Path("src") / allowed_dep_normalized[2:] / child_path
                else:
                    potential_subsystem_path = Path(allowed_dep_normalized) / child_path
                
                # If child is a subsystem (has dependencies.json), require explicit permission
                # BUT only for grandchildren, not direct children
                # If ~/lib/domains allows ~/lib/domains/iam that's OK (direct child)
                # If ~/lib/domains allows ~/lib/domains/iam/services that's NOT OK (grandchild subsystem)
                if (potential_subsystem_path / "dependencies.json").exists():
                    # Check if this is a direct child or a deeper nesting
                    slash_count = child_path.count('/')
                    if slash_count > 0:  # This is a grandchild or deeper, block it
                        continue  # Child is subsystem, needs explicit permission
                
                # Otherwise, hierarchy allows it
                return True
        
        return False
    
    def _check_hierarchical_redundancy(self, subsystems: List[SubsystemInfo]) -> None:
        """Check for hierarchical redundancy within the same dependencies.json."""
        for subsystem in subsystems:
            deps = subsystem.dependencies
            
            # Check allowed array for hierarchical redundancy
            allowed = deps.get("allowed", [])
            if allowed:
                self._check_hierarchical_redundancy_in_list(subsystem, allowed, "allowed")
            
            # Check allowedChildren array for hierarchical redundancy  
            allowed_children = deps.get("allowedChildren", [])
            if allowed_children:
                self._check_hierarchical_redundancy_in_list(subsystem, allowed_children, "allowedChildren")
    
    def _check_hierarchical_redundancy_in_list(self, subsystem: SubsystemInfo, dep_list: list, list_name: str) -> None:
        """Check for hierarchical redundancy within a single dependency list."""
        for i, dep in enumerate(dep_list):
            for j, other_dep in enumerate(dep_list):
                if i != j and dep != other_dep:
                    # Check if dep is made redundant by other_dep (other_dep is broader)
                    if dep.startswith(f"{other_dep}/"):
                        # BUT only flag as redundant if the child path is NOT a subsystem
                        # Convert ~/path to src/path for file system checking
                        potential_subsystem_path = None
                        if other_dep.startswith("~/"):
                            base_path = Path("src") / other_dep[2:]
                            child_suffix = dep[len(other_dep) + 1:]  # +1 to skip the "/"
                            potential_subsystem_path = base_path / child_suffix
                        else:
                            potential_subsystem_path = Path(other_dep) / dep[len(other_dep) + 1:]
                        
                        # If child path is NOT a subsystem (no dependencies.json), it's truly redundant
                        if potential_subsystem_path and not (potential_subsystem_path / "dependencies.json").exists():
                            self.errors.append(ArchError(
                                f"❌ Hierarchical redundancy in {subsystem.name}:\n"
                                f"  🔸 '{dep}' is redundant because '{other_dep}' already allows access\n"
                                f"     → Remove '{dep}' from {subsystem.path}/dependencies.json '{list_name}' array\n"
                                f"     → '{other_dep}' already provides hierarchical access"
                            ))
                        # If child path IS a subsystem, it's NOT redundant - subsystems need explicit access
    
    def _check_redundant_dependencies(self, subsystems: List[SubsystemInfo]) -> None:
        """Check for redundant dependency declarations."""
        print("Checking for redundant dependency declarations...")
        
        for subsystem in subsystems:
            parent_dir = subsystem.parent_path
            if not parent_dir or parent_dir == self.target_path:
                continue
            
            parent_deps_file = parent_dir / "dependencies.json"
            if not parent_deps_file.exists():
                continue
            
            parent_deps = self._load_dependencies_json(parent_deps_file)
            parent_allowed_children = parent_deps.get("allowedChildren", [])
            
            if not parent_allowed_children:
                continue
            
            # Check child's allowed array for redundancy
            child_allowed = subsystem.dependencies.get("allowed", [])
            for dep in child_allowed:
                if dep in parent_allowed_children:
                    self.errors.append(ArchError(
                        f"❌ Redundant dependency in {subsystem.name}:\n"
                        f"  🔸 '{dep}' is already provided by parent allowedChildren\n"
                        f"     → Remove from {subsystem.path}/dependencies.json 'allowed' array\n"
                        f"     → Parent allowedChildren automatically cascades to children"
                    ))
            
            # Check child's allowedChildren array for redundancy
            child_allowed_children = subsystem.dependencies.get("allowedChildren", [])
            for dep in child_allowed_children:
                if dep in parent_allowed_children:
                    self.errors.append(ArchError(
                        f"❌ Redundant allowedChildren in {subsystem.name}:\n"
                        f"  🔸 '{dep}' is already provided by parent allowedChildren\n"
                        f"     → Remove from {subsystem.path}/dependencies.json 'allowedChildren' array"
                    ))
    
    def _check_file_folder_conflicts(self) -> None:
        """Check for file/folder naming conflicts."""
        print("Checking for file/folder naming conflicts...")
        
        for ts_file in self.target_path.rglob("*.ts"):
            if self._is_test_file(ts_file):
                continue
            
            stem = ts_file.stem
            if stem == "index":
                continue  # Skip index files
            
            # Check if there's a folder with same name
            potential_folder = ts_file.parent / stem
            if potential_folder.is_dir():
                self.errors.append(ArchError(
                    f"❌ File/folder naming conflict:\n"
                    f"  🔸 File: {ts_file.relative_to(self.target_path)}\n"
                    f"  🔸 Folder: {potential_folder.relative_to(self.target_path)}/\n"
                    f"     → Move file contents to {potential_folder.relative_to(self.target_path)}/index.ts"
                ))
        
        # Check .tsx files too
        for tsx_file in self.target_path.rglob("*.tsx"):
            if self._is_test_file(tsx_file):
                continue
            
            stem = tsx_file.stem
            if stem == "index":
                continue
            
            potential_folder = tsx_file.parent / stem
            if potential_folder.is_dir():
                self.errors.append(ArchError(
                    f"❌ File/folder naming conflict:\n"
                    f"  🔸 File: {tsx_file.relative_to(self.target_path)}\n" 
                    f"  🔸 Folder: {potential_folder.relative_to(self.target_path)}/\n"
                    f"     → Move file contents to {potential_folder.relative_to(self.target_path)}/index.ts"
                ))
    
    def _check_outbound_dependencies_parallel(self, subsystems: List[SubsystemInfo]) -> None:
        """Check outbound dependencies against allowlist with parallel processing."""
        print("Checking outbound dependencies...")
        
        def check_single_subsystem(subsystem: SubsystemInfo) -> List[ArchError]:
            errors = []
            
            # Get all allowed dependencies (local + inherited)
            allowed_deps = set(subsystem.dependencies.get("allowed", []))
            allowed_children = set(subsystem.dependencies.get("allowedChildren", []))
            inherited = set(self._resolve_inheritance_chain(subsystem))
            
            all_allowed = allowed_deps | allowed_children | inherited
            
            
            # Add domain _objects if in domain
            if self._is_domain_path(subsystem.path):
                all_allowed.add("_objects")
            
            # Check each file's imports
            for file_info in subsystem.files:
                for import_path in file_info.imports:
                    # Skip internal imports
                    if not import_path.startswith("~/") and not import_path.startswith("../"):
                        continue
                    
                    # Convert relative to absolute (simplified for now)
                    if import_path.startswith("../"):
                        continue
                    
                    # Check if import is allowed (exact match or hierarchical)
                    is_allowed = self._is_import_allowed_by_set(import_path, all_allowed, subsystem.path)
                    
                    if not is_allowed:
                        errors.append(ArchError(
                            f"❌ Undeclared outbound dependency in {subsystem.name}:\n"
                            f"  🔸 {file_info.path.relative_to(subsystem.path)}\n"
                            f"     import from '{import_path}'\n"
                            f"     → Add '{import_path}' to dependencies.json 'allowed' array"
                        ))
            
            return errors
        
        # Process subsystems in parallel
        with ThreadPoolExecutor(max_workers=4) as executor:
            future_to_subsystem = {
                executor.submit(check_single_subsystem, subsystem): subsystem
                for subsystem in subsystems
            }
            
            for future in as_completed(future_to_subsystem):
                errors = future.result()
                self.errors.extend(errors)
    
    def _check_domain_structure(self) -> None:
        """Check domain-specific structure requirements."""
        print("Checking domain structure...")
        
        domains_path = self.target_path / "lib" / "domains"
        if not domains_path.exists():
            return
        
        for domain_dir in domains_path.iterdir():
            if not domain_dir.is_dir():
                continue
            
            # Check services structure
            services_dir = domain_dir / "services"
            if services_dir.exists():
                # Services must have dependencies.json
                if not (services_dir / "dependencies.json").exists():
                    self.errors.append(ArchError(
                        f"❌ {services_dir} needs dependencies.json"
                    ))
                
                # Services must be exposed in services/index.ts
                if not (services_dir / "index.ts").exists():
                    self.errors.append(ArchError(
                        f"❌ {services_dir} missing index.ts to expose services"
                    ))
            
            # Check infrastructure structure
            infra_dirs = list(domain_dir.rglob("infrastructure/*"))
            for infra_dir in infra_dirs:
                if infra_dir.is_dir() and not (infra_dir / "dependencies.json").exists():
                    self.errors.append(ArchError(
                        f"❌ Infrastructure {infra_dir} needs dependencies.json"
                    ))
            
            # Check utils structure  
            utils_dir = domain_dir / "utils"
            if utils_dir.exists() and not (utils_dir / "index.ts").exists():
                self.errors.append(ArchError(
                    f"❌ {utils_dir} missing index.ts to expose utilities"
                ))
    
    def _check_domain_import_restrictions(self) -> None:
        """Check that domain services are only imported by API/server code."""
        print("Checking domain import restrictions...")
        
        domains_path = self.target_path / "lib" / "domains"
        if not domains_path.exists():
            return
        
        # Find all service files
        for service_file in domains_path.rglob("services/*.ts"):
            if service_file.name == "index.ts":
                continue
            
            service_import_pattern = str(service_file).replace("src/", "").replace(".ts", "")
            
            # Find files that import this service
            for ts_file in self.target_path.rglob("*.ts"):
                if self._is_test_file(ts_file):
                    continue
                
                # Skip the service file itself
                if ts_file == service_file:
                    continue
                
                # Check if it's an API/server file (allowed)
                file_str = str(ts_file)
                if "/api/" in file_str or "/server/" in file_str:
                    continue
                
                content = self._get_file_content(ts_file)
                if not content:
                    continue
                
                # Check if this file imports the service
                if f"domains/{service_import_pattern.split('/')[-2]}" in content:
                    service_name = service_file.stem
                    self.errors.append(ArchError(
                        f"❌ Service {service_name} imported by non-API file:\n"
                        f"  🔸 {ts_file.relative_to(self.target_path)}\n"
                        f"     → Services can only be imported by API/server code"
                    ))
    
    def run_all_checks(self) -> bool:
        """Run all architecture checks and return True if no errors."""
        start_time = time.time()
        
        print(f"🏗️ Checking architectural boundaries in {self.target_path}...")
        
        # Single pass: find all subsystems and cache file info
        subsystems = self._find_all_subsystems()
        
        # Run all checks
        self._check_complexity_requirements()
        self._check_subsystem_completeness(subsystems)
        self._check_subsystem_declarations(subsystems)
        self._check_import_boundaries(subsystems)
        self._check_reexport_boundaries(subsystems)
        self._check_dependencies_json_format(subsystems)
        self._check_hierarchical_redundancy(subsystems)
        self._check_redundant_dependencies(subsystems)
        self._check_file_folder_conflicts()
        self._check_outbound_dependencies_parallel(subsystems)
        
        self._check_domain_structure()
        self._check_domain_import_restrictions()
        
        elapsed = time.time() - start_time
        print(f"⏱️  Completed in {elapsed:.2f} seconds")
        
        # Report results
        if self.errors:
            print("\n🚨 Architecture violations:")
            print("=" * 72)
            for error in self.errors:
                print(error.message)
            
            print("\n📋 Requirements:")
            print("-" * 72)
            print(f"• Folders over {self.complexity_threshold} lines need:")
            print("  - dependencies.json")
            print("  - README.md") 
            print("  - ARCHITECTURE.md")
            print("=" * 72)
            return False
        
        if self.warnings:
            print("\n⚠️  Warnings:")
            print("-" * 72)
            for warning in self.warnings:
                print(warning.message)
            print("-" * 72)
        
        print("✅ Architecture check passed!")
        return True


def main():
    """Main entry point."""
    target_path = sys.argv[1] if len(sys.argv) > 1 else "src"
    
    checker = ArchitectureChecker(target_path)
    success = checker.run_all_checks()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()