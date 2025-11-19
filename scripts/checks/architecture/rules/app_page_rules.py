#!/usr/bin/env python3
"""
App and Page isolation rules.

Handles Next.js app directory specific rules:
- App isolation: no imports from ~/app outside of app
- Page isolation: no imports from ~/app/[page] outside that page
- Page.tsx detection: folders with page.tsx must be subsystems
"""

import re
from pathlib import Path
from typing import List

from ..models import ArchError, ErrorType, RecommendationType, SubsystemInfo
from ..utils.path_utils import PathHelper


class AppPageRuleChecker:
    """Checker for app and page isolation rules."""

    def __init__(self, path_helper: PathHelper, file_cache):
        self.path_helper = path_helper
        self.file_cache = file_cache

    def check_page_tsx_subsystems(self) -> List[ArchError]:
        """Check that direct subfolders of src/app with page.tsx are subsystems."""
        errors = []

        app_dir = self.path_helper.target_path / "app"
        if not app_dir.exists():
            return errors

        # Find all direct subfolders of src/app
        for subfolder in app_dir.iterdir():
            if not subfolder.is_dir():
                continue

            # Skip if starts with underscore (private folders) or dot
            if subfolder.name.startswith('_') or subfolder.name.startswith('.'):
                continue

            # Check if this folder or any of its subfolders has page.tsx
            has_page_tsx = self._has_page_tsx_recursive(subfolder)

            if has_page_tsx:
                # Check if it has dependencies.json (is a subsystem)
                deps_file = subfolder / "dependencies.json"
                if not deps_file.exists():
                    errors.append(ArchError.create_error(
                        message=f"❌ App subfolder with page.tsx must be a subsystem: {subfolder.relative_to(self.path_helper.target_path)}",
                        error_type=ErrorType.SUBSYSTEM_STRUCTURE,
                        subsystem=str(subfolder),
                        recommendation=f"Create {subfolder}/dependencies.json with appropriate type ('app' for root app, 'page' for pages)",
                        recommendation_type=RecommendationType.CREATE_DEPENDENCIES_JSON
                    ))

        return errors

    def check_app_isolation(self) -> List[ArchError]:
        """Check that nothing outside ~/app imports from ~/app."""
        errors = []

        app_dir = self.path_helper.target_path / "app"
        if not app_dir.exists():
            return errors

        # Check all TypeScript files, not just those in subsystems
        # This catches violations in non-subsystem directories like test-utils
        from ..utils.file_utils import find_typescript_files

        all_files = find_typescript_files(self.path_helper.target_path)

        for ts_file in all_files:
            # Skip if file is inside app directory
            try:
                ts_file.relative_to(app_dir)
                continue  # File is inside app, skip it
            except ValueError:
                pass  # File is outside app, check it

            # Check this file for app imports
            file_info = self.file_cache.get_file_info(ts_file)
            for import_path in file_info.imports:
                if import_path.startswith("~/app"):
                    # Try to find which subsystem/directory this file belongs to
                    subsystem_name = "unknown"
                    relative_path = ts_file
                    try:
                        relative_path = ts_file.relative_to(self.path_helper.target_path)
                        # Get the top-level directory (e.g., "lib", "server", "test-utils")
                        if len(relative_path.parts) > 0:
                            subsystem_name = relative_path.parts[0]
                    except ValueError:
                        pass

                    errors.append(ArchError.create_error(
                        message=(f"❌ App isolation violation in {subsystem_name}:\n"
                               f"  🔸 {relative_path}\n"
                               f"     import from '{import_path}'\n"
                               f"     → App code is isolated - move shared code to ~/lib or ~/server"),
                        error_type=ErrorType.IMPORT_BOUNDARY,
                        subsystem=str(relative_path.parent if relative_path != ts_file else ts_file.parent),
                        file_path=str(ts_file),
                        recommendation=f"Move shared code from {import_path} to ~/lib or remove this import",
                        recommendation_type=RecommendationType.MOVE_SHARED_CODE
                    ))

        return errors

    def check_page_isolation(self, subsystems: List[SubsystemInfo]) -> List[ArchError]:
        """Check that pages don't import from other pages."""
        errors = []

        # Find all page-type subsystems
        page_subsystems = {}
        for subsystem in subsystems:
            if subsystem.subsystem_type == "page":
                # Normalize path: strip trailing slashes, use forward slashes
                subsystem_path = f"~/{subsystem.path.relative_to(Path('src'))}".rstrip('/')
                page_subsystems[subsystem_path] = subsystem

        # Check each page subsystem
        for page_path, page_subsystem in page_subsystems.items():
            for file_info in page_subsystem.files:
                for import_path in file_info.imports:
                    # Normalize import path
                    normalized_import = import_path.rstrip('/')

                    # Check if importing from another page
                    for other_page_path, other_page in page_subsystems.items():
                        if other_page_path == page_path:
                            continue  # Skip self

                        # Check for path boundary: exact match or starts with path + separator
                        if (normalized_import == other_page_path or
                            normalized_import.startswith(other_page_path + "/")):
                            errors.append(ArchError.create_error(
                                message=(f"❌ Page isolation violation in {page_subsystem.name}:\n"
                                       f"  🔸 {file_info.path.relative_to(page_subsystem.path)}\n"
                                       f"     import from '{import_path}'\n"
                                       f"     → Pages should not import from other pages - move shared code to ~/lib"),
                                error_type=ErrorType.IMPORT_BOUNDARY,
                                subsystem=str(page_subsystem.path),
                                file_path=str(file_info.path),
                                recommendation=f"Move shared code from {import_path} to ~/lib or ~/app/components",
                                recommendation_type=RecommendationType.MOVE_SHARED_CODE
                            ))

        return errors

    def _has_page_tsx_recursive(self, directory: Path, max_depth: int = 3) -> bool:
        """Check if directory or any subdirectory has page.tsx (up to max_depth)."""
        def search(path: Path, current_depth: int = 0) -> bool:
            if current_depth > max_depth:
                return False

            # Check current directory
            if (path / "page.tsx").exists():
                return True

            # Check subdirectories
            try:
                for subdir in path.iterdir():
                    if subdir.is_dir() and not subdir.name.startswith('.'):
                        if search(subdir, current_depth + 1):
                            return True
            except PermissionError:
                pass

            return False

        return search(directory)
