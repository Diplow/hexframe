#!/usr/bin/env python3
"""
Dead code checking logic.

Detects unused exports, imports, functions, and variables in TypeScript/JavaScript codebases.
"""

import os
import re
import time
from pathlib import Path
from typing import Dict, List, Set, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict, deque

from .models import (
    CheckResults, DeadCodeIssue, DeadCodeType, Severity,
    FileAnalysis
)

# Import shared TypeScript parser
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from shared.typescript_parser import TypeScriptParser, Import, Export, Symbol


class DependencyGraph:
    """Tracks dependencies between symbols for transitive dead code detection."""
    
    def __init__(self):
        # symbol_key -> set of symbol_keys it depends on
        self.dependencies: Dict[str, Set[str]] = defaultdict(set)
        # symbol_key -> set of symbol_keys that depend on it
        self.dependents: Dict[str, Set[str]] = defaultdict(set)
        # Track all symbols
        self.all_symbols: Set[str] = set()
        # Track which symbols are exports
        self.exported_symbols: Set[str] = set()
        # Track dead symbols
        self.dead_symbols: Set[str] = set()
        # Track transitively dead symbols
        self.transitively_dead: Set[str] = set()
    
    def add_dependency(self, from_symbol: str, to_symbol: str) -> None:
        """Add a dependency relationship."""
        self.dependencies[from_symbol].add(to_symbol)
        self.dependents[to_symbol].add(from_symbol)
        self.all_symbols.add(from_symbol)
        self.all_symbols.add(to_symbol)
    
    def mark_as_export(self, symbol: str) -> None:
        """Mark a symbol as an export."""
        self.exported_symbols.add(symbol)
        self.all_symbols.add(symbol)
    
    def mark_as_dead(self, symbol: str) -> None:
        """Mark a symbol as dead code."""
        self.dead_symbols.add(symbol)
    
    def find_transitive_dead_code(self) -> None:
        """Find all transitively dead code."""
        # Multiple passes to find transitively dead code
        changed = True
        passes = 0
        
        while changed and passes < 10:  # Limit passes to avoid infinite loops
            changed = False
            passes += 1
            
            # Check each symbol that isn't already marked as dead
            for symbol in list(self.all_symbols):
                if symbol in self.dead_symbols or symbol in self.transitively_dead:
                    continue
                
                # Check if this symbol is only used by dead code
                dependents = self.dependents.get(symbol, set())
                
                # If it has no dependents and is an export, it might be directly dead (already handled)
                if not dependents:
                    continue
                
                # Check if ALL symbols that depend on this are dead
                all_dependents_dead = True
                for dependent in dependents:
                    if dependent not in self.dead_symbols and dependent not in self.transitively_dead:
                        # Special case: file-level dependencies - check if the file has any live exports
                        if dependent.endswith(':__file__'):
                            # Extract file path from dependent
                            file_path = dependent[:-9]  # Remove ':__file__'
                            # Check if this file has any non-dead exports
                            has_live_exports = False
                            for other_symbol in self.exported_symbols:
                                if other_symbol.startswith(file_path + ':'):
                                    if other_symbol not in self.dead_symbols and other_symbol not in self.transitively_dead:
                                        has_live_exports = True
                                        break
                            if has_live_exports:
                                all_dependents_dead = False
                                break
                        else:
                            all_dependents_dead = False
                            break
                
                if all_dependents_dead and dependents:
                    # This symbol is only used by dead code
                    self.transitively_dead.add(symbol)
                    changed = True
    
    def count_dead_chain(self, symbol: str) -> int:
        """Count total symbols in a dead code chain."""
        visited = set()
        queue = deque([symbol])
        count = 0
        
        while queue:
            current = queue.popleft()
            if current in visited:
                continue
            visited.add(current)
            count += 1
            
            # Add all symbols that only this symbol uses
            for dep in self.dependencies.get(current, set()):
                if dep in self.dead_symbols or dep in self.transitively_dead:
                    queue.append(dep)
        
        return count


