#!/usr/bin/env python3
"""
TypeScript/TSX parsing utilities for Rule of 6 checking.

Handles extraction of functions, arguments, and object parameters from TypeScript code.
"""

import re
from pathlib import Path
from typing import List, Optional, Tuple
from models import FunctionInfo, FileAnalysis


class TypeScriptParser:
    """Parses TypeScript/TSX files to extract function information."""
    
    def __init__(self):
        # Keywords to exclude (control flow, etc.)
        self.excluded_keywords = {
            'if', 'else', 'for', 'while', 'switch', 'case', 'default', 'try', 'catch', 
            'finally', 'with', 'return', 'throw', 'break', 'continue', 'do', 'typeof',
            'instanceof', 'in', 'new', 'delete', 'void', 'yield', 'await'
        }
        
        # Function declaration patterns (more specific to avoid control flow)
        self.function_patterns = [
            r'(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)',  # function declarations
            r'(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>',  # arrow functions
            r'(\w+)\s*:\s*(?:async\s*)?\(([^)]*)\)\s*=>',  # object method arrow functions
            r'(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{',  # class methods
        ]
    
    def parse_file(self, file_analysis: FileAnalysis, content: str) -> FileAnalysis:
        """Parse file content and extract function information."""
        functions = self._extract_functions(content, file_analysis.path)
        
        file_analysis.functions = functions
        file_analysis.function_count = len(functions)
        
        return file_analysis
    
    def _extract_functions(self, content: str, file_path: Path) -> List[FunctionInfo]:
        """Extract function information from file content."""
        functions = []
        lines = content.split('\n')
        
        i = 0
        while i < len(lines):
            line = lines[i].strip()
            
            # Skip comments and empty lines
            if not line or line.startswith('//') or line.startswith('/*'):
                i += 1
                continue
            
            function_match = None
            for pattern in self.function_patterns:
                match = re.search(pattern, line)
                if match:
                    func_name = match.group(1)
                    # Skip if it's a control flow keyword
                    if func_name.lower() not in self.excluded_keywords:
                        function_match = match
                        break
            
            if function_match:
                func_name = function_match.group(1)
                args_str = function_match.group(2) if len(function_match.groups()) > 1 else ""
                
                # Count arguments
                arg_count = self._count_arguments(args_str)
                
                # Find function boundaries and count lines
                line_start, line_end = self._find_function_boundaries(lines, i)
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
    
    def _count_arguments(self, args_str: str) -> int:
        """Count arguments in function signature."""
        if not args_str.strip():
            return 0
        
        args = [arg.strip() for arg in args_str.split(',') if arg.strip()]
        
        # Filter out empty args and type annotations
        real_args = []
        for arg in args:
            # Remove type annotations and default values
            arg = arg.split(':')[0].split('=')[0].strip()
            if arg and arg != '':
                real_args.append(arg)
        
        return len(real_args)
    
    def _find_function_boundaries(self, lines: List[str], start_index: int) -> Tuple[int, int]:
        """Find the start and end lines of a function."""
        line_start = start_index + 1  # Convert to 1-based line numbers
        
        # Look for opening brace
        brace_count = 0
        found_opening_brace = False
        
        # Check next few lines for opening brace
        for j in range(start_index, min(start_index + 5, len(lines))):
            if '{' in lines[j]:
                found_opening_brace = True
                brace_count = lines[j].count('{') - lines[j].count('}')
                break
        
        if found_opening_brace:
            # Find matching closing brace
            j = start_index + 1
            while j < len(lines) and brace_count > 0:
                brace_count += lines[j].count('{') - lines[j].count('}')
                j += 1
            line_end = j
        else:
            # Arrow function or single line
            line_end = start_index + 1
            for j in range(start_index + 1, min(start_index + 10, len(lines))):
                if lines[j].strip().endswith(';') or lines[j].strip().endswith(','):
                    line_end = j + 1
                    break
        
        return line_start, line_end
    
    def find_object_parameter_violations(self, content: str, file_path: Path, max_keys: int = 6) -> List[Tuple[int, int, str]]:
        """Find object parameters with too many keys."""
        violations = []
        lines = content.split('\n')
        
        for i, line in enumerate(lines, 1):
            # Look for object destructuring in function parameters
            obj_param_match = re.search(r'\{\s*([^}]+)\s*\}\s*:', line)
            if obj_param_match:
                params_str = obj_param_match.group(1)
                params = [p.strip() for p in params_str.split(',')]
                # Filter out empty params and spread operators
                params = [p for p in params if p and not p.startswith('...')]
                
                if len(params) > max_keys:
                    violations.append((i, len(params), params_str[:50] + "..." if len(params_str) > 50 else params_str))
        
        return violations