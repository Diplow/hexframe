#!/usr/bin/env python3
"""
Domain-specific architecture rules.

Handles checking domain structure and import restrictions.
"""

from pathlib import Path
from typing import List

from ..models import ArchError, ErrorType, RecommendationType
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
        """Check domain service import restrictions with refined rules."""
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
            errors.extend(self._check_refined_service_import_violations(service_file))
        
        # Check cross-domain imports (no domain should import other domain services/non-utils)
        errors.extend(self._check_cross_domain_violations())
        
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
                    recommendation=f"Create {services_dir}/dependencies.json file",
                    recommendation_type=RecommendationType.CREATE_DEPENDENCIES_JSON
                ))
            
            # Services must be exposed in services/index.ts
            if not (services_dir / "index.ts").exists():
                errors.append(ArchError.create_error(
                    message=f"❌ {services_dir} missing index.ts to expose services",
                    error_type=ErrorType.DOMAIN_STRUCTURE,
                    subsystem=str(services_dir),
                    recommendation=f"Create {services_dir}/index.ts file to reexport service modules",
                    recommendation_type=RecommendationType.CREATE_SUBSYSTEM_INDEX
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
                    recommendation=f"Create {infra_dir}/dependencies.json file",
                    recommendation_type=RecommendationType.CREATE_DEPENDENCIES_JSON
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
                recommendation=f"Create {utils_dir}/index.ts file to reexport utility modules",
                recommendation_type=RecommendationType.CREATE_SUBSYSTEM_INDEX
            ))
        
        return errors
    
    def _check_refined_service_import_violations(self, service_file: Path) -> List[ArchError]:
        """Check service imports against refined domain rules."""
        errors = []
        
        # Extract domain name and import path for this service file
        domain_name = service_file.parts[-3]  # e.g., 'iam' from 'lib/domains/iam/services/...'
        service_import_path = f"~/{service_file.relative_to(Path('src'))}"
        service_import_path = service_import_path.replace(".ts", "")
        
        typescript_files = find_typescript_files(self.path_helper.target_path)
        
        # Find files that import this service
        for ts_file in typescript_files:
            # Skip the service file itself
            if ts_file == service_file:
                continue
            
            # Skip API/server files (always allowed)
            file_str = str(ts_file)
            if "/api/" in file_str or "/server/" in file_str:
                continue
            
            content = self.file_cache.get_file_info(ts_file).content
            if not content:
                continue
            
            # Check if this file imports this service
            import_patterns = [
                f"from '{service_import_path}'",
                f"from \"{service_import_path}\"",
                # Also check if importing from the services index that reexports this service
                f"from '~/lib/domains/{domain_name}/services'",
                f"from \"~/lib/domains/{domain_name}/services\""
            ]
            
            service_imported = any(pattern in content for pattern in import_patterns)
            
            if service_imported:
                # Apply refined rules based on importing file location
                file_path = ts_file.relative_to(self.path_helper.target_path)
                file_path_str = str(file_path)
                
                # Rule 1: {domain}/index.ts can import same domain services - ALLOWED
                if file_path_str == f"lib/domains/{domain_name}/index.ts":
                    continue
                
                # Rule 2: {domain}/services/* can import same domain services - ALLOWED  
                if f"lib/domains/{domain_name}/services" in file_path_str:
                    continue
                
                # Rule 3 & 4: Everything else in the domain CANNOT import services - ERROR
                if f"lib/domains/{domain_name}/" in file_path_str:
                    service_name = service_file.stem
                    recommendation = f"Remove service import from {file_path} - only domain index.ts and services/* can import domain services"
                    errors.append(ArchError.create_error(
                        message=(f"❌ Service {service_name} imported by restricted file:\n"
                               f"  🔸 {file_path}\n"
                               f"     → Only domain index.ts and services/* can import domain services"),
                        error_type=ErrorType.DOMAIN_IMPORT,
                        subsystem=str(service_file.parent),
                        file_path=str(file_path),
                        recommendation=recommendation,
                        recommendation_type=RecommendationType.FIX_DOMAIN_SERVICE_IMPORT
                    ))
                else:
                    # Outside domain structure - should go through API
                    service_name = service_file.stem
                    recommendation = f"Move service import from {file_path} to API/server code, or use domain public interface"
                    errors.append(ArchError.create_error(
                        message=(f"❌ Service {service_name} imported by non-domain file:\n"
                               f"  🔸 {file_path}\n"
                               f"     → Services should only be used through API/server layer"),
                        error_type=ErrorType.DOMAIN_IMPORT,
                        subsystem=str(service_file.parent),
                        file_path=str(file_path),
                        recommendation=recommendation,
                        recommendation_type=RecommendationType.MOVE_SERVICE_TO_API
                    ))
        
        return errors
    
    def _check_cross_domain_violations(self) -> List[ArchError]:
        """Check that domains don't import from other domains (except utils)."""
        errors = []
        
        domains_path = self.path_helper.target_path / "lib" / "domains"
        if not domains_path.exists():
            return errors
        
        # Get all domain directories
        domain_dirs = [d for d in domains_path.iterdir() if d.is_dir()]
        
        for domain_dir in domain_dirs:
            domain_name = domain_dir.name
            
            # Find all TypeScript files in this domain
            for ts_file in domain_dir.rglob("*.ts"):
                content = self.file_cache.get_file_info(ts_file).content
                if not content:
                    continue
                
                # Check for imports from other domains
                for other_domain_dir in domain_dirs:
                    if other_domain_dir == domain_dir:
                        continue  # Skip same domain
                    
                    other_domain_name = other_domain_dir.name
                    
                    # Look for imports from other domains (but allow utils)
                    forbidden_patterns = [
                        f"from '~/lib/domains/{other_domain_name}/services",
                        f"from \"~/lib/domains/{other_domain_name}/services",
                        f"from '~/lib/domains/{other_domain_name}/infrastructure",
                        f"from \"~/lib/domains/{other_domain_name}/infrastructure",
                        f"from '~/lib/domains/{other_domain_name}/_",
                        f"from \"~/lib/domains/{other_domain_name}/_",
                        f"from '~/lib/domains/{other_domain_name}/index",
                        f"from \"~/lib/domains/{other_domain_name}/index",
                    ]
                    
                    for pattern in forbidden_patterns:
                        if pattern in content:
                            file_path = ts_file.relative_to(self.path_helper.target_path)
                            recommendation = f"Remove cross-domain import from {file_path} - domains should only import other domain utils, not services/infrastructure"
                            errors.append(ArchError.create_error(
                                message=(f"❌ Cross-domain import violation:\n"
                                       f"  🔸 {file_path}\n"
                                       f"     → Domain '{domain_name}' importing from domain '{other_domain_name}'\n"
                                       f"     → Use API orchestration instead of direct domain-to-domain calls"),
                                error_type=ErrorType.DOMAIN_IMPORT,
                                subsystem=str(ts_file.parent),
                                file_path=str(file_path),
                                recommendation=recommendation,
                                recommendation_type=RecommendationType.REMOVE_CROSS_DOMAIN_IMPORT
                            ))
                            break  # Only report first violation per file
        
        return errors