class DeadCodeChecker:
    """Detects dead code in TypeScript/JavaScript codebases."""
    
    def __init__(self, target_path: str = "src"):
        self.target_path = Path(target_path)
        self.src_path = Path("src")  # Always analyze full src
        self.file_cache: Dict[Path, FileAnalysis] = {}
        self.export_map: Dict[str, List[Export]] = defaultdict(list)
        self.import_map: Dict[str, List[Import]] = defaultdict(list)
        self.exceptions: Set[str] = set()
        self.dependency_graph = DependencyGraph()
        self.parser = TypeScriptParser()
        
        self._load_exceptions()
    
    def _load_exceptions(self) -> None:
        """Load dead code exceptions from .deadcode-ignore file."""
        ignore_file = Path(".deadcode-ignore")
        if ignore_file.exists():
            with open(ignore_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        self.exceptions.add(line)
    
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
    
    def _is_barrel_file(self, file_path: Path) -> bool:
        """Check if file is a barrel/index file."""
        return file_path.name in ['index.ts', 'index.tsx', 'index.js', 'index.jsx']
    
    def _find_all_src_files(self) -> List[Path]:
        """Find all TypeScript files in src directory."""
        files = []
        for pattern in ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]:
            files.extend(self.src_path.glob(pattern))
        
        # Filter out node_modules
        return [
            f for f in files 
            if "node_modules" not in str(f)
        ]
    
    def _find_target_files(self) -> List[Path]:
        """Find files in the target path to check for dead code."""
        files = []
        for pattern in ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]:
            files.extend(self.target_path.glob(pattern))
        
        # Filter out node_modules and test files
        return [
            f for f in files 
            if "node_modules" not in str(f) and not self._is_test_file(f)
        ]
    
    def _extract_exports(self, content: str, file_path: Path) -> List[Export]:
        """Extract export statements from file content."""
        exports = []
        
        # First handle multi-line exports using regex on full content
        # Multi-line named exports: export { ... }
        multi_export_pattern = r'export\s*\{\s*((?:[^{}]|{[^}]*})*?)\s*\}(?:\s*from\s*["\']([^"\']+)["\'])?'
        for match in re.finditer(multi_export_pattern, content, re.MULTILINE | re.DOTALL):
            exports_str = match.group(1)
            from_path = match.group(2)
            is_reexport = from_path is not None
            
            # Find line number of the export statement
            content_before = content[:match.start()]
            line_number = content_before.count('\n') + 1
            
            # Parse individual exports
            for export_name in exports_str.split(','):
                export_name = export_name.strip()
                if not export_name:
                    continue
                    
                # Handle 'as' aliases: foo as bar
                if ' as ' in export_name:
                    export_name = export_name.split(' as ')[-1].strip()
                
                exports.append(Export(
                    name=export_name,
                    file_path=file_path,
                    line_number=line_number,
                    export_type='named',
                    is_reexport=is_reexport,
                    from_path=from_path
                ))
        
        # Multi-line type exports: export type { ... }
        multi_type_pattern = r'export\s+type\s*\{\s*((?:[^{}]|{[^}]*})*?)\s*\}(?:\s*from\s*["\']([^"\']+)["\'])?'
        for match in re.finditer(multi_type_pattern, content, re.MULTILINE | re.DOTALL):
            exports_str = match.group(1)
            from_path = match.group(2)
            is_reexport = from_path is not None
            
            # Find line number
            content_before = content[:match.start()]
            line_number = content_before.count('\n') + 1
            
            for export_name in exports_str.split(','):
                export_name = export_name.strip()
                if not export_name:
                    continue
                    
                if ' as ' in export_name:
                    export_name = export_name.split(' as ')[-1].strip()
                
                exports.append(Export(
                    name=export_name,
                    file_path=file_path,
                    line_number=line_number,
                    export_type='type',
                    is_reexport=is_reexport,
                    from_path=from_path
                ))
        
        # Now process line by line for other export patterns
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            line = line.strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('//') or line.startswith('/*'):
                continue
            
            # Skip lines that are part of multi-line exports (already processed)
            # But don't skip direct exports like "export function Toaster() {"
            if 'export' in line and ('{' in line or '}' in line):
                # Check if this is a direct export pattern
                is_direct_export = bool(re.match(r'export\s+(const|function|class|interface|type)\s+\w+', line))
                is_single_line_export = line.startswith('export') and line.endswith('}')
                
                # Skip only if it's truly part of a multi-line export block
                if not (is_direct_export or is_single_line_export):
                    continue
            
            # Single-line named exports: export { foo, bar } on one line
            single_named_match = re.match(r'^export\s*\{\s*([^}]+)\s*\}(?:\s*from\s*["\']([^"\']+)["\'])?$', line)
            if single_named_match:
                exports_str = single_named_match.group(1)
                from_path = single_named_match.group(2)
                is_reexport = from_path is not None
                
                # Parse individual exports
                for export_name in exports_str.split(','):
                    export_name = export_name.strip()
                    if not export_name:
                        continue
                        
                    # Handle 'as' aliases: foo as bar
                    if ' as ' in export_name:
                        export_name = export_name.split(' as ')[-1].strip()
                    
                    exports.append(Export(
                        name=export_name,
                        file_path=file_path,
                        line_number=i,
                        export_type='named',
                        is_reexport=is_reexport,
                        from_path=from_path
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
                    export_type='default',
                    from_path=None
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
                    export_type=export_type,
                    from_path=None
                ))
                continue
            
            # Single-line type exports: export type { ... } on one line
            single_type_match = re.match(r'^export\s+type\s*\{\s*([^}]+)\s*\}(?:\s*from\s*["\']([^"\']+)["\'])?$', line)
            if single_type_match:
                exports_str = single_type_match.group(1)
                from_path = single_type_match.group(2)
                is_reexport = from_path is not None
                
                for export_name in exports_str.split(','):
                    export_name = export_name.strip()
                    if not export_name:
                        continue
                        
                    if ' as ' in export_name:
                        export_name = export_name.split(' as ')[-1].strip()
                    
                    exports.append(Export(
                        name=export_name,
                        file_path=file_path,
                        line_number=i,
                        export_type='type',
                        is_reexport=is_reexport,
                        from_path=from_path
                    ))
        
        return exports
    
    def _extract_imports(self, content: str, file_path: Path) -> List[Import]:
        """Extract import statements from file content."""
        imports = []
        
        # First handle multi-line imports using regex on full content
        # Multi-line named imports: import { ... }
        multi_import_pattern = r'import\s*\{\s*((?:[^{}]|{[^}]*})*?)\s*\}\s*from\s*["\']([^"\']+)["\']'
        for match in re.finditer(multi_import_pattern, content, re.MULTILINE | re.DOTALL):
            imports_str = match.group(1)
            from_path = match.group(2)
            
            # Find line number of the import statement
            content_before = content[:match.start()]
            line_number = content_before.count('\n') + 1
            
            # Parse individual imports
            for import_name in imports_str.split(','):
                import_name = import_name.strip()
                if not import_name:
                    continue
                    
                # Handle 'as' aliases: foo as bar
                original_name = import_name
                if ' as ' in import_name:
                    original_name = import_name.split(' as ')[0].strip()
                    import_name = import_name.split(' as ')[-1].strip()
                
                imports.append(Import(
                    name=import_name,
                    from_path=from_path,
                    file_path=file_path,
                    line_number=line_number,
                    import_type='named',
                    original_name=original_name if ' as ' in import_name else None
                ))
        
        # Multi-line type imports: import type { ... }
        multi_type_pattern = r'import\s+type\s*\{\s*((?:[^{}]|{[^}]*})*?)\s*\}\s*from\s*["\']([^"\']+)["\']'
        for match in re.finditer(multi_type_pattern, content, re.MULTILINE | re.DOTALL):
            imports_str = match.group(1)
            from_path = match.group(2)
            
            # Find line number
            content_before = content[:match.start()]
            line_number = content_before.count('\n') + 1
            
            for import_name in imports_str.split(','):
                import_name = import_name.strip()
                if not import_name:
                    continue
                    
                original_name = import_name
                if ' as ' in import_name:
                    original_name = import_name.split(' as ')[0].strip()
                    import_name = import_name.split(' as ')[-1].strip()
                
                imports.append(Import(
                    name=import_name,
                    from_path=from_path,
                    file_path=file_path,
                    line_number=line_number,
                    import_type='type',
                    original_name=original_name if ' as ' in import_name else None
                ))
        
        # Now process line by line for other import patterns
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            line = line.strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('//') or line.startswith('/*'):
                continue
            
            # Skip lines that are part of multi-line imports (already processed)
            # But don't skip direct imports like "import foo from 'bar'"
            if 'import' in line and ('{' in line or '}' in line):
                # Check if this is a single-line import pattern
                is_single_line_import = line.startswith('import') and line.endswith("';")
                
                # Skip only if it's truly part of a multi-line import block
                if not is_single_line_import:
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
            
            # Single-line named imports: import { foo, bar } from 'baz' on one line
            single_named_match = re.match(r'^import\s*\{\s*([^}]+)\s*\}\s*from\s*["\']([^"\']+)["\']$', line)
            if single_named_match:
                imports_str = single_named_match.group(1)
                from_path = single_named_match.group(2)
                
                for import_name in imports_str.split(','):
                    import_name = import_name.strip()
                    if not import_name:
                        continue
                        
                    # Handle 'as' aliases: foo as bar
                    original_name = import_name
                    if ' as ' in import_name:
                        original_name = import_name.split(' as ')[0].strip()
                        import_name = import_name.split(' as ')[-1].strip()
                    
                    imports.append(Import(
                        name=import_name,
                        from_path=from_path,
                        file_path=file_path,
                        line_number=i,
                        import_type='named',
                        original_name=original_name if ' as ' in import_name else None
                    ))
                continue
            
            # Single-line type imports: import type { ... } from '...' on one line
            single_type_match = re.match(r'^import\s+type\s*\{\s*([^}]+)\s*\}\s*from\s*["\']([^"\']+)["\']$', line)
            if single_type_match:
                imports_str = single_type_match.group(1)
                from_path = single_type_match.group(2)
                
                for import_name in imports_str.split(','):
                    import_name = import_name.strip()
                    if not import_name:
                        continue
                        
                    original_name = import_name
                    if ' as ' in import_name:
                        original_name = import_name.split(' as ')[0].strip()
                        import_name = import_name.split(' as ')[-1].strip()
                    
                    imports.append(Import(
                        name=import_name,
                        from_path=from_path,
                        file_path=file_path,
                        line_number=i,
                        import_type='type',
                        original_name=original_name if ' as ' in import_name else None
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
            func_match = re.match(r'(?:export\s+)?(?:async\s+)?function\s+(\w+)', line)
            if func_match:
                name = func_match.group(1)
                is_exported = 'export' in line
                
                symbols.append(Symbol(
                    name=name,
                    file_path=file_path,
                    line_number=i,
                    symbol_type='function',
                    is_exported=is_exported
                ))
                continue
            
            # Arrow function assignments
            arrow_match = re.match(r'(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(.*\)\s*=>', line)
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
            
            # Const/let/var declarations
            var_match = re.match(r'(?:export\s+)?(const|let|var)\s+(\w+)', line)
            if var_match:
                var_type = var_match.group(1)
                name = var_match.group(2)
                is_exported = line.startswith('export')
                
                symbols.append(Symbol(
                    name=name,
                    file_path=file_path,
                    line_number=i,
                    symbol_type=var_type,
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
            'false', 'null', 'undefined', 'string', 'number', 'boolean', 'object',
            'async', 'await', 'new', 'this', 'super', 'extends', 'implements'
        }
        
        for identifier in identifiers:
            if identifier not in keywords:
                used_symbols.add(identifier)
        
        return used_symbols
    
    def _analyze_file(self, file_path: Path) -> FileAnalysis:
        """Analyze a single TypeScript file using shared parser."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            exports = self.parser.extract_exports(content, file_path)
            imports = self.parser.extract_imports(content, file_path)
            symbols = self.parser.extract_symbols(content, file_path)
            used_symbols = self.parser.find_symbol_usage(content)
            interface_implementations = self.parser.extract_interface_implementations(content, file_path)
            
            analysis = FileAnalysis(
                path=file_path,
                exports=exports,
                imports=imports,
                symbols=symbols,
                used_symbols=used_symbols,
                interface_implementations=interface_implementations,
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
                candidate = resolved_path.parent / f"{resolved_path.name}{ext}"
                if candidate.exists():
                    return candidate
            
            # Try index files
            for ext in ['index.ts', 'index.tsx', 'index.js', 'index.jsx']:
                candidate = resolved_path / ext
                if candidate.exists():
                    return candidate
        
        elif import_path.startswith('~/'):
            # Absolute import from src
            relative_path = import_path[2:]
            
            # Try direct file
            for ext in ['.ts', '.tsx', '.js', '.jsx', '']:
                candidate = self.src_path / f"{relative_path}{ext}" if ext else self.src_path / relative_path
                if candidate.exists() and candidate.is_file():
                    return candidate
            
            # Try index files
            base_path = self.src_path / relative_path
            if base_path.is_dir():
                for ext in ['index.ts', 'index.tsx', 'index.js', 'index.jsx']:
                    candidate = base_path / ext
                    if candidate.exists():
                        return candidate
        
        return None
    
    def _build_dependency_graph(self) -> None:
        """Build the dependency graph from analyzed files."""
        # First, register all exports
        for file_analysis in self.file_cache.values():
            for export in file_analysis.exports:
                symbol_key = f"{export.file_path}:{export.name}"
                self.dependency_graph.mark_as_export(symbol_key)
            
            # Also track internal symbols
            for symbol in file_analysis.symbols:
                if not symbol.is_exported:
                    symbol_key = f"{symbol.file_path}:{symbol.name}"
                    self.dependency_graph.all_symbols.add(symbol_key)
        
        # Build import dependencies
        for file_analysis in self.file_cache.values():
            for imp in file_analysis.imports:
                resolved_path = self._resolve_import_path(imp.from_path, imp.file_path)
                if resolved_path and resolved_path in self.file_cache:
                    # Handle different import types
                    if imp.import_type == 'namespace':
                        # For namespace imports (import * as foo), mark all exports as potentially used
                        resolved_analysis = self.file_cache[resolved_path]
                        for export in resolved_analysis.exports:
                            from_symbol = f"{imp.file_path}:__file__"
                            to_symbol = f"{resolved_path}:{export.name}"
                            self.dependency_graph.add_dependency(from_symbol, to_symbol)
                    else:
                        # Find the actual export name (handle aliasing)
                        export_name = imp.original_name if hasattr(imp, 'original_name') and imp.original_name else imp.name
                        
                        # Create dependency relationship
                        from_symbol = f"{imp.file_path}:__file__"  # File-level dependency
                        to_symbol = f"{resolved_path}:{export_name}"
                        self.dependency_graph.add_dependency(from_symbol, to_symbol)
        
        # Build internal dependencies within files
        for file_analysis in self.file_cache.values():
            # Track which symbols use which other symbols within the file
            for symbol in file_analysis.symbols:
                symbol_key = f"{symbol.file_path}:{symbol.name}"
                
                # This is simplified - ideally we'd parse actual usage
                for other_symbol in file_analysis.symbols:
                    if other_symbol.name != symbol.name and other_symbol.name in file_analysis.used_symbols:
                        other_key = f"{other_symbol.file_path}:{other_symbol.name}"
                        self.dependency_graph.add_dependency(symbol_key, other_key)
    
    def _build_reexport_chains(self) -> Dict[str, Set[str]]:
        """Build mapping from original exports to all their re-export locations.
        
        Returns a dict mapping original symbol keys to sets of re-export symbol keys.
        """
        from collections import defaultdict
        
        reexport_chains = defaultdict(set)
        
        for file_analysis in self.file_cache.values():
            for export in file_analysis.exports:
                if export.is_reexport and export.from_path:
                    # Resolve the source file
                    source_path = self._resolve_import_path(export.from_path, export.file_path)
                    if source_path and source_path in self.file_cache:
                        
                        if export.export_type == 'wildcard':
                            # Handle wildcard exports: export * from './file'
                            # Mark ALL exports from the source file as re-exported
                            source_analysis = self.file_cache[source_path]
                            for source_export in source_analysis.exports:
                                if source_export.is_reexport:
                                    # Handle transitive re-exports: if A re-exports from B, and C re-exports * from A,
                                    # then C should also re-export from B
                                    if source_export.from_path:
                                        # Resolve the original source
                                        original_source_path = self._resolve_import_path(source_export.from_path, source_path)
                                        if original_source_path and original_source_path in self.file_cache:
                                            original_key = f"{original_source_path}:{source_export.name}"
                                            reexport_key = f"{export.file_path}:{source_export.name}"
                                            reexport_chains[original_key].add(reexport_key)
                                else:
                                    # Direct export from this file
                                    original_key = f"{source_path}:{source_export.name}"
                                    reexport_key = f"{export.file_path}:{source_export.name}"
                                    reexport_chains[original_key].add(reexport_key)
                        else:
                            # Handle named re-exports: export { foo } from './file' or export { foo as bar }
                            # For aliased exports, we need to map from the original name to the alias
                            source_name = export.original_name if export.original_name else export.name
                            original_key = f"{source_path}:{source_name}"
                            reexport_key = f"{export.file_path}:{export.name}"
                            reexport_chains[original_key].add(reexport_key)
        
        return reexport_chains
    
    def _mark_dead_symbols(self) -> None:
        """Mark symbols as dead without reporting them yet, considering re-export chains."""
        # Build export map from all analyzed files (excluding re-exports for dead detection)
        all_exports = {}
        for file_analysis in self.file_cache.values():
            for export in file_analysis.exports:
                key = f"{export.file_path}:{export.name}"
                all_exports[key] = export
        
        # Build re-export chains
        reexport_chains = self._build_reexport_chains()
        
        # Build import usage map from ALL files (including outside target)
        imported_symbols = set()
        for file_analysis in self.file_cache.values():
            for imp in file_analysis.imports:
                resolved_path = self._resolve_import_path(imp.from_path, imp.file_path)
                if resolved_path:
                    if imp.import_type == 'namespace':
                        # For namespace imports, mark all exports from that file as used
                        if resolved_path in self.file_cache:
                            resolved_analysis = self.file_cache[resolved_path]
                            for export in resolved_analysis.exports:
                                if export.is_reexport and export.from_path:
                                    # Add the original source
                                    source_path = self._resolve_import_path(export.from_path, resolved_path)
                                    if source_path:
                                        # Use the original name from the source, not the aliased name
                                        source_name = export.original_name if export.original_name else export.name
                                        source_key = f"{source_path}:{source_name}"
                                        imported_symbols.add(source_key)
                                else:
                                    # Regular export
                                    key = f"{resolved_path}:{export.name}"
                                    imported_symbols.add(key)
                    else:
                        # Handle aliasing
                        export_name = imp.original_name if hasattr(imp, 'original_name') and imp.original_name else imp.name
                        
                        key = f"{resolved_path}:{export_name}"
                        imported_symbols.add(key)
                        
                        # Check if this is a re-export and add the source
                        if resolved_path in self.file_cache:
                            resolved_analysis = self.file_cache[resolved_path]
                            for export in resolved_analysis.exports:
                                if export.name == export_name and export.is_reexport and export.from_path:
                                    source_path = self._resolve_import_path(export.from_path, resolved_path)
                                    if source_path:
                                        # Use the original name from the source, not the aliased name
                                        source_name = export.original_name if export.original_name else export.name
                                        source_key = f"{source_path}:{source_name}"
                                        imported_symbols.add(source_key)
                                    break
                        
                        # Handle default imports
                        if imp.import_type == 'default':
                            default_key = f"{resolved_path}:default"
                            imported_symbols.add(default_key)
                    
        
        # Mark exports as dead, considering re-export chains
        for symbol_key, export in all_exports.items():
            if export.is_reexport:
                continue  # Skip re-exports, we'll check originals
            
            # Check if this symbol is used directly
            is_used = symbol_key in imported_symbols
            
            # If not used directly, check if any of its re-exports are used
            if not is_used:
                for reexport_key in reexport_chains.get(symbol_key, set()):
                    if reexport_key in imported_symbols:
                        is_used = True
                        break
            
            # Special handling for interfaces: check if they have implementations
            if not is_used and export.export_type in ['interface', 'type']:
                # Check if this interface has implementations across all files
                has_implementations = False
                for file_analysis in self.file_cache.values():
                    if export.name in file_analysis.interface_implementations:
                        has_implementations = True
                        break
                
                # If interface has implementations, mark it as used
                if has_implementations:
                    is_used = True
            
            # Special handling for barrel exports: consider them externally visible
            if not is_used and self._is_barrel_file(export.file_path):
                # Barrel exports are considered as potentially externally used
                # Only flag them as dead if they're definitely internal-only
                # For now, we'll be more lenient with barrel exports
                is_used = True
            
            # Mark as dead if not used anywhere
            if not is_used:
                self.dependency_graph.mark_as_dead(symbol_key)
        
        # Mark unused local symbols as dead
        for file_analysis in self.file_cache.values():
            for symbol in file_analysis.symbols:
                if symbol.name not in file_analysis.used_symbols:
                    if not symbol.name.startswith('_') and symbol.symbol_type not in ['interface', 'type']:
                        symbol_key = f"{symbol.file_path}:{symbol.name}"
                        self.dependency_graph.mark_as_dead(symbol_key)
    
    def _check_unused_exports(self, results: CheckResults, dead_files: set) -> None:
        """Report unused exports that aren't in dead files."""
        for file_analysis in self.file_cache.values():
            # Only report on files in target path
            if not str(file_analysis.path).startswith(str(self.target_path)):
                continue
            
            # Skip if file is already reported as dead
            if file_analysis.path in dead_files:
                continue
            
            # Skip files that match exceptions for reporting
            if self._is_exception(file_analysis.path):
                continue
            
            for export in file_analysis.exports:
                symbol_key = f"{file_analysis.path}:{export.name}"
                
                # Only report if marked as dead and not used internally
                if symbol_key in self.dependency_graph.dead_symbols:
                    # Skip certain patterns that are commonly intentionally unused
                    if export.name in ['default'] and 'page' in str(export.file_path):
                        continue  # Next.js page components
                    
                    # Check if this export is used internally
                    is_used_internally = export.name in file_analysis.used_symbols
                    
                    # Only report as error if not used anywhere (internally or externally)
                    if not is_used_internally:
                        try:
                            relative_path = str(export.file_path.relative_to(self.src_path))
                        except ValueError:
                            relative_path = str(export.file_path)
                        
                        issue = DeadCodeIssue.create_error(
                            message=f"Unused export '{export.name}'",
                            issue_type=DeadCodeType.UNUSED_EXPORT,
                            file_path=relative_path,
                            line_number=export.line_number,
                            symbol_name=export.name,
                            recommendation=f"Remove unused export"
                        )
                        results.add_issue(issue)
    
    def _check_unused_imports(self, results: CheckResults, dead_files: set) -> None:
        """Check for unused imports within files."""
        # Don't check unused imports - they're not critical errors
        # Unused imports are typically handled by linters/formatters
        pass
    
    def _check_unused_local_symbols(self, results: CheckResults, dead_files: set) -> None:
        """Check for unused local symbols within files."""
        for file_analysis in self.file_cache.values():
            # Only check files in target path
            if not str(file_analysis.path).startswith(str(self.target_path)):
                continue
            
            # Skip if file is already reported as dead
            if file_analysis.path in dead_files:
                continue
            
            # Skip files that match exceptions
            if self._is_exception(file_analysis.path):
                continue
            
            for symbol in file_analysis.symbols:
                # Check if symbol is not used anywhere in the file
                if symbol.name not in file_analysis.used_symbols:
                    # Skip certain patterns
                    if symbol.name.startswith('_'):  # Intentionally unused (convention)
                        continue
                    if symbol.symbol_type in ['interface', 'type']:  # Types are often defined but not used locally
                        continue
                    
                    # Mark as dead
                    symbol_key = f"{symbol.file_path}:{symbol.name}"
                    self.dependency_graph.mark_as_dead(symbol_key)
                    
                    try:
                        relative_path = str(symbol.file_path.relative_to(self.src_path))
                    except ValueError:
                        relative_path = str(symbol.file_path)
                    
                    # Only report non-exported unused symbols as errors
                    if not symbol.is_exported:
                        issue = DeadCodeIssue.create_error(
                            message=f"Unused {symbol.symbol_type} '{symbol.name}'",
                            issue_type=DeadCodeType.UNUSED_SYMBOL,
                            file_path=relative_path,
                            line_number=symbol.line_number,
                            symbol_name=symbol.name,
                            recommendation=f"Remove unused {symbol.symbol_type} '{symbol.name}'"
                        )
                        results.add_issue(issue)
    
    def _check_transitive_dead_code(self, results: CheckResults, dead_files: set) -> None:
        """Check for code that's only used by other dead code."""
        self.dependency_graph.find_transitive_dead_code()
        
        # Report transitively dead symbols
        for symbol_key in self.dependency_graph.transitively_dead:
            parts = symbol_key.split(':', 1)
            if len(parts) != 2:
                continue
            
            file_path = Path(parts[0])
            symbol_name = parts[1]
            
            # Only report on files in target path
            if not str(file_path).startswith(str(self.target_path)):
                continue
            
            # Skip if file is already reported as dead
            if file_path in dead_files:
                continue
            
            # Skip files that match exceptions
            if self._is_exception(file_path):
                continue
            
            # Find the actual symbol details
            if file_path in self.file_cache:
                file_analysis = self.file_cache[file_path]
                
                # Find in exports
                for export in file_analysis.exports:
                    if export.name == symbol_name:
                        # Skip reporting re-exports as transitively dead
                        if export.is_reexport:
                            continue
                            
                        chain_count = self.dependency_graph.count_dead_chain(symbol_key)
                        
                        try:
                            relative_path = str(file_path.relative_to(self.src_path))
                        except ValueError:
                            relative_path = str(file_path)
                        
                        issue = DeadCodeIssue.create_error(
                            message=f"Transitively unused export '{symbol_name}' ({chain_count} symbols in chain)",
                            issue_type=DeadCodeType.UNUSED_EXPORT,
                            file_path=relative_path,
                            line_number=export.line_number,
                            symbol_name=symbol_name,
                            recommendation=f"Remove unused export"
                        )
                        results.add_issue(issue)
                        break
    
    def _detect_dead_files(self, results: CheckResults) -> List[Path]:
        """Detect files that contain only dead code."""
        dead_files = []
        
        for file_path, file_analysis in self.file_cache.items():
            # Only check files in target path
            if not str(file_path).startswith(str(self.target_path)):
                continue
            
            # Skip test files and exceptions
            if self._is_test_file(file_path) or self._is_exception(file_path):
                continue
            
            # Check if all exports are dead
            if not file_analysis.exports:
                continue  # No exports, not a dead file candidate
            
            all_exports_dead = True
            for export in file_analysis.exports:
                symbol_key = f"{file_path}:{export.name}"
                if symbol_key not in self.dependency_graph.dead_symbols and \
                   symbol_key not in self.dependency_graph.transitively_dead:
                    all_exports_dead = False
                    break
            
            if all_exports_dead:
                dead_files.append(file_path)
                
                # Count total symbols in file
                total_symbols = len(file_analysis.exports) + len([s for s in file_analysis.symbols if not s.is_exported])
                
                try:
                    relative_path = str(file_path.relative_to(self.src_path))
                except ValueError:
                    relative_path = str(file_path)
                
                issue = DeadCodeIssue.create_error(
                    message=f"Dead file - all exports unused ({total_symbols} total symbols)",
                    issue_type=DeadCodeType.UNUSED_EXPORT,
                    file_path=relative_path,
                    line_number=1,
                    symbol_name="__file__",
                    recommendation=f"Remove unused file"
                )
                results.add_issue(issue)
        
        return dead_files
    
    def _detect_dead_folders(self, results: CheckResults, dead_files: List[Path]) -> Set[Path]:
        """Detect folders where all or most files are dead code."""
        from collections import defaultdict
        
        # Group dead files by their parent directory
        dead_files_by_folder = defaultdict(list)
        all_files_by_folder = defaultdict(list)
        
        # Track dead files by folder
        for file_path in dead_files:
            if file_path in self.file_cache:
                parent_dir = file_path.parent
                dead_files_by_folder[parent_dir].append(file_path)
        
        # Track all target files by folder for comparison
        target_files = self._find_target_files()
        for file_path in target_files:
            if not self._is_test_file(file_path):
                parent_dir = file_path.parent
                all_files_by_folder[parent_dir].append(file_path)
        
        dead_folders = set()
        
        # Check each folder to see if it should be reported as dead
        for folder_path, folder_dead_files in dead_files_by_folder.items():
            folder_all_files = all_files_by_folder[folder_path]
            
            # Skip if folder has too few files
            if len(folder_all_files) < 2:
                continue
            
            dead_count = len(folder_dead_files)
            total_count = len(folder_all_files)
            dead_ratio = dead_count / total_count
            
            # Only report folder if ALL files are dead (100%)
            should_report_folder = (dead_ratio >= 1.0)
            
            if should_report_folder:
                dead_folders.add(folder_path)
                
                try:
                    relative_folder_path = str(folder_path.relative_to(self.src_path))
                except ValueError:
                    relative_folder_path = str(folder_path)
                
                # Remove individual file issues for this folder
                issues_to_remove = []
                all_issues = results.get_all_issues()
                for issue in all_issues:
                    if issue.file_path and issue.symbol_name == "__file__":
                        try:
                            issue_file_path = self.src_path / issue.file_path
                            if issue_file_path.parent == folder_path:
                                issues_to_remove.append(issue)
                        except:
                            pass
                
                # Remove from both errors and warnings lists
                for issue in issues_to_remove:
                    if issue in results.errors:
                        results.errors.remove(issue)
                    if issue in results.warnings:
                        results.warnings.remove(issue)
                
                # Create folder-level issue
                message = f"Dead folder - all {total_count} files unused"
                recommendation = f"Remove unused folder"
                
                issue = DeadCodeIssue.create_error(
                    message=message,
                    issue_type=DeadCodeType.UNUSED_EXPORT,
                    file_path=relative_folder_path + "/",
                    line_number=1,
                    symbol_name="__folder__",
                    recommendation=recommendation
                )
                results.add_issue(issue)
        
        return dead_folders
    
    def run_all_checks(self) -> CheckResults:
        """Run all dead code checks and return results."""
        start_time = time.time()
        results = CheckResults(target_path=str(self.target_path))
        
        # Find ALL files in src for analysis
        all_src_files = self._find_all_src_files()
        
        # Find target files to check
        target_files = self._find_target_files()
        results.files_analyzed = len(target_files)
        
        print(f"Analyzing {len(all_src_files)} files in src/, checking {len(target_files)} in {self.target_path}")
        
        # Analyze ALL files in parallel (for import resolution)
        with ThreadPoolExecutor(max_workers=4) as executor:
            future_to_file = {
                executor.submit(self._analyze_file, file_path): file_path
                for file_path in all_src_files
            }
            
            for future in as_completed(future_to_file):
                file_path = future_to_file[future]
                analysis = future.result()
                self.file_cache[file_path] = analysis
        
        # Build dependency graph
        self._build_dependency_graph()
        
        # Run dead code checks - mark dead symbols first
        self._mark_dead_symbols()
        
        # Then detect dead files
        dead_files = self._detect_dead_files(results)
        dead_files_set = set(dead_files)
        
        # Then detect dead folders (this may remove some individual file issues)
        dead_folders = self._detect_dead_folders(results, dead_files)
        
        # Then check other issues, but skip symbols in dead files
        self._check_unused_exports(results, dead_files_set)
        self._check_unused_imports(results, dead_files_set)
        self._check_unused_local_symbols(results, dead_files_set)
        self._check_transitive_dead_code(results, dead_files_set)
        
        results.execution_time = time.time() - start_time
        return results