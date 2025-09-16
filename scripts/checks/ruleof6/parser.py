#!/usr/bin/env python3
"""
TypeScript/TSX parsing utilities for Rule of 6 checking.

Handles extraction of functions, arguments, and object parameters from TypeScript code.
"""

import re
from pathlib import Path
from typing import List, Optional, Tuple
import sys
import os

from models import FileAnalysis

# Import shared TypeScript parser
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from shared.typescript_parser import TypeScriptParser as SharedParser, FunctionInfo


class TypeScriptParser:
    """Parses TypeScript/TSX files to extract function information using shared parser."""
    
    def __init__(self):
        self.shared_parser = SharedParser()
    
    def parse_file(self, file_analysis: FileAnalysis, content: str) -> FileAnalysis:
        """Parse file content and extract function information using shared parser."""
        functions = self.shared_parser.extract_functions(content, file_analysis.path)
        
        file_analysis.functions = functions
        file_analysis.function_count = len(functions)
        
        return file_analysis
    
    def find_object_parameter_violations(self, content: str, file_path: Path, max_keys: int = 6):
        """Find object parameter violations using shared parser."""
        return self.shared_parser.find_object_parameter_violations(content, file_path, max_keys)