#!/usr/bin/env python3
"""
Import utility functions for architecture checking.

Handles import parsing and dependency resolution.
"""

import re
from pathlib import Path
from typing import List, Set
import sys
import os

from ..models import SubsystemInfo

# Import shared TypeScript parser
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))
from shared.typescript_parser import TypeScriptParser

# Create a shared parser instance
_parser = TypeScriptParser()


def extract_imports(content: str) -> List[str]:
    """Extract import paths from TypeScript content using shared parser."""
    return _parser.extract_import_paths(content)


def resolve_inheritance_chain(subsystem: SubsystemInfo, file_cache) -> List[str]:
    """Resolve full inheritance chain including ancestor subsystems and allowedChildren."""
    inherited = []
    current_dir = subsystem.path.parent
    
    # Walk up the directory tree to find all parents with dependencies.json
    # Stop at src/ directory level
    src_dir = Path("src")
    while (current_dir and current_dir != src_dir and 
           current_dir != Path(".") and current_dir != Path("/")):
        deps_file = current_dir / "dependencies.json"
        
        if deps_file.exists():
            # Add the ancestor subsystem itself (automatic inheritance)
            ancestor_abs_path = f"~/{current_dir.relative_to(Path('src'))}"
            inherited.append(ancestor_abs_path)
            
            # Also inherit allowedChildren from ancestors
            deps = file_cache.load_dependencies_json(deps_file)
            allowed_children = deps.get("allowedChildren", [])
            inherited.extend(allowed_children)
        
        parent = current_dir.parent
        if parent == current_dir:  # Reached root
            break
        current_dir = parent
    
    return inherited


def get_ancestor_subsystems(subsystem: SubsystemInfo, file_cache) -> List[str]:
    """Get list of ancestor subsystem paths (without allowedChildren)."""
    ancestors = []
    current_dir = subsystem.path.parent
    
    # Walk up the directory tree to find all parents with dependencies.json
    src_dir = Path("src")
    while (current_dir and current_dir != src_dir and 
           current_dir != Path(".") and current_dir != Path("/")):
        deps_file = current_dir / "dependencies.json"
        
        if deps_file.exists():
            ancestor_abs_path = f"~/{current_dir.relative_to(Path('src'))}"
            ancestors.append(ancestor_abs_path)
        
        parent = current_dir.parent
        if parent == current_dir:  # Reached root
            break
        current_dir = parent
    
    return ancestors


def find_redundant_ancestor_declarations(subsystem: SubsystemInfo, file_cache) -> List[str]:
    """Find explicitly declared ancestors that are redundant (auto-inherited)."""
    ancestor_paths = get_ancestor_subsystems(subsystem, file_cache)
    allowed_deps = subsystem.dependencies.get("allowed", [])
    
    redundant = []
    for allowed_dep in allowed_deps:
        if allowed_dep in ancestor_paths:
            redundant.append(allowed_dep)
    
    return redundant


def is_child_of_subsystem(file_path: Path, parent_subsystem: SubsystemInfo, 
                         subsystem_cache: dict) -> bool:
    """Check if a file is in a child subsystem of the given parent."""
    for child_subsystem in subsystem_cache.values():
        if child_subsystem.parent_path == parent_subsystem.path:
            if str(child_subsystem.path) in str(file_path):
                return True
    return False


def is_same_domain_hierarchical_import(import_path: str, subsystem_path: Path) -> bool:
    """Check if import is a hierarchical import within the same domain."""
    if not import_path.startswith("~/lib/domains/"):
        return False
        
    # Extract domain from import path: ~/lib/domains/DOMAIN/...
    import_parts = import_path.split('/')
    if len(import_parts) < 4:
        return False
    import_domain = import_parts[3]  # domains/DOMAIN
    
    # Extract domain from subsystem path
    subsystem_str = str(subsystem_path)
    if "/lib/domains/" not in subsystem_str:
        return False
        
    subsystem_parts = subsystem_str.split('/lib/domains/')[-1].split('/')
    subsystem_domain = subsystem_parts[0]
    
    # Same domain = hierarchical import allowed
    return import_domain == subsystem_domain


def import_goes_into_subsystem(import_path: str) -> bool:
    """Check if an import path goes into a declared subsystem (bypassing its interface)."""
    if not import_path.startswith("~/"):
        return False
    
    # Convert to file system path
    fs_path = Path("src") / import_path[2:]
    
    # Walk up the path to find if we're importing INTO a subsystem
    current = fs_path
    while current and current != Path("src") and current != Path("."):
        if (current / "dependencies.json").exists():
            # This directory is a subsystem
            subsystem_abs_path = f"~/{current.relative_to(Path('src'))}"
            
            # If we're importing deeper than the subsystem root, it's going INTO the subsystem
            if (import_path.startswith(f"{subsystem_abs_path}/") and 
                import_path != subsystem_abs_path):
                return True
            break
        current = current.parent
    
    return False


def is_import_allowed_by_set(import_path: str, allowed_set: Set[str], 
                            subsystem_path: Path) -> bool:
    """Check if import is allowed by a set of allowed dependencies with proper hierarchical logic."""
    # Convert subsystem_path to absolute path format for internal import checking
    subsystem_abs_path = f"~/{subsystem_path.relative_to(Path('src'))}"
    
    # Allow internal imports within the same subsystem
    if (import_path.startswith(f"{subsystem_abs_path}/") or 
        import_path == subsystem_abs_path):
        return True
    
    # Always allow domain utils imports (implicitly allowed)
    if "/lib/domains/" in import_path and "/utils" in import_path:
        # Check if it's a domain utils import: ~/lib/domains/{domain}/utils or ~/lib/domains/{domain}/utils/*
        import re
        utils_pattern = r"~/lib/domains/[^/]+/utils(?:/.*)?$"
        if re.match(utils_pattern, import_path):
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
        
        if (import_path.startswith(f"{allowed_dep_normalized}/") or 
            (allowed_dep.endswith('/') and import_path.startswith(allowed_dep))):
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
            
            # CRITICAL: If trying to import INTO a declared subsystem, must use subsystem interface
            # Even with broad permissions, subsystem boundaries are protected
            # BUT: Allow imports within the same domain hierarchy AND within current allowed hierarchy
            if import_goes_into_subsystem(import_path):
                # Allow if it's within the current subsystem's hierarchy
                if import_path.startswith(f"{subsystem_abs_path}/"):
                    # This is within our current subsystem, allow it
                    pass
                # Allow if both the import target and current subsystem are within the same allowed hierarchy
                elif import_path.startswith(f"{allowed_dep_normalized}/") and subsystem_abs_path.startswith(f"{allowed_dep_normalized}/"):
                    # Both are within the same allowed parent hierarchy, allow it
                    pass
                # Check if this is a cross-domain import (not allowed)
                # or same-domain hierarchical import (allowed)
                elif not is_same_domain_hierarchical_import(import_path, subsystem_path):
                    continue  # Blocked: must use subsystem interface
            
            # If child is a subsystem (has dependencies.json), require explicit permission  
            # BUT only for grandchildren, not direct children
            if (potential_subsystem_path / "dependencies.json").exists():
                # Check if this is a direct child or a deeper nesting
                slash_count = child_path.count('/')
                if slash_count > 0:  # This is a grandchild or deeper, block it
                    continue  # Child is subsystem, needs explicit permission
            
            # Otherwise, hierarchy allows it
            return True
    
    return False