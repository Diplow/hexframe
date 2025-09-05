#!/usr/bin/env python3
"""
Domain-specific architecture rules.

Handles checking domain structure and import restrictions.
"""

from pathlib import Path
from typing import List

from ..models import ArchError, ErrorType
from ..utils.file_utils import find_typescript_files
from ..utils.path_utils import PathHelper


class DomainRuleChecker:
    """Checker for domain-specific architecture rules."""
    
    def __init__(self, path_helper: PathHelper, file_cache):
        self.path_helper = path_helper
        self.file_cache = file_cache
    
    def check_domain_structure(self) -> List[ArchError]:
        """Check domain-specific structure requirements."""
        errors = []
        # print("Checking domain structure...")
        
        domains_path = self.path_helper.target_path / "lib" / "domains"
        if not domains_path.exists():
            return errors
        
        for domain_dir in domains_path.iterdir():
            if not domain_dir.is_dir():
                continue
            
            # Check services structure
            errors.extend(self._check_services_structure(domain_dir))
            
            # Check infrastructure structure
            errors.extend(self._check_infrastructure_structure(domain_dir))
            
            # Check utils structure  
            errors.extend(self._check_utils_structure(domain_dir))
        
        return errors
    
    def check_domain_import_restrictions(self) -> List[ArchError]:
        """Check that domain services are only imported by API/server code."""
        errors = []
        # print("Checking domain import restrictions...")
        
        domains_path = self.path_helper.target_path / "lib" / "domains"
        if not domains_path.exists():
            return errors
        
        # Find all service files
        service_files = []
        for service_file in domains_path.rglob("services/*.ts"):
            if service_file.name != "index.ts":
                service_files.append(service_file)
        
        # Check each service file for improper imports
        for service_file in service_files:
            errors.extend(self._check_service_import_violations(service_file))
        
        return errors
    
    def _check_services_structure(self, domain_dir: Path) -> List[ArchError]:
        """Check services directory structure within a domain."""
        errors = []
        services_dir = domain_dir / "services"
        
        if services_dir.exists():
            # Services must have dependencies.json
            if not (services_dir / "dependencies.json").exists():
                errors.append(ArchError.create_error(
                    message=f"❌ {services_dir} needs dependencies.json",
                    error_type=ErrorType.DOMAIN_STRUCTURE,
                    subsystem=str(services_dir),
                    recommendation=f"Create {services_dir}/dependencies.json file"
                ))
            
            # Services must be exposed in services/index.ts
            if not (services_dir / "index.ts").exists():
                errors.append(ArchError.create_error(
                    message=f"❌ {services_dir} missing index.ts to expose services",
                    error_type=ErrorType.DOMAIN_STRUCTURE,
                    subsystem=str(services_dir),
                    recommendation=f"Create {services_dir}/index.ts file to reexport service modules"
                ))
        
        return errors
    
    def _check_infrastructure_structure(self, domain_dir: Path) -> List[ArchError]:
        """Check infrastructure directory structure within a domain."""
        errors = []
        
        infra_dirs = list(domain_dir.rglob("infrastructure/*"))
        for infra_dir in infra_dirs:
            if infra_dir.is_dir() and not (infra_dir / "dependencies.json").exists():
                errors.append(ArchError.create_error(
                    message=f"❌ Infrastructure {infra_dir} needs dependencies.json",
                    error_type=ErrorType.DOMAIN_STRUCTURE,
                    subsystem=str(infra_dir),
                    recommendation=f"Create {infra_dir}/dependencies.json file"
                ))
        
        return errors
    
    def _check_utils_structure(self, domain_dir: Path) -> List[ArchError]:
        """Check utils directory structure within a domain."""
        errors = []
        utils_dir = domain_dir / "utils"
        
        if utils_dir.exists() and not (utils_dir / "index.ts").exists():
            errors.append(ArchError.create_error(
                message=f"❌ {utils_dir} missing index.ts to expose utilities",
                error_type=ErrorType.DOMAIN_STRUCTURE,
                subsystem=str(utils_dir),
                recommendation=f"Create {utils_dir}/index.ts file to reexport utility modules"
            ))
        
        return errors
    
    def _check_service_import_violations(self, service_file: Path) -> List[ArchError]:
        """Check if a service is improperly imported by non-API code."""
        errors = []
        
        # Create the exact import path for this service file
        service_import_path = f"~/{service_file.relative_to(Path('src'))}"
        service_import_path = service_import_path.replace(".ts", "")
        
        typescript_files = find_typescript_files(self.path_helper.target_path)
        
        # Find files that import this service
        for ts_file in typescript_files:
            # Skip the service file itself
            if ts_file == service_file:
                continue
            
            # Check if it's an API/server file (allowed)
            file_str = str(ts_file)
            if "/api/" in file_str or "/server/" in file_str:
                continue
            
            content = self.file_cache.get_file_info(ts_file).content
            if not content:
                continue
            
            # Check if this file specifically imports THIS service file
            # Look for exact import path matches
            import_patterns = [
                f"from '{service_import_path}'",
                f"from \"{service_import_path}\"",
                # Also check if importing from the services index that reexports this service
                f"from '~/lib/domains/{service_file.parts[-3]}/services'",
                f"from \"~/lib/domains/{service_file.parts[-3]}/services\""
            ]
            
            service_imported = any(pattern in content for pattern in import_patterns)
            
            if service_imported:
                service_name = service_file.stem
                recommendation = f"Move service import from {ts_file.relative_to(self.path_helper.target_path)} to API/server code, or refactor service logic to a utility module"
                errors.append(ArchError.create_error(
                    message=(f"❌ Service {service_name} imported by non-API file:\n"
                           f"  🔸 {ts_file.relative_to(self.path_helper.target_path)}\n"
                           f"     → Services can only be imported by API/server code"),
                    error_type=ErrorType.DOMAIN_IMPORT,
                    subsystem=str(service_file.parent),
                    file_path=str(ts_file.relative_to(self.path_helper.target_path)),
                    recommendation=recommendation
                ))
        
        return errors