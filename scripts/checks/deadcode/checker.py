#!/usr/bin/env python3
"""
Dead code checking logic.

Detects unused exports, imports, functions, and variables in TypeScript/JavaScript codebases.
"""

import os
import re
import time
from pathlib import Path
from typing import Dict, List, Set, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict

from .models import (
    CheckResults, DeadCodeIssue, DeadCodeType, Severity,
    Export, Import, Symbol, FileAnalysis
)


class DeadCodeChecker:
    """Detects dead code in TypeScript/JavaScript codebases."""
    
    def __init__(self, target_path: str = "src"):
        self.target_path = Path(target_path)
        self.file_cache: Dict[Path, FileAnalysis] = {}
        self.export_map: Dict[str, List[Export]] = defaultdict(list)
        self.import_map: Dict[str, List[Import]] = defaultdict(list)
        self.exceptions: Set[str] = set()
        
        self._load_exceptions()
    
    def _load_exceptions(self) -> None:
        """Load dead code exceptions from .dead-code-ignore file."""
        ignore_file = Path(".dead-code-ignore")
        if ignore_file.exists():
            with open(ignore_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        self.exceptions.add(line)
        else:
            # Default exceptions
            self.exceptions.update([
                "src/env.mjs",  # Environment configuration
                "**/__tests__/**",  # Test files
                "**/*.test.ts",  # Test files
                "**/*.test.tsx",  # Test files
                "**/*.spec.ts",  # Test files
                "**/*.spec.tsx",  # Test files
                "**/*.stories.ts",  # Storybook files
                "**/*.stories.tsx",  # Storybook files
                "**/types.ts",  # Type definitions often have unused exports
                "**/index.ts",  # Index files are barrel exports
            ])
    
    def _is_exception(self, file_path: Path) -> bool:
        """Check if file matches any exception pattern."""
        file_str = str(file_path)
        return any(
            self._matches_pattern(file_str, pattern) 
            for pattern in self.exceptions
        )
    
    def _matches_pattern(self, file_str: str, pattern: str) -> bool:
        """Check if file matches a glob-like pattern."""
        if "**" in pattern:
            # Convert ** pattern to regex
            regex_pattern = pattern.replace("**", ".*").replace("*", "[^/]*")
            return bool(re.search(regex_pattern, file_str))
        elif "*" in pattern:
            regex_pattern = pattern.replace("*", "[^/]*")
            return bool(re.search(regex_pattern, file_str))
        else:
            return pattern in file_str
    
    def _is_test_file(self, file_path: Path) -> bool:
        """Check if file is a test file."""
        file_str = str(file_path)
        return any(pattern in file_str for pattern in [
            ".test.", ".spec.", "__tests__/", ".stories."
        ])
    
    def _find_typescript_files(self) -> List[Path]:
        """Find all TypeScript files in target path (excluding test files)."""
        files = []
        for pattern in ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]:
            files.extend(self.target_path.glob(pattern))
        
        # Filter out node_modules and test files
        return [
            f for f in files 
            if "node_modules" not in str(f) and not self._is_test_file(f)
        ]

    def _find_all_typescript_files(self) -> List[Path]:
        """Find all TypeScript files including test files (for import analysis)."""
        files = []
        for pattern in ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]:
            files.extend(self.target_path.glob(pattern))
        
        # Only filter out node_modules
        return [
            f for f in files 
            if "node_modules" not in str(f)
        ]
    
    def _extract_exports(self, content: str, file_path: Path) -> List[Export]:
        """Extract export statements from file content."""
        exports = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            line = line.strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('//') or line.startswith('/*'):
                continue
            
            # Named exports: export { foo, bar }
            named_export_match = re.match(r'export\s*\{\s*([^}]+)\s*\}(?:\s*from\s*["\']([^"\']+)["\'])?', line)
            if named_export_match:
                exports_str = named_export_match.group(1)
                from_path = named_export_match.group(2)
                is_reexport = from_path is not None
                
                # Parse individual exports
                for export_name in exports_str.split(','):
                    export_name = export_name.strip()
                    # Handle 'as' aliases: foo as bar
                    if ' as ' in export_name:
                        export_name = export_name.split(' as ')[-1].strip()
                    
                    exports.append(Export(
                        name=export_name,
                        file_path=file_path,
                        line_number=i,
                        export_type='named',
                        is_reexport=is_reexport
                    ))
                continue
            
            # Default export
            if re.match(r'export\s+default\b', line):
                # Try to extract name from default export
                name_match = re.search(r'export\s+default\s+(function\s+)?(\w+)', line)
                name = name_match.group(2) if name_match else 'default'
                
                exports.append(Export(
                    name=name,
                    file_path=file_path,
                    line_number=i,
                    export_type='default'
                ))
                continue
            
            # Direct exports: export const/function/class/interface/type
            direct_export_match = re.match(r'export\s+(const|function|class|interface|type)\s+(\w+)', line)
            if direct_export_match:
                export_type = direct_export_match.group(1)
                name = direct_export_match.group(2)
                
                exports.append(Export(
                    name=name,
                    file_path=file_path,
                    line_number=i,
                    export_type=export_type
                ))
                continue
            
            # Type exports: export type { ... }
            type_export_match = re.match(r'export\s+type\s*\{\s*([^}]+)\s*\}(?:\s*from\s*["\']([^"\']+)["\'])?', line)
            if type_export_match:
                exports_str = type_export_match.group(1)
                from_path = type_export_match.group(2)
                is_reexport = from_path is not None
                
                for export_name in exports_str.split(','):
                    export_name = export_name.strip()
                    if ' as ' in export_name:
                        export_name = export_name.split(' as ')[-1].strip()
                    
                    exports.append(Export(
                        name=export_name,
                        file_path=file_path,
                        line_number=i,
                        export_type='type',
                        is_reexport=is_reexport
                    ))
        
        return exports
    
    def _extract_imports(self, content: str, file_path: Path) -> List[Import]:
        """Extract import statements from file content."""
        imports = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            line = line.strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('//') or line.startswith('/*'):
                continue
            
            # Default import: import foo from 'bar'
            default_match = re.match(r'import\s+(\w+)\s+from\s+["\']([^"\']+)["\']', line)
            if default_match and '{' not in line:
                name = default_match.group(1)
                from_path = default_match.group(2)
                
                imports.append(Import(
                    name=name,
                    from_path=from_path,
                    file_path=file_path,
                    line_number=i,
                    import_type='default'
                ))
                continue
            
            # Named imports: import { foo, bar } from 'baz'
            named_match = re.match(r'import\s*\{\s*([^}]+)\s*\}\s*from\s*["\']([^"\']+)["\']', line)
            if named_match:
                imports_str = named_match.group(1)
                from_path = named_match.group(2)
                
                for import_name in imports_str.split(','):
                    import_name = import_name.strip()
                    # Handle 'as' aliases: foo as bar
                    if ' as ' in import_name:
                        original_name = import_name.split(' as ')[0].strip()
                        alias_name = import_name.split(' as ')[1].strip()
                        import_name = alias_name  # We care about the alias
                    
                    imports.append(Import(
                        name=import_name,
                        from_path=from_path,
                        file_path=file_path,
                        line_number=i,
                        import_type='named'
                    ))
                continue
            
            # Type imports: import type { ... } from '...'
            type_match = re.match(r'import\s+type\s*\{\s*([^}]+)\s*\}\s*from\s*["\']([^"\']+)["\']', line)
            if type_match:
                imports_str = type_match.group(1)
                from_path = type_match.group(2)
                
                for import_name in imports_str.split(','):
                    import_name = import_name.strip()
                    if ' as ' in import_name:
                        import_name = import_name.split(' as ')[-1].strip()
                    
                    imports.append(Import(
                        name=import_name,
                        from_path=from_path,
                        file_path=file_path,
                        line_number=i,
                        import_type='type'
                    ))
                continue
            
            # Namespace import: import * as foo from 'bar'
            namespace_match = re.match(r'import\s*\*\s*as\s+(\w+)\s+from\s+["\']([^"\']+)["\']', line)
            if namespace_match:
                name = namespace_match.group(1)
                from_path = namespace_match.group(2)
                
                imports.append(Import(
                    name=name,
                    from_path=from_path,
                    file_path=file_path,
                    line_number=i,
                    import_type='namespace'
                ))
        
        return imports
    
    def _extract_symbols(self, content: str, file_path: Path) -> List[Symbol]:
        """Extract local symbols (functions, variables, etc.) from file content."""
        symbols = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            line = line.strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('//') or line.startswith('/*'):
                continue
            
            # Function declarations
            func_match = re.match(r'(?:export\s+)?function\s+(\w+)', line)
            if func_match:
                name = func_match.group(1)
                is_exported = line.startswith('export')
                
                symbols.append(Symbol(
                    name=name,
                    file_path=file_path,
                    line_number=i,
                    symbol_type='function',
                    is_exported=is_exported
                ))
                continue
            
            # Arrow function assignments
            arrow_match = re.match(r'(?:export\s+)?const\s+(\w+)\s*=\s*\(.*\)\s*=>', line)
            if arrow_match:
                name = arrow_match.group(1)
                is_exported = line.startswith('export')
                
                symbols.append(Symbol(
                    name=name,
                    file_path=file_path,
                    line_number=i,
                    symbol_type='function',
                    is_exported=is_exported
                ))
                continue
            
            # Const declarations
            const_match = re.match(r'(?:export\s+)?const\s+(\w+)', line)
            if const_match:
                name = const_match.group(1)
                is_exported = line.startswith('export')
                
                symbols.append(Symbol(
                    name=name,
                    file_path=file_path,
                    line_number=i,
                    symbol_type='const',
                    is_exported=is_exported
                ))
                continue
            
            # Class declarations
            class_match = re.match(r'(?:export\s+)?class\s+(\w+)', line)
            if class_match:
                name = class_match.group(1)
                is_exported = line.startswith('export')
                
                symbols.append(Symbol(
                    name=name,
                    file_path=file_path,
                    line_number=i,
                    symbol_type='class',
                    is_exported=is_exported
                ))
                continue
            
            # Interface declarations
            interface_match = re.match(r'(?:export\s+)?interface\s+(\w+)', line)
            if interface_match:
                name = interface_match.group(1)
                is_exported = line.startswith('export')
                
                symbols.append(Symbol(
                    name=name,
                    file_path=file_path,
                    line_number=i,
                    symbol_type='interface',
                    is_exported=is_exported
                ))
                continue
            
            # Type declarations
            type_match = re.match(r'(?:export\s+)?type\s+(\w+)', line)
            if type_match:
                name = type_match.group(1)
                is_exported = line.startswith('export')
                
                symbols.append(Symbol(
                    name=name,
                    file_path=file_path,
                    line_number=i,
                    symbol_type='type',
                    is_exported=is_exported
                ))
        
        return symbols
    
    def _find_symbol_usage(self, content: str) -> Set[str]:
        """Find all symbol usage in file content."""
        used_symbols = set()
        
        # Find all identifiers (simplified approach)
        # This is a basic implementation - in practice, you'd want AST parsing
        identifiers = re.findall(r'\b[a-zA-Z_$][a-zA-Z0-9_$]*\b', content)
        
        # Filter out keywords and common tokens
        keywords = {
            'import', 'export', 'from', 'const', 'let', 'var', 'function', 'class',
            'interface', 'type', 'if', 'else', 'for', 'while', 'return', 'true',
            'false', 'null', 'undefined', 'string', 'number', 'boolean', 'object'
        }
        
        for identifier in identifiers:
            if identifier not in keywords:
                used_symbols.add(identifier)
        
        return used_symbols
    
    def _analyze_file(self, file_path: Path) -> FileAnalysis:
        """Analyze a single TypeScript file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            exports = self._extract_exports(content, file_path)
            imports = self._extract_imports(content, file_path)
            symbols = self._extract_symbols(content, file_path)
            used_symbols = self._find_symbol_usage(content)
            
            analysis = FileAnalysis(
                path=file_path,
                exports=exports,
                imports=imports,
                symbols=symbols,
                used_symbols=used_symbols,
                content=content,
                lines=len(content.split('\n'))
            )
            
            return analysis
            
        except (UnicodeDecodeError, OSError) as e:
            return FileAnalysis(path=file_path)
    
    def _resolve_import_path(self, import_path: str, from_file: Path) -> Optional[Path]:
        """Resolve relative import path to absolute file path."""
        if import_path.startswith('.'):
            # Relative import
            base_dir = from_file.parent
            resolved_path = (base_dir / import_path).resolve()
            
            # Try different extensions
            for ext in ['.ts', '.tsx', '.js', '.jsx']:
                if (resolved_path.parent / f"{resolved_path.name}{ext}").exists():
                    return resolved_path.parent / f"{resolved_path.name}{ext}"
            
            # Try index files
            if (resolved_path / "index.ts").exists():
                return resolved_path / "index.ts"
            if (resolved_path / "index.tsx").exists():
                return resolved_path / "index.tsx"
        
        elif import_path.startswith('~/'):
            # Absolute import from src
            src_path = Path('src') / import_path[2:]
            
            # Try different extensions
            for ext in ['.ts', '.tsx', '.js', '.jsx']:
                if (src_path.parent / f"{src_path.name}{ext}").exists():
                    return src_path.parent / f"{src_path.name}{ext}"
            
            # Try index files
            if (src_path / "index.ts").exists():
                return src_path / "index.ts"
            if (src_path / "index.tsx").exists():
                return src_path / "index.tsx"
        
        return None
    
    def _is_symbol_imported_elsewhere(self, symbol_key: str) -> bool:
        """Check if a symbol is imported in other files."""
        file_path_str, symbol_name = symbol_key.split(':', 1)
        file_path = Path(file_path_str)
        
        for file_analysis in self.file_cache.values():
            for imp in file_analysis.imports:
                resolved_path = self._resolve_import_path(imp.from_path, imp.file_path)
                if resolved_path and resolved_path == file_path:
                    if imp.name == symbol_name or (imp.import_type == 'default' and symbol_name == 'default'):
                        return True
        return False
    
    def _check_unused_exports(self, results: CheckResults) -> None:
        """Check for exports that are not imported elsewhere."""
        # Build export map from analyzed files
        all_exports = {}
        for file_analysis in self.file_cache.values():
            for export in file_analysis.exports:
                key = f"{export.file_path}:{export.name}"
                all_exports[key] = export
        
        # Build import map from ALL files (including test files)
        imported_exports = set()
        
        # First, add imports from already analyzed files
        for file_analysis in self.file_cache.values():
            for imp in file_analysis.imports:
                resolved_path = self._resolve_import_path(imp.from_path, imp.file_path)
                if resolved_path:
                    key = f"{resolved_path}:{imp.name}"
                    imported_exports.add(key)
                    
                    # Handle default imports
                    if imp.import_type == 'default':
                        default_key = f"{resolved_path}:default"
                        imported_exports.add(default_key)
        
        # Now analyze test files for their imports (but don't cache them)
        all_files = self._find_all_typescript_files()
        test_files = [f for f in all_files if self._is_test_file(f) and not self._is_exception(f)]
        
        for test_file in test_files:
            try:
                with open(test_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Extract imports from test files
                test_imports = self._extract_imports(content, test_file)
                for imp in test_imports:
                    resolved_path = self._resolve_import_path(imp.from_path, imp.file_path)
                    if resolved_path:
                        key = f"{resolved_path}:{imp.name}"
                        imported_exports.add(key)
                        
                        # Handle default imports
                        if imp.import_type == 'default':
                            default_key = f"{resolved_path}:default"
                            imported_exports.add(default_key)
            except Exception:
                # Skip files that can't be read
                continue
        
        # Find exports that are not imported elsewhere
        for key, export in all_exports.items():
            if key not in imported_exports and not export.is_reexport:
                # Skip certain patterns that are commonly intentionally unused
                if export.name in ['default'] and 'page' in str(export.file_path):
                    continue  # Next.js page components
                if export.name.endswith('Props') or export.name.endswith('Config'):
                    continue  # Type definitions
                
                # Check if this export is used internally
                file_analysis = self.file_cache[export.file_path]
                is_used_internally = export.name in file_analysis.used_symbols
                relative_path = str(export.file_path.relative_to(self.target_path))
                
                if is_used_internally:
                    # Used internally but not imported elsewhere - warning to remove export
                    issue = DeadCodeIssue.create_warning(
                        message=f"Unused export '{export.name}' (used internally)",
                        issue_type=DeadCodeType.UNUSED_EXPORT,
                        file_path=relative_path,
                        line_number=export.line_number,
                        symbol_name=export.name,
                        recommendation=f"Remove export from '{export.name}' since it's only used internally, or confirm it's needed for external consumption"
                    )
                    results.add_issue(issue)
                else:
                    # Not used internally either - error (completely unused export)
                    issue = DeadCodeIssue.create_error(
                        message=f"Unused export '{export.name}' (not used anywhere)",
                        issue_type=DeadCodeType.UNUSED_EXPORT,
                        file_path=relative_path,
                        line_number=export.line_number,
                        symbol_name=export.name,
                        recommendation=f"Remove unused export '{export.name}' - it's not used anywhere"
                    )
                    results.add_issue(issue)
    
    def _check_unused_imports(self, results: CheckResults) -> None:
        """Check for unused imports within files."""
        for file_analysis in self.file_cache.values():
            for imp in file_analysis.imports:
                if imp.name not in file_analysis.used_symbols:
                    # Check if it's a type-only import (often intentionally unused)
                    if imp.import_type == 'type':
                        continue
                    
                    relative_path = str(imp.file_path.relative_to(self.target_path))
                    issue = DeadCodeIssue.create_warning(
                        message=f"Unused import '{imp.name}'",
                        issue_type=DeadCodeType.UNUSED_IMPORT,
                        file_path=relative_path,
                        line_number=imp.line_number,
                        symbol_name=imp.name,
                        recommendation=f"Remove unused import '{imp.name}' to clean up the file"
                    )
                    results.add_issue(issue)
    
    def _check_unused_local_symbols(self, results: CheckResults) -> None:
        """Check for unused local symbols within files."""
        for file_analysis in self.file_cache.values():
            for symbol in file_analysis.symbols:
                # Check if symbol is not used anywhere in the file
                if symbol.name not in file_analysis.used_symbols:
                    # Skip certain patterns
                    if symbol.name.startswith('_'):  # Intentionally unused (convention)
                        continue
                    if symbol.symbol_type in ['interface', 'type']:  # Types are often defined but not used locally
                        continue
                    
                    relative_path = str(symbol.file_path.relative_to(self.target_path))
                    
                    # Not exported and not used internally - error (truly dead code)
                    if not symbol.is_exported:
                        issue = DeadCodeIssue.create_error(
                            message=f"Unused {symbol.symbol_type} '{symbol.name}'",
                            issue_type=DeadCodeType.UNUSED_SYMBOL,
                            file_path=relative_path,
                            line_number=symbol.line_number,
                            symbol_name=symbol.name,
                            recommendation=f"Remove unused {symbol.symbol_type} '{symbol.name}' or prefix with '_' if intentionally unused"
                        )
                        results.add_issue(issue)
                    # Exported symbols that are unused internally are handled in _check_unused_exports
    
    def run_all_checks(self) -> CheckResults:
        """Run all dead code checks and return results."""
        start_time = time.time()
        results = CheckResults(target_path=str(self.target_path))
        
        # Find and analyze all TypeScript files
        ts_files = self._find_typescript_files()
        results.files_analyzed = len(ts_files)
        
        # Analyze files in parallel
        with ThreadPoolExecutor(max_workers=4) as executor:
            future_to_file = {
                executor.submit(self._analyze_file, file_path): file_path
                for file_path in ts_files
                if not self._is_exception(file_path)
            }
            
            for future in as_completed(future_to_file):
                file_path = future_to_file[future]
                analysis = future.result()
                self.file_cache[file_path] = analysis
        
        # Run dead code checks
        self._check_unused_exports(results)
        self._check_unused_imports(results)
        self._check_unused_local_symbols(results)
        
        results.execution_time = time.time() - start_time
        return results