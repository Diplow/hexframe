#!/usr/bin/env python3
"""
Shared TypeScript/JavaScript parsing utilities.

This module provides comprehensive parsing of TypeScript and JavaScript files,
extracting imports, exports, functions, and other symbols for use by various
code analysis tools.
"""

import re
from pathlib import Path
from typing import List, Set, Optional, NamedTuple, Tuple
from dataclasses import dataclass


@dataclass
class Import:
    """Represents an import statement."""
    name: str
    from_path: str
    file_path: Path
    line_number: int
    import_type: str  # 'default', 'named', 'namespace', 'type'
    original_name: Optional[str] = None  # For aliased imports


@dataclass 
class Export:
    """Represents an export statement."""
    name: str
    file_path: Path
    line_number: int
    export_type: str  # 'default', 'named', 'const', 'function', 'class', 'interface', 'type'
    is_reexport: bool = False
    from_path: Optional[str] = None
    original_name: Optional[str] = None  # For aliased exports like "export { foo as bar }"


@dataclass
class Symbol:
    """Represents a local symbol (function, variable, etc.)."""
    name: str
    file_path: Path
    line_number: int
    symbol_type: str  # 'function', 'const', 'let', 'var', 'class', 'interface', 'type'
    is_exported: bool = False


@dataclass
class FunctionInfo:
    """Represents function information for Rule of 6 checking."""
    name: str
    line_start: int
    line_end: int
    line_count: int
    arg_count: int
    file_path: Path


class TypeScriptParser:
    """
    Comprehensive TypeScript/JavaScript parser for code analysis.
    
    Extracts imports, exports, functions, and symbols from TypeScript files
    with proper handling of multi-line statements and various syntax patterns.
    """
    
    def __init__(self):
        # Keywords to exclude from function detection
        self.excluded_keywords = {
            'if', 'else', 'for', 'while', 'switch', 'case', 'default', 'try', 'catch', 
            'finally', 'with', 'return', 'throw', 'break', 'continue', 'do', 'typeof',
            'instanceof', 'in', 'new', 'delete', 'void', 'yield', 'await'
        }
        
        # Function declaration patterns - more precise to avoid false positives
        self.function_patterns = [
            # Function declarations: export function name() or function name()
            r'^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(',
            # Arrow functions: const name = () => or export const name = () =>
            r'^\s*(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(',
            # Object method arrow functions: methodName: () => (at start of line or after {)
            r'^\s*(\w+)\s*:\s*(?:async\s*)?\(',
            # Class methods: public/private/static methodName()
            r'^\s*(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:async\s+)?(\w+)\s*\(',
        ]

    def extract_imports(self, content: str, file_path: Path) -> List[Import]:
        """Extract import statements from file content with multi-line support."""
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

                # Handle inline type imports: type Foo
                import_type = 'named'
                if import_name.startswith('type '):
                    import_type = 'type'
                    import_name = import_name[5:].strip()  # Remove 'type ' prefix

                # Handle 'as' aliases: foo as bar
                has_alias = ' as ' in import_name
                original_name = import_name.split(' as ')[0].strip() if has_alias else None
                if has_alias:
                    import_name = import_name.split(' as ')[-1].strip()

                imports.append(Import(
                    name=import_name,
                    from_path=from_path,
                    file_path=file_path,
                    line_number=line_number,
                    import_type=import_type,
                    original_name=original_name
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
                    
                has_alias = ' as ' in import_name
                original_name = import_name.split(' as ')[0].strip() if has_alias else None
                if has_alias:
                    import_name = import_name.split(' as ')[-1].strip()

                imports.append(Import(
                    name=import_name,
                    from_path=from_path,
                    file_path=file_path,
                    line_number=line_number,
                    import_type='type',
                    original_name=original_name
                ))
        
        # Now process line by line for other import patterns
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            line = line.strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('//') or line.startswith('/*'):
                continue
            
            # Skip lines that are part of multi-line imports (already processed)
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

                    # Handle inline type imports: type Foo
                    import_type = 'named'
                    if import_name.startswith('type '):
                        import_type = 'type'
                        import_name = import_name[5:].strip()  # Remove 'type ' prefix

                    # Handle 'as' aliases: foo as bar
                    has_alias = ' as ' in import_name
                    original_name = import_name.split(' as ')[0].strip() if has_alias else None
                    if has_alias:
                        import_name = import_name.split(' as ')[-1].strip()

                    imports.append(Import(
                        name=import_name,
                        from_path=from_path,
                        file_path=file_path,
                        line_number=i,
                        import_type=import_type,
                        original_name=original_name
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
                        
                    has_alias = ' as ' in import_name
                    original_name = import_name.split(' as ')[0].strip() if has_alias else None
                    if has_alias:
                        import_name = import_name.split(' as ')[-1].strip()

                    imports.append(Import(
                        name=import_name,
                        from_path=from_path,
                        file_path=file_path,
                        line_number=i,
                        import_type='type',
                        original_name=original_name
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

        # Handle dynamic imports: import('path') and await import('path')
        # These are common in modern TypeScript for lazy loading
        dynamic_import_pattern = r'(?:await\s+)?import\s*\(\s*["\']([^"\']+)["\']\s*\)'
        for match in re.finditer(dynamic_import_pattern, content, re.MULTILINE):
            from_path = match.group(1)

            # Find line number
            content_before = content[:match.start()]
            line_number = content_before.count('\n') + 1

            # For dynamic imports, we'll mark it as a namespace import since
            # the entire module is being imported dynamically
            imports.append(Import(
                name='*',  # Dynamic imports import the whole module
                from_path=from_path,
                file_path=file_path,
                line_number=line_number,
                import_type='dynamic'
            ))

        return imports

    def extract_exports(self, content: str, file_path: Path) -> List[Export]:
        """Extract export statements from file content with multi-line support."""
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
                original_name = None
                if ' as ' in export_name:
                    original_name = export_name.split(' as ')[0].strip()
                    export_name = export_name.split(' as ')[-1].strip()
                
                exports.append(Export(
                    name=export_name,
                    file_path=file_path,
                    line_number=line_number,
                    export_type='named',
                    is_reexport=is_reexport,
                    from_path=from_path,
                    original_name=original_name
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
                    
                original_name = None
                if ' as ' in export_name:
                    original_name = export_name.split(' as ')[0].strip()
                    export_name = export_name.split(' as ')[-1].strip()
                
                exports.append(Export(
                    name=export_name,
                    file_path=file_path,
                    line_number=line_number,
                    export_type='type',
                    is_reexport=is_reexport,
                    from_path=from_path,
                    original_name=original_name
                ))
        
        # Wildcard exports: export * from '...'
        wildcard_pattern = r'export\s*\*\s*from\s*["\']([^"\']+)["\']'
        for match in re.finditer(wildcard_pattern, content, re.MULTILINE):
            from_path = match.group(1)
            
            # Find line number
            content_before = content[:match.start()]
            line_number = content_before.count('\n') + 1
            
            exports.append(Export(
                name='*',  # Special marker for wildcard exports
                file_path=file_path,
                line_number=line_number,
                export_type='wildcard',
                is_reexport=True,
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
                    original_name = None
                    if ' as ' in export_name:
                        original_name = export_name.split(' as ')[0].strip()
                        export_name = export_name.split(' as ')[-1].strip()
                    
                    exports.append(Export(
                        name=export_name,
                        file_path=file_path,
                        line_number=i,
                        export_type='named',
                        is_reexport=is_reexport,
                        from_path=from_path,
                        original_name=original_name
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
                        
                    original_name = None
                    if ' as ' in export_name:
                        original_name = export_name.split(' as ')[0].strip()
                        export_name = export_name.split(' as ')[-1].strip()
                    
                    exports.append(Export(
                        name=export_name,
                        file_path=file_path,
                        line_number=i,
                        export_type='type',
                        is_reexport=is_reexport,
                        from_path=from_path,
                        original_name=original_name
                    ))
        
        return exports

    def extract_symbols(self, content: str, file_path: Path) -> List[Symbol]:
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
            
            # Class declarations (including implements clauses)
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

    def extract_interface_implementations(self, content: str, file_path: Path) -> dict[str, list[str]]:
        """Extract interface implementations (class implements Interface)."""
        implementations = {}
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            line = line.strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('//') or line.startswith('/*'):
                continue
            
            # Look for class declarations with implements
            class_implements_match = re.match(r'(?:export\s+)?class\s+(\w+).*?\bimplements\s+([^{]+)', line)
            if class_implements_match:
                class_name = class_implements_match.group(1)
                implements_str = class_implements_match.group(2).strip()
                
                # Parse implemented interfaces (can be comma-separated)
                interfaces = [iface.strip() for iface in implements_str.split(',')]
                
                for interface in interfaces:
                    # Clean up interface name (remove generic parameters)
                    interface = re.sub(r'<.*>', '', interface).strip()
                    if interface:
                        if interface not in implementations:
                            implementations[interface] = []
                        implementations[interface].append(class_name)
        
        return implementations

    def extract_functions(self, content: str, file_path: Path) -> List[FunctionInfo]:
        """Extract function information for Rule of 6 checking."""
        functions = []
        lines = content.split('\n')
        
        # Track context to avoid counting interface properties as functions
        in_interface_block = False
        brace_level = 0
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('//') or line.startswith('/*'):
                i += 1
                continue
            
            # Track if we're inside an interface block
            if re.match(r'(?:export\s+)?interface\s+\w+', line):
                in_interface_block = True
                brace_level = 0
            
            # Track brace levels to know when we exit interface
            if in_interface_block:
                brace_level += line.count('{')
                brace_level -= line.count('}')
                if brace_level <= 0:
                    in_interface_block = False
            
            # Skip lines inside interface blocks (they're type definitions, not functions)
            if in_interface_block:
                i += 1
                continue
            
            function_match = None
            matched_pattern_idx = None
            for idx, pattern in enumerate(self.function_patterns):
                match = re.search(pattern, line)
                if match:
                    func_name = match.group(1)
                    # Skip if it's a control flow keyword
                    if func_name.lower() not in self.excluded_keywords:
                        function_match = match
                        matched_pattern_idx = idx
                        break
            
            if function_match:
                func_name = function_match.group(1)
                # Extract arguments by finding the complete parameter list from the opening parenthesis
                args_str = self._extract_function_parameters(lines, i, function_match.start(1) if hasattr(function_match, 'start') else 0)

                # Skip obvious function calls (not declarations) with improved detection
                if not self._is_valid_function_declaration(line, matched_pattern_idx, lines, i, in_interface_block):
                    i += 1
                    continue
                
                # Count arguments
                arg_count = self._count_arguments(args_str)
                
                # Find function boundaries and count lines
                line_start, line_end = self._find_function_boundaries(lines, i, matched_pattern_idx)
                line_count = line_end - line_start + 1
                
                functions.append(FunctionInfo(
                    name=func_name,
                    line_start=line_start,
                    line_end=line_end,
                    line_count=line_count,
                    arg_count=arg_count,
                    file_path=file_path
                ))
            
            i += 1
        
        return functions

    def extract_import_paths(self, content: str) -> List[str]:
        """Simple extraction of import paths only (for architecture checker)."""
        import_pattern = r'from\s+["\']([^"\']+)["\']'
        return re.findall(import_pattern, content)

    def find_symbol_usage(self, content: str) -> Set[str]:
        """Find all symbol usage in file content with enhanced detection."""
        used_symbols = set()

        # Find all identifiers (basic approach)
        identifiers = re.findall(r'\b[a-zA-Z_$][a-zA-Z0-9_$]*\b', content)

        # JSX component usage: <ComponentName> or <ComponentName />
        jsx_components = re.findall(r'<\s*([A-Z][a-zA-Z0-9_]*)', content)

        # Method/property access: obj.method(), obj.property
        method_calls = re.findall(r'\.([a-zA-Z_$][a-zA-Z0-9_$]*)', content)

        # Object method chains: ObjectName.method()
        object_methods = re.findall(r'([A-Z][a-zA-Z0-9_$]*)\.', content)

        # Dynamic imports: import("./file") or await import("./file")
        dynamic_imports = re.findall(r'import\s*\(\s*["\']([^"\']+)["\']', content)

        # Schema/config object property references: schema.tableName
        schema_refs = re.findall(r'schema\.([a-zA-Z_$][a-zA-Z0-9_$]*)', content)

        # Combine all symbol usage
        all_symbols = set(identifiers + jsx_components + method_calls + object_methods + schema_refs)

        # Also track dynamic import files for later processing
        for import_path in dynamic_imports:
            # This will be handled separately in import resolution
            pass

        # Filter out keywords and common tokens
        keywords = {
            'import', 'export', 'from', 'const', 'let', 'var', 'function', 'class',
            'interface', 'type', 'if', 'else', 'for', 'while', 'return', 'true',
            'false', 'null', 'undefined', 'string', 'number', 'boolean', 'object',
            'async', 'await', 'new', 'this', 'super', 'extends', 'implements',
            'default', 'case', 'switch', 'try', 'catch', 'finally', 'throw'
        }

        for identifier in all_symbols:
            if identifier not in keywords:
                used_symbols.add(identifier)

        return used_symbols

    def _count_arguments(self, args_str: str) -> int:
        """Count arguments in function signature, properly handling nested structures."""
        if not args_str.strip():
            return 0

        # Split arguments while respecting nested structures (braces, brackets, parentheses)
        args = self._split_arguments_safely(args_str)

        # Filter out empty args and clean up
        real_args = []
        for arg in args:
            arg = arg.strip()
            if not arg or arg == '...':
                continue

            # Remove type annotations and default values
            # Handle complex types like { prop: string }
            arg = re.sub(r':\s*\{[^}]*\}', '', arg)  # Remove object type annotations
            arg = re.sub(r':\s*[^=,{}]+', '', arg)   # Remove simple type annotations
            arg = re.sub(r'=.*$', '', arg)           # Remove default values
            arg = arg.strip()

            if arg:
                real_args.append(arg)

        return len(real_args)

    def _split_arguments_safely(self, args_str: str) -> List[str]:
        """Split arguments by comma while respecting nested structures."""
        if not args_str.strip():
            return []

        args = []
        current_arg = ""
        depth = {'braces': 0, 'brackets': 0, 'parens': 0}
        in_string = {'single': False, 'double': False, 'template': False}
        i = 0

        while i < len(args_str):
            char = args_str[i]

            # Handle escape sequences
            if char == '\\' and i + 1 < len(args_str):
                current_arg += char + args_str[i + 1]
                i += 2
                continue

            # Handle string literals
            if char == "'" and not in_string['double'] and not in_string['template']:
                in_string['single'] = not in_string['single']
            elif char == '"' and not in_string['single'] and not in_string['template']:
                in_string['double'] = not in_string['double']
            elif char == '`' and not in_string['single'] and not in_string['double']:
                in_string['template'] = not in_string['template']

            # If we're inside any string, just add the character
            if any(in_string.values()):
                current_arg += char
                i += 1
                continue

            # Track nesting depth outside strings
            if char == '{':
                depth['braces'] += 1
            elif char == '}':
                depth['braces'] -= 1
            elif char == '[':
                depth['brackets'] += 1
            elif char == ']':
                depth['brackets'] -= 1
            elif char == '(':
                depth['parens'] += 1
            elif char == ')':
                depth['parens'] -= 1
            elif char == ',' and all(d == 0 for d in depth.values()):
                # Found a top-level comma, split here
                if current_arg.strip():
                    args.append(current_arg.strip())
                current_arg = ""
                i += 1
                continue

            current_arg += char
            i += 1

        # Add the last argument
        if current_arg.strip():
            args.append(current_arg.strip())

        return args

    def _is_valid_function_declaration(self, line: str, pattern_idx: int, lines: List[str], line_idx: int, in_interface: bool) -> bool:
        """
        Determine if a matched pattern represents a valid function declaration.
        Returns True if it's a valid function declaration, False if it's likely a function call.
        """
        line_stripped = line.strip()

        # Pattern 0: function declarations - these are always valid
        if pattern_idx == 0:
            return True

        # Pattern 1: const name = ... pattern
        elif pattern_idx == 1:
            # Must have '=' and either '=>' or 'function' keyword
            return '=' in line and ('=>' in line or 'function' in line)

        # Pattern 2: object method pattern (methodName: ...)
        elif pattern_idx == 2:
            # Must have ':' and '=>' to be a method declaration
            return ':' in line and '=>' in line

        # Pattern 3: class method pattern - this is the problematic one
        elif pattern_idx == 3:
            # First, check for obvious function calls that should never be method declarations
            if self._is_obvious_function_call(line_stripped):
                return False

            # Check if we're actually in a class context
            if not self._is_in_class_context(lines, line_idx):
                return False

            # Additional checks for class methods
            # Should have visibility modifiers or be inside class body
            has_visibility = any(keyword in line for keyword in ['public', 'private', 'protected', 'static'])

            # Check if line ends with opening brace (method declaration) vs just parenthesis (method call)
            if '{' in line:
                return True

            # If no opening brace, it's likely a method call
            if line_stripped.endswith(');') or line_stripped.endswith(')'):
                return False

            # Look ahead to see if next non-empty line has opening brace
            next_line_idx = line_idx + 1
            while next_line_idx < len(lines) and not lines[next_line_idx].strip():
                next_line_idx += 1

            if next_line_idx < len(lines):
                next_line = lines[next_line_idx].strip()
                if next_line.startswith('{'):
                    return True

            return has_visibility

        return False

    def _is_obvious_function_call(self, line_stripped: str) -> bool:
        """
        Check if a line is obviously a function call rather than a function declaration.
        Returns True for obvious function calls.
        """
        # Common patterns that indicate function calls
        function_call_patterns = [
            # Lines that end with semicolon and parenthesis (function calls)
            r'\w+\([^)]*\);?\s*$',
            # Lines with object method calls (dot notation)
            r'\w+\.\w+\(',
            # Lines that start with 'this.' (method calls)
            r'^\s*this\.\w+\(',
            # Hook calls (useEffect, useState, etc.)
            r'^\s*use\w+\(',
            # Common function calls
            r'^\s*(?:console|setTimeout|setInterval|addEventListener|dispatch|eventBus)\(',
            # Lines with complex call chains
            r'\w+\([^)]*\)\s*\.',
        ]

        for pattern in function_call_patterns:
            if re.search(pattern, line_stripped):
                return True

        # Check for lines that have nested calls or complex expressions
        # These are unlikely to be method declarations
        if (line_stripped.count('(') > 1 or
            line_stripped.count('{') > 1 or
            '(' in line_stripped and '{' in line_stripped and line_stripped.endswith(');')):
            return True

        return False

    def _is_in_class_context(self, lines: List[str], current_line_idx: int) -> bool:
        """
        Check if the current line is within a class declaration.
        Returns True if inside a class body.
        """
        brace_count = 0
        in_class = False

        # Look backwards to find class declaration
        for i in range(current_line_idx, -1, -1):
            line = lines[i].strip()

            # Skip empty lines and comments
            if not line or line.startswith('//') or line.startswith('/*'):
                continue

            # Count braces to track nesting
            brace_count += line.count('}')
            brace_count -= line.count('{')

            # If we find a class declaration and we're inside its braces, return True
            if re.match(r'(?:export\s+)?class\s+\w+', line):
                # If brace_count is 0 or negative, we're inside this class
                return brace_count <= 0

            # If we've gone too far back (outside of current scope), stop
            if brace_count > 0:
                break

        return False

    def find_object_parameter_violations(self, content: str, file_path: Path, max_keys: int = 6) -> List[tuple[int, int, str]]:
        """Find object parameters that violate the Rule of 6 (more than max_keys keys)."""
        violations = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            line_stripped = line.strip()
            
            # Skip comments and empty lines
            if not line_stripped or line_stripped.startswith('//') or line_stripped.startswith('/*'):
                continue
            
            # Look for object parameter patterns
            # Pattern: function foo({ key1, key2, key3, ... }: { ... })
            # Pattern: const foo = ({ key1, key2, key3, ... }) =>
            # Pattern: method({ key1, key2, key3, ... })
            
            # Find destructured object parameters
            destructure_matches = re.findall(r'\{\s*([^}]+)\s*\}[^=]*(?::\s*\{[^}]*\})?(?:\s*=\s*\{[^}]*\})?', line_stripped)
            
            for match in destructure_matches:
                # Count the keys in the destructured object
                keys = [key.strip().split(':')[0].strip() for key in match.split(',') if key.strip()]
                # Filter out spread operators and empty keys
                actual_keys = [key for key in keys if key and not key.startswith('...')]
                
                if len(actual_keys) > max_keys:
                    # Create a preview of the parameters (first few keys)
                    preview_keys = actual_keys[:3]
                    params_preview = ', '.join(preview_keys)
                    if len(actual_keys) > 3:
                        params_preview += f", ... (+{len(actual_keys) - 3} more)"
                    
                    violations.append((i, len(actual_keys), params_preview))
        
        return violations

    def extract_function_names_from_content(self, content: str) -> Set[str]:
        """Extract function names from content for validation purposes."""
        function_names = set()
        
        for pattern in self.function_patterns:
            matches = re.finditer(pattern, content, re.MULTILINE)
            for match in matches:
                func_name = match.group(1)
                if func_name.lower() not in self.excluded_keywords:
                    function_names.add(func_name)
        
        return function_names

    def _extract_function_parameters(self, lines: List[str], start_line_idx: int, name_start_pos: int = 0) -> str:
        """Extract function parameters from opening parenthesis to closing parenthesis."""
        # Find the opening parenthesis
        start_line = lines[start_line_idx]
        paren_pos = start_line.find('(', name_start_pos)
        if paren_pos == -1:
            return ""

        # Start collecting parameters from the opening parenthesis
        paren_count = 0
        params = ""

        for i in range(start_line_idx, len(lines)):
            line = lines[i]

            # Start from the opening parenthesis position on the first line
            start_pos = paren_pos if i == start_line_idx else 0
            line_part = line[start_pos:]

            for char in line_part:
                if char == '(':
                    paren_count += 1
                elif char == ')':
                    paren_count -= 1
                    if paren_count == 0:
                        # Found the closing parenthesis, return the collected parameters
                        return params.strip()

                # Only collect characters inside the parentheses (not the parentheses themselves)
                if paren_count > 0 and char != '(':
                    params += char

            # Add newline if we're continuing to the next line
            if paren_count > 0 and i < len(lines) - 1:
                params += '\n'

        return params.strip()

    def _count_braces_outside_strings(self, line: str) -> int:
        """Count { and } braces while ignoring those inside string literals."""
        brace_count = 0
        in_single_quote = False
        in_double_quote = False
        in_template_literal = False
        i = 0

        while i < len(line):
            char = line[i]

            # Handle escape sequences
            if char == '\\' and i + 1 < len(line):
                i += 2  # Skip the escaped character
                continue

            # Handle string delimiters
            if char == "'" and not in_double_quote and not in_template_literal:
                in_single_quote = not in_single_quote
            elif char == '"' and not in_single_quote and not in_template_literal:
                in_double_quote = not in_double_quote
            elif char == '`' and not in_single_quote and not in_double_quote:
                in_template_literal = not in_template_literal

            # Count braces only if we're not inside any string
            elif not in_single_quote and not in_double_quote and not in_template_literal:
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1

            i += 1

        return brace_count

    def _find_function_boundaries(self, lines: List[str], start_line_idx: int, pattern_idx: Optional[int] = None) -> Tuple[int, int]:
        """Find the start and end line numbers of a function."""
        line_start = start_line_idx + 1  # Convert to 1-indexed

        # Handle arrow functions differently
        if pattern_idx == 1:  # const foo = () => pattern
            # For arrow functions, look for the end of the statement
            brace_count = 0
            found_arrow = False
            arrow_has_braces = False

            for i in range(start_line_idx, len(lines)):
                line = lines[i]

                if '=>' in line:
                    found_arrow = True
                    # Check if this arrow function uses braces
                    if '{' in line:
                        arrow_has_braces = True

                if found_arrow:
                    if arrow_has_braces:
                        # Count braces for multi-line arrow functions
                        brace_count += line.count('{')
                        brace_count -= line.count('}')

                        if brace_count == 0 and i > start_line_idx:  # Make sure we've moved past the start
                            return line_start, i + 1
                    else:
                        # Single-expression arrow function (no braces)
                        if (line.rstrip().endswith(';') or
                            line.rstrip().endswith(',') or
                            i == len(lines) - 1 or
                            # Check if next line starts a new statement
                            (i + 1 < len(lines) and lines[i + 1].strip() and
                             not lines[i + 1].strip().startswith('.') and
                             not lines[i + 1].strip().startswith(')'))):
                            return line_start, i + 1

            return line_start, line_start

        # For regular functions and methods
        brace_count = 0
        found_opening = False

        for i in range(start_line_idx, len(lines)):
            line = lines[i]

            # Skip comments and empty lines when looking for braces
            if line.strip().startswith('//') or line.strip().startswith('/*') or not line.strip():
                continue

            # Count braces while ignoring those inside strings
            line_brace_count = self._count_braces_outside_strings(line)
            brace_count += line_brace_count

            # Mark that we found the opening brace
            if not found_opening and line_brace_count > 0:
                found_opening = True

            # If we've found an opening brace and the count is back to 0, we're done
            if found_opening and brace_count == 0:
                return line_start, i + 1  # Convert to 1-indexed

        # If we can't find the end, return just the start line
        return line_start, line_start