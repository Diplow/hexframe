#!/usr/bin/env python3
"""
Import boundary and reexport rules.

Handles checking import boundaries and reexport restrictions.
"""

import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import List, Set

from ..models import ArchError, ErrorType, RecommendationType, SubsystemInfo
from ..utils.file_utils import find_typescript_files
from ..utils.import_utils import (
    is_child_of_subsystem, 
    resolve_inheritance_chain,
    is_import_allowed_by_set
)
from ..utils.path_utils import PathHelper


class ImportRuleChecker:
    """Checker for import boundaries and reexport rules."""
    
    def __init__(self, path_helper: PathHelper, file_cache):
        self.path_helper = path_helper
        self.file_cache = file_cache
    
    def check_import_boundaries(self, subsystems: List[SubsystemInfo]) -> List[ArchError]:
        """Check that external imports go through subsystem index files."""
        errors = []
        # print("Checking import boundaries...")

        for subsystem in subsystems:
            violations = self._find_import_boundary_violations(subsystem)

            if violations:
                # Provide context based on subsystem type
                subsystem_type_desc = f" (type: {subsystem.subsystem_type})" if subsystem.subsystem_type else ""
                errors.append(ArchError.create_error(
                    message=f"❌ External imports bypass {subsystem.name}/index{subsystem_type_desc}:",
                    error_type=ErrorType.IMPORT_BOUNDARY,
                    subsystem=str(subsystem.path),
                    recommendation=f"Create or update {subsystem.path}/index.ts to reexport internal modules",
                    recommendation_type=RecommendationType.CREATE_SUBSYSTEM_INDEX
                ))
                for v in violations:
                    # Extract the import path from the violation
                    import_match = re.search(r"from\s+['\"]([^'\"]*)['\"]", v['import'])
                    if import_match:
                        import_path = import_match.group(1)
                        # Suggest changing the import to use the index
                        subsystem_abs_path = f"~/{subsystem.path.relative_to(Path('src'))}"
                        recommendation = f"Change import from '{import_path}' to '{subsystem_abs_path}' (via index.ts)"
                    else:
                        recommendation = f"Import through {subsystem.path}/index.ts instead of direct file access"

                    errors.append(ArchError.create_error(
                        message=f"  🔸 {v['file']}:{v['line']}\n     {v['import']}",
                        error_type=ErrorType.IMPORT_BOUNDARY,
                        subsystem=str(subsystem.path),
                        file_path=str(v['file']),
                        line_number=v['line'],
                        recommendation=recommendation,
                        recommendation_type=RecommendationType.USE_SUBSYSTEM_INTERFACE
                    ))

        return errors
    
    def check_reexport_boundaries(self, subsystems: List[SubsystemInfo]) -> List[ArchError]:
        """Check that index.ts files only reexport from child subsystems or internal files."""
        errors = []
        # print("Checking reexport boundaries...")
        
        for subsystem in subsystems:
            violations = self._find_reexport_violations(subsystem)
            
            if violations:
                errors.append(ArchError.create_error(
                    message=f"❌ Invalid reexports in {subsystem.name}/index.ts:",
                    error_type=ErrorType.REEXPORT_BOUNDARY,
                    subsystem=str(subsystem.path),
                    recommendation=f"Fix reexports in {subsystem.path}/index.ts to only expose internal modules",
                    recommendation_type=RecommendationType.FIX_REEXPORT_BOUNDARY
                ))
                for v in violations:
                    # Create specific recommendation based on violation type
                    if v['reason'] == 'reexport from external subsystem violates encapsulation':
                        recommendation = f"Remove reexport '{v['import']}' from index.ts - external dependencies should be imported directly"
                    else:
                        recommendation = f"Fix reexport pattern '{v['import']}' in index.ts to follow subsystem rules"
                    
                    errors.append(ArchError.create_error(
                        message=(f"  🔸 Line {v['line']}: {v['full_statement']}\n"
                               f"     → {v['reason']}\n"
                               f"     → Reexports should only expose child subsystems or internal files\n"
                               f"     → External dependencies should be imported directly where needed"),
                        error_type=ErrorType.REEXPORT_BOUNDARY,
                        subsystem=str(subsystem.path),
                        file_path=f"{subsystem.path}/index.ts",
                        line_number=v['line'],
                        recommendation=recommendation,
                        recommendation_type=RecommendationType.FIX_REEXPORT_BOUNDARY
                    ))
        
        return errors
    
    def check_outbound_dependencies_parallel(self, subsystems: List[SubsystemInfo]) -> List[ArchError]:
        """Check outbound dependencies against allowlist with parallel processing."""
        errors = []
        # print("Checking outbound dependencies...")
        
        def check_single_subsystem(subsystem: SubsystemInfo) -> List[ArchError]:
            subsystem_errors = []
            
            # Get all allowed dependencies (local + inherited)
            allowed_deps = set(subsystem.dependencies.get("allowed", []))
            allowed_children = set(subsystem.dependencies.get("allowedChildren", []))
            inherited = set(resolve_inheritance_chain(subsystem, self.file_cache))
            
            all_allowed = allowed_deps | allowed_children | inherited
            
            # Add domain _objects if in domain
            if self.path_helper.is_domain_path(subsystem.path):
                all_allowed.add("_objects")
            
            # Domain utils are implicitly allowed - handled in is_import_allowed_by_set
            
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
                    is_allowed = is_import_allowed_by_set(import_path, all_allowed, subsystem.path)
                    
                    if not is_allowed:
                        recommendation = f"Add '{import_path}' to {subsystem.path}/dependencies.json 'allowed' array"
                        subsystem_errors.append(ArchError.create_error(
                            message=(f"❌ Undeclared outbound dependency in {subsystem.name}:\n"
                                   f"  🔸 {file_info.path.relative_to(subsystem.path)}\n"
                                   f"     import from '{import_path}'\n"
                                   f"     → {recommendation}"),
                            error_type=ErrorType.IMPORT_BOUNDARY,
                            subsystem=str(subsystem.path),
                            file_path=str(file_info.path),
                            recommendation=recommendation,
                            recommendation_type=RecommendationType.ADD_ALLOWED_DEPENDENCY
                        ))
            
            return subsystem_errors
        
        # Process subsystems in parallel
        with ThreadPoolExecutor(max_workers=4) as executor:
            future_to_subsystem = {
                executor.submit(check_single_subsystem, subsystem): subsystem
                for subsystem in subsystems
            }
            
            for future in as_completed(future_to_subsystem):
                subsystem_errors = future.result()
                errors.extend(subsystem_errors)
        
        return errors
    
    def check_router_import_patterns(self, subsystems: List[SubsystemInfo]) -> List[ArchError]:
        """Check for imports from router subsystems - warn to use specific child instead."""
        errors = []
        # print("Checking router import patterns...")

        # Build a map of router subsystems by their import path
        router_subsystems = {}
        for subsystem in subsystems:
            if subsystem.subsystem_type == "router":
                subsystem_abs_path = f"~/{subsystem.path.relative_to(Path('src'))}"
                router_subsystems[subsystem_abs_path] = subsystem

        # Check all subsystems for imports from routers
        for subsystem in subsystems:
            for file_info in subsystem.files:
                for import_path in file_info.imports:
                    # Check if importing from a router subsystem's index
                    for router_path, router_subsystem in router_subsystems.items():
                        # Match exact router path (importing from index) but not child paths
                        if import_path == router_path:
                            # Get list of child subsystems for suggestion
                            child_subsystems = router_subsystem.dependencies.get("subsystems", [])
                            children_list = ", ".join([child.lstrip("./") for child in child_subsystems])

                            recommendation = f"Consider importing from specific child subsystem instead: {router_path}/[{children_list}]"

                            errors.append(ArchError.create_warning(
                                message=(f"⚠️  Import from router subsystem in {subsystem.name}:\n"
                                       f"  🔸 {file_info.path.relative_to(subsystem.path)}\n"
                                       f"     import from '{import_path}'\n"
                                       f"     → Router subsystems are aggregators - prefer importing from specific children for explicit dependency tracking\n"
                                       f"     → Available children: {children_list}"),
                                error_type=ErrorType.IMPORT_BOUNDARY,
                                subsystem=str(subsystem.path),
                                file_path=str(file_info.path),
                                recommendation=recommendation,
                                recommendation_type=RecommendationType.USE_SPECIFIC_CHILD
                            ))

        return errors

    def check_domain_utils_import_patterns(self, subsystems: List[SubsystemInfo]) -> List[ArchError]:
        """Check that domain utils imports go through index.ts, not specific files."""
        errors = []
        # print("Checking domain utils import patterns...")

        for subsystem in subsystems:
            for file_info in subsystem.files:
                for import_path in file_info.imports:
                    # Check if it's a domain utils import to a specific file (not index)
                    import re
                    specific_utils_pattern = r"~/lib/domains/[^/]+/utils/[^/]+$"
                    if re.match(specific_utils_pattern, import_path) and not import_path.endswith("/index"):
                        # Skip if this is a utils/index.ts file importing from its own utils files
                        # This allows utils/index.ts to aggregate exports from its own files
                        if file_info.path.name == "index.ts" and file_info.path.parent.name == "utils":
                            # Check if the import is from the same domain
                            domain_match = re.match(r"~/lib/domains/([^/]+)/utils/.*", import_path)
                            if domain_match:
                                import_domain = domain_match.group(1)
                                # Get the domain of the current file
                                file_path_parts = file_info.path.parts
                                if "domains" in file_path_parts:
                                    domains_index = file_path_parts.index("domains")
                                    if domains_index + 1 < len(file_path_parts):
                                        current_domain = file_path_parts[domains_index + 1]
                                        # If importing from same domain, allow it
                                        if import_domain == current_domain:
                                            continue

                        # Extract domain and suggest proper import
                        domain_match = re.match(r"~/lib/domains/([^/]+)/utils/.*", import_path)
                        if domain_match:
                            domain_name = domain_match.group(1)
                            proper_import = f"~/lib/domains/{domain_name}/utils"

                            error = ArchError.create_error(
                                message=(f"❌ Direct utils file import in {subsystem.name}:\n"
                                       f"  🔸 {file_info.path.relative_to(subsystem.path)}\n"
                                       f"     import from '{import_path}'\n"
                                       f"     → Use '{proper_import}' instead (import through utils index.ts)"),
                                error_type=ErrorType.IMPORT_BOUNDARY,
                                subsystem=str(subsystem.path),
                                file_path=str(file_info.path),
                                recommendation=f"Change import from '{import_path}' to '{proper_import}' (use utils index.ts)",
                                recommendation_type=RecommendationType.USE_UTILS_INTERFACE
                            )
                            errors.append(error)
        
        return errors
    
    def check_standalone_index_reexports(self, index_files: List[Path]) -> List[ArchError]:
        """Check upward reexports in all index.ts files, not just those in formal subsystems."""
        errors = []
        
        for index_file in index_files:
            # Skip if this index file is already part of a formal subsystem
            if self._is_index_in_formal_subsystem(index_file):
                continue
            
            # Create a minimal subsystem-like info for this index file
            pseudo_subsystem = self._create_pseudo_subsystem(index_file)
            
            # Check for upward reexport violations
            violations = self._find_standalone_index_violations(pseudo_subsystem)
            
            if violations:
                errors.append(ArchError.create_error(
                    message=f"❌ Invalid upward reexports in {index_file.relative_to(Path('src'))}:",
                    error_type=ErrorType.REEXPORT_BOUNDARY,
                    subsystem=str(index_file.parent),
                    recommendation=f"Fix upward reexports in {index_file.relative_to(Path('src'))} - index files should not reexport from parent directories",
                    recommendation_type=RecommendationType.FIX_REEXPORT_BOUNDARY
                ))
                
                for v in violations:
                    errors.append(ArchError.create_error(
                        message=(f"  🔸 Line {v['line']}: {v['full_statement']}\n"
                               f"     → {v['reason']}"),
                        error_type=ErrorType.REEXPORT_BOUNDARY,
                        subsystem=str(index_file.parent),
                        file_path=str(index_file),
                        line_number=v['line'],
                        recommendation="Either move implementation to this directory or import directly from original location",
                        recommendation_type=RecommendationType.FIX_UPWARD_REEXPORT
                    ))
        
        return errors
    
    def _find_import_boundary_violations(self, subsystem: SubsystemInfo) -> List[dict]:
        """Find violations where external files import directly into subsystem."""
        violations = []

        # Router subsystems allow direct child imports (they're just aggregators)
        if subsystem.subsystem_type == "router":
            return violations

        # We want to find EXTERNAL files that import directly into this subsystem
        typescript_files = find_typescript_files(self.path_helper.target_path)

        for ts_file in typescript_files:
            # Skip index.ts files - they're allowed to import from their children
            if ts_file.name == "index.ts":
                continue

            file_str = str(ts_file)

            # Skip if file IS within this subsystem (internal files, not external importers)
            if str(subsystem.path) in file_str:
                continue

            # Skip if file is in a child subsystem (children can import parent freely)
            if is_child_of_subsystem(ts_file, subsystem, {}):  # TODO: pass proper subsystem_cache
                continue

            # Now check if this external file imports into the subsystem
            content = self.file_cache.get_file_info(ts_file).content
            if not content:
                continue

            # Find imports that bypass index.ts
            # Use full subsystem path for precise matching
            subsystem_abs_path = f"~/{subsystem.path.relative_to(Path('src'))}"
            import_pattern = rf'from\s+["\']({re.escape(subsystem_abs_path)}/[^"\']*)["\']'
            matches = re.finditer(import_pattern, content, re.MULTILINE)

            for match in matches:
                import_path = match.group(1)
                # Skip if importing from index or root
                sub_path = import_path[len(subsystem_abs_path) + 1:]
                if not sub_path or sub_path == "index":
                    continue

                # Check if importing file has permission through its own inheritance chain
                if self._file_has_import_permission(ts_file, import_path):
                    continue

                line_num = content[:match.start()].count('\n') + 1
                violations.append({
                    'file': ts_file,
                    'line': line_num,
                    'import': match.group(0)
                })

        return violations
    
    def _find_reexport_violations(self, subsystem: SubsystemInfo) -> List[dict]:
        """Find reexport violations in subsystem index.ts."""
        index_file = subsystem.path / "index.ts"
        if not index_file.exists():
            return []
            
        content = self.file_cache.get_file_info(index_file).content
        if not content:
            return []
        
        # Find all reexport statements (export { ... } from '...' and export * from '...')
        reexport_pattern = r'export\s+\{[^}]*\}\s+from\s+["\']([^"\']+)["\']'
        reexport_type_pattern = r'export\s+type\s+\{[^}]*\}\s+from\s+["\']([^"\']+)["\']'
        reexport_star_pattern = r'export\s+\*\s+from\s+["\']([^"\']+)["\']'
        
        violations = []
        
        for pattern in [reexport_pattern, reexport_type_pattern, reexport_star_pattern]:
            matches = re.finditer(pattern, content, re.MULTILINE)
            
            for match in matches:
                import_path = match.group(1)
                line_num = content[:match.start()].count('\n') + 1
                
                violation = self._check_reexport_violation(
                    subsystem, import_path, match.group(0), line_num)
                if violation:
                    violations.append(violation)
        
        return violations
    
    def _check_reexport_violation(self, subsystem: SubsystemInfo, import_path: str,
                                 full_statement: str, line_num: int) -> dict:
        """Check if a single reexport violates rules."""

        # NEW RULE: index.ts files cannot reexport from parent/higher directories
        if self._is_upward_reexport(subsystem, import_path):
            return {
                'line': line_num,
                'import': import_path,
                'full_statement': full_statement,
                'reason': 'index.ts files cannot reexport from parent directories - either move implementation here or import directly from original location'
            }

        # Special rule: Domain index.ts files should NOT reexport from utils
        # Utils should be imported directly, not through domain index
        if self._is_domain_index(subsystem):
            # Check for relative utils imports
            if import_path == './utils' or import_path.startswith('./utils/'):
                return {
                    'line': line_num,
                    'import': import_path,
                    'full_statement': full_statement,
                    'reason': 'domain index should not reexport utils - import directly from utils instead'
                }
            # Check for absolute utils imports within same domain
            subsystem_abs_path = f"~/{subsystem.path.relative_to(Path('src'))}"
            utils_path = f"{subsystem_abs_path}/utils"
            if import_path == utils_path or import_path.startswith(f"{utils_path}/"):
                return {
                    'line': line_num,
                    'import': import_path,
                    'full_statement': full_statement,
                    'reason': 'domain index should not reexport utils - import directly from utils instead'
                }

        # EXCEPTION: Domain utils can reexport from sibling subsystems within same domain
        # This allows utils to create a client-safe API without server dependencies
        if self._is_domain_utils(subsystem):
            # Check if import is from the same domain
            subsystem_rel_path = subsystem.path.relative_to(Path('src'))
            path_parts = subsystem_rel_path.parts
            if len(path_parts) >= 4 and path_parts[0] == 'lib' and path_parts[1] == 'domains':
                domain_name = path_parts[2]
                domain_prefix = f"~/lib/domains/{domain_name}"

                # Allow reexports from same domain for domain/utils
                if import_path.startswith(domain_prefix):
                    return None  # Allowed for domain/utils
                # Also allow relative imports from siblings
                if import_path.startswith('../'):
                    # Check if it resolves to same domain
                    return None  # Allowed for domain/utils

        # STRICT RULE: Only allow reexports from child subsystems or internal files
        if import_path.startswith('./'):
            # This is a child reference - check if it's a declared child subsystem or internal file
            child_name = import_path[2:]  # Remove './'
            child_subsystems = subsystem.dependencies.get("subsystems", [])

            if f"./{child_name}" in child_subsystems:
                return None  # Valid child subsystem reexport
            else:
                # Check if it's a file within the current subsystem
                if self._is_internal_file_reexport(subsystem, child_name):
                    return None  # Valid internal file reexport

        elif import_path.startswith('../'):
            # STRICT: No reexports from siblings or parents
            return {
                'line': line_num,
                'import': import_path,
                'full_statement': full_statement,
                'reason': 'reexport from external subsystem violates encapsulation'
            }
        
        elif import_path.startswith('~/'):
            # Check if this is an internal absolute path within the same subsystem
            subsystem_abs_path = f"~/{subsystem.path.relative_to(Path('src'))}"
            
            if import_path.startswith(f"{subsystem_abs_path}/"):
                # This is an internal absolute path reexport - allowed
                return None
            else:
                # This is an external absolute path reexport - not allowed
                return {
                    'line': line_num,
                    'import': import_path,
                    'full_statement': full_statement,
                    'reason': 'reexport from external subsystem violates encapsulation'
                }
        
        else:
            # Check for external library imports (node_modules, etc.) - these are allowed
            if not import_path.startswith('.') and not import_path.startswith('~'):
                return None  # External library reexport is allowed
            
            # Any other pattern is invalid
            return {
                'line': line_num,
                'import': import_path,
                'full_statement': full_statement,
                'reason': 'invalid reexport pattern'
            }
    
    def _is_internal_file_reexport(self, subsystem: SubsystemInfo, child_name: str) -> bool:
        """Check if reexport is for an internal file within the subsystem."""
        potential_file = subsystem.path / f"{child_name}.ts"
        potential_tsx_file = subsystem.path / f"{child_name}.tsx"
        # Also check for directories with index files
        potential_dir_index = subsystem.path / child_name / "index.ts"
        potential_dir_index_tsx = subsystem.path / child_name / "index.tsx"
        
        return (potential_file.exists() or potential_tsx_file.exists() or 
                potential_dir_index.exists() or potential_dir_index_tsx.exists())
    
    def _file_has_import_permission(self, file_path: Path, import_path: str) -> bool:
        """Check if a file has permission to import from the given path through inheritance."""
        # Allow certain types of imports that don't violate encapsulation
        
        if not import_path.startswith("~/lib/domains/"):
            return False
            
        # Extract domain from import path (e.g., "~/lib/domains/mapping/utils" -> "mapping")  
        import_parts = import_path.split('/')
        if len(import_parts) < 4:
            return False
        import_domain = import_parts[3]
        
        # Check if importing file is within the same domain directory
        file_str = str(file_path)
        
        # Always allow same-domain imports for files within lib/domains/DOMAIN
        if f"/lib/domains/{import_domain}/" in file_str:
            return True
        
        # Allow direct imports from domain utils - these are pure, side-effect-free
        # utilities that can be safely imported by frontend/external code
        if len(import_parts) >= 5 and import_parts[4] == "utils":
            return True
        
        # All other imports (services, infrastructure, etc.) must go through the domain's index.ts
        return False
    
    def _is_upward_reexport(self, subsystem: SubsystemInfo, import_path: str) -> bool:
        """Check if this reexport goes to a higher-level directory (parent or ancestor sibling)."""
        # EXCEPTION: Domain utils can reexport from their parent domain
        # Pattern: src/lib/domains/DOMAIN/utils can reexport from ~/lib/domains/DOMAIN/*
        subsystem_rel_path = subsystem.path.relative_to(Path('src'))
        path_parts = subsystem_rel_path.parts

        # Check if this is a domain utils directory
        if (len(path_parts) >= 4 and
            path_parts[0] == 'lib' and
            path_parts[1] == 'domains' and
            path_parts[3] == 'utils'):
            # This is a domain utils directory
            domain_name = path_parts[2]
            domain_prefix = f"~/lib/domains/{domain_name}"

            # If importing from the same domain (but not a child), allow it
            if import_path.startswith(domain_prefix):
                subsystem_abs_path = f"~/{subsystem_rel_path}"
                # Make sure it's not a child import (those are already allowed)
                if not import_path.startswith(f"{subsystem_abs_path}/"):
                    # This is a same-domain import for utils - allowed
                    return False

        # Handle relative upward paths like '../types' or '../../../lib'
        if import_path.startswith('../'):
            return True

        # Handle absolute paths that point to higher-level directories
        if import_path.startswith('~/'):
            # Get the subsystem's path relative to src
            subsystem_rel_path = subsystem.path.relative_to(Path('src'))
            # Convert to absolute import pattern
            subsystem_abs_path = f"~/{subsystem_rel_path}"

            # If the import path is identical to subsystem path, it's not upward (self-import)
            if import_path == subsystem_abs_path:
                return False

            # If the import starts with subsystem path + '/', it's a child (downward) - allowed
            if import_path.startswith(f"{subsystem_abs_path}/"):
                return False

            # Otherwise, check if it's at the same level or higher level
            import_parts = import_path.split('/')
            subsystem_parts = subsystem_abs_path.split('/')

            # Find common prefix length
            common_length = 0
            for i in range(min(len(import_parts), len(subsystem_parts))):
                if import_parts[i] == subsystem_parts[i]:
                    common_length += 1
                else:
                    break

            # If import has fewer or equal parts than subsystem, and shares a common prefix,
            # it's pointing to a higher level directory
            if len(import_parts) <= len(subsystem_parts) and common_length > 0:
                # Ensure we don't flag completely unrelated paths
                if common_length >= 2:  # At least '~' and one more level in common
                    return True

        return False
    
    def _is_domain_index(self, subsystem: SubsystemInfo) -> bool:
        """Check if this subsystem represents a domain's main index.ts file."""
        # Domain paths look like: src/lib/domains/DOMAIN_NAME
        path_parts = subsystem.path.parts
        return (len(path_parts) >= 4 and
                path_parts[-3] == 'lib' and
                path_parts[-2] == 'domains' and
                (subsystem.path / 'index.ts').exists())

    def _is_domain_utils(self, subsystem: SubsystemInfo) -> bool:
        """Check if this subsystem is a domain/utils directory.

        Domain utils are special - they create a client-safe API by reexporting
        types from sibling subsystems without pulling in server dependencies.
        Pattern: src/lib/domains/DOMAIN_NAME/utils
        """
        path_parts = subsystem.path.parts
        return (len(path_parts) >= 5 and
                path_parts[0] == 'src' and
                path_parts[1] == 'lib' and
                path_parts[2] == 'domains' and
                path_parts[4] == 'utils')
    
    def _is_index_in_formal_subsystem(self, index_file: Path) -> bool:
        """Check if this index file belongs to a formal subsystem (has dependencies.json)."""
        deps_file = index_file.parent / 'dependencies.json'
        return deps_file.exists()
    
    def _create_pseudo_subsystem(self, index_file: Path) -> SubsystemInfo:
        """Create a minimal SubsystemInfo for standalone index files."""
        from ..models import FileInfo
        
        # Get file info for the index file
        file_info = self.file_cache.get_file_info(index_file)
        
        return SubsystemInfo(
            path=index_file.parent,
            name=index_file.parent.name,
            dependencies={},  # Empty dependencies
            files=[file_info],
            total_lines=file_info.lines,
            parent_path=index_file.parent.parent
        )
    
    def _find_standalone_index_violations(self, pseudo_subsystem: SubsystemInfo) -> List[dict]:
        """Find reexport violations in a standalone index file."""
        index_file = pseudo_subsystem.path / "index.ts"
        if not index_file.exists():
            index_file = pseudo_subsystem.path / "index.tsx"
            if not index_file.exists():
                return []
        
        content = self.file_cache.get_file_info(index_file).content
        if not content:
            return []
        
        # Find all reexport statements using same patterns as formal subsystems
        reexport_pattern = r'export\s+\{[^}]*\}\s+from\s+["\']([^"\']+)["\']'
        reexport_type_pattern = r'export\s+type\s+\{[^}]*\}\s+from\s+["\']([^"\']+)["\']'
        reexport_star_pattern = r'export\s+\*\s+from\s+["\']([^"\']+)["\']'
        
        violations = []
        
        for pattern in [reexport_pattern, reexport_type_pattern, reexport_star_pattern]:
            matches = re.finditer(pattern, content, re.MULTILINE)
            
            for match in matches:
                import_path = match.group(1)
                line_num = content[:match.start()].count('\n') + 1
                
                # Only check for upward reexports (our specific rule)
                if self._is_upward_reexport(pseudo_subsystem, import_path):
                    violations.append({
                        'line': line_num,
                        'import': import_path,
                        'full_statement': match.group(0),
                        'reason': 'index.ts files cannot reexport from parent directories - either move implementation here or import directly from original location'
                    })
        
        return violations