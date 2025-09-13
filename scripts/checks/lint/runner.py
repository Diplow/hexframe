#!/usr/bin/env python3
"""
ESLint runner module.

Handles executing ESLint with proper environment setup and output capture.
"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple


class ESLintRunner:
    """Runs ESLint and captures output."""
    
    def __init__(self, project_root: Optional[Path] = None):
        """Initialize the runner with project root path."""
        self.project_root = project_root or Path(__file__).parent.parent.parent.parent
        
    def run_eslint(self, format_type: str = "json") -> Tuple[bool, str, str]:
        """
        Run ESLint on the entire project.
        
        Args:
            format_type: Output format ("json", "compact", etc.)
            
        Returns:
            Tuple of (success: bool, stdout: str, stderr: str)
        """
        # Use current environment with SKIP_ENV_VALIDATION for linting
        # This is needed because linting doesn't require database connections
        env = os.environ.copy()
        env["SKIP_ENV_VALIDATION"] = "true"
        
        # For JSON format, write to a temporary file to avoid buffer limits
        if format_type == "json":
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
                temp_path = temp_file.name
                
            # Build ESLint command with output file - always run on entire project
            cmd = ["pnpm", "lint", f"--format={format_type}", "--output-file", temp_path]
                
            try:
                # Run ESLint
                result = subprocess.run(
                    cmd,
                    cwd=self.project_root,
                    capture_output=True,
                    text=True,
                    env=env,
                    timeout=300
                )
                
                # Read JSON from temp file
                try:
                    with open(temp_path, 'r') as f:
                        json_content = f.read()
                finally:
                    # Clean up temp file
                    os.unlink(temp_path)
                
                return (
                    result.returncode == 0,
                    json_content,  # JSON content from file
                    result.stderr  # Keep stderr for error messages
                )
                
            except (subprocess.SubprocessError, OSError) as e:
                # Clean up temp file on error
                if os.path.exists(temp_path):
                    os.unlink(temp_path)
                raise e
        else:
            # For non-JSON formats, use regular approach - always run on entire project
            cmd = ["pnpm", "lint", f"--format={format_type}"]
            
            try:
                # Run ESLint (for non-JSON formats)
                result = subprocess.run(
                    cmd,
                    cwd=self.project_root,
                    capture_output=True,
                    text=True,
                    env=env,
                    timeout=300
                )
                
                return (
                    result.returncode == 0,
                    result.stdout,
                    result.stderr
                )
                
            except subprocess.SubprocessError as e:
                return False, "", f"Failed to run ESLint: {e}"
            except FileNotFoundError:
                return False, "", "ESLint command not found. Make sure pnpm and dependencies are installed."
    
    def run_with_json_output(self) -> Tuple[bool, Optional[List[Dict]], str]:
        """
        Run ESLint on entire project and return parsed JSON output.
        
        Returns:
            Tuple of (success: bool, parsed_json: Optional[List[Dict]], error_message: str)
        """
        success, stdout, stderr = self.run_eslint("json")
        
        # Check for environment validation errors that prevent ESLint from running
        if stderr and "Invalid environment variables" in stderr:
            return False, None, "Environment validation failed. Please ensure all required environment variables are set in your .env file before running lint checks."
        
        # Handle case where pnpm failed (exit code 1) but ESLint might have produced JSON
        # pnpm wraps the actual ESLint output with its own headers/footers
        
        # Parse JSON output (stdout now contains the complete JSON from file)
        if stdout and stdout.strip():
            try:
                json_data = json.loads(stdout.strip())
                return True, json_data, ""
            except json.JSONDecodeError as e:
                return False, None, f"Failed to parse ESLint JSON output: {e}"
        
        # No JSON output - check if this is a successful run with no issues
        if not stderr or "ELIFECYCLE" in stderr:
            # No output likely means no files to lint or no issues found
            return True, [], ""
        
        # ESLint configuration or execution error
        return False, None, f"ESLint execution failed.\nError: {stderr[:200] if stderr else 'Unknown error'}"
    
    def check_eslint_available(self) -> Tuple[bool, str]:
        """
        Check if ESLint is available and properly configured.
        
        Returns:
            Tuple of (available: bool, message: str)
        """
        try:
            # Check if pnpm is available
            result = subprocess.run(
                ["pnpm", "--version"],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                return False, "pnpm not found. Please install pnpm."
            
            # Check if package.json has lint script
            package_json_path = self.project_root / "package.json"
            if not package_json_path.exists():
                return False, "package.json not found in project root."
            
            try:
                with open(package_json_path, 'r') as f:
                    package_data = json.load(f)
                    scripts = package_data.get('scripts', {})
                    if 'lint' not in scripts:
                        return False, "No 'lint' script found in package.json."
            except (json.JSONDecodeError, IOError) as e:
                return False, f"Failed to read package.json: {e}"
            
            return True, "ESLint is available and configured."
            
        except FileNotFoundError:
            return False, "pnpm command not found. Please install pnpm."
        except Exception as e:
            return False, f"Error checking ESLint availability: {e}"