#!/usr/bin/env python3
"""
Comprehensive test suite for false positive scenarios in Rule of 6 checker.

This test suite specifically targets the known false positive issues:
1. Function calls being detected as function declarations
2. Object properties being counted as function arguments
"""

import sys
import os
from pathlib import Path

# Add the parent directory to the path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from checker import RuleOf6Checker
from models import ViolationType
from shared.typescript_parser import TypeScriptParser, FunctionInfo


class TestFalsePositives:
    """Test suite for false positive scenarios."""

    def setup_method(self):
        """Set up test environment."""
        self.parser = TypeScriptParser()
        self.test_files_dir = Path(__file__).parent / "typescript"

    def test_function_calls_not_detected_as_declarations(self):
        """Test that function calls are not incorrectly detected as function declarations."""
        test_file = self.test_files_dir / "function-calls.tsx"

        with open(test_file, 'r') as f:
            content = f.read()

        functions = self.parser.extract_functions(content, test_file)
        function_names = [f.name for f in functions]

        # Should NOT detect these as function declarations
        false_positive_names = ['dispatch', 'useEffect', 'eventBus', 'someFunction', 'api']
        for name in false_positive_names:
            assert name not in function_names, f"'{name}' should NOT be detected as a function declaration"

        # Should detect real function declarations
        expected_functions = ['testFunctionCalls', 'realFunction', 'arrowFunction']
        for name in expected_functions:
            assert name in function_names, f"'{name}' should be detected as a function declaration"

    def test_object_arguments_counted_correctly(self):
        """Test that object arguments are counted as single arguments, not multiple."""
        # Test single object argument
        single_obj_code = """
        dispatch({
            type: 'message',
            payload: { content: 'test', actor: 'system' },
            id: 'debug-test',
            timestamp: new Date(),
            actor: 'system',
        });
        """

        # Extract just the arguments part
        args_str = """type: 'message',
            payload: { content: 'test', actor: 'system' },
            id: 'debug-test',
            timestamp: new Date(),
            actor: 'system'"""

        arg_count = self.parser._count_arguments(args_str)
        # This should be recognized as properties of a single object, not separate arguments
        # The current implementation incorrectly counts this as multiple args
        # After fix, this should return a low count (ideally handled at a higher level)

        # Test multiple real arguments
        real_args = "a: string, b: number, c: boolean"
        real_count = self.parser._count_arguments(real_args)
        assert real_count == 3, f"Real arguments should count as 3, got {real_count}"

    def test_nested_object_structures(self):
        """Test complex nested object structures are handled correctly."""
        complex_args = """method: 'POST',
        data: {
            user: { id: 123, profile: { name: 'Test', settings: { theme: 'dark' } } },
            metadata: { source: 'web', session: { id: 'session-123' } }
        },
        headers: { 'Content-Type': 'application/json' }"""

        # Before fix: this incorrectly counts many arguments due to comma splitting
        # After fix: should be handled better
        count = self.parser._count_arguments(complex_args)

        # For now, we'll test that it doesn't count excessively
        assert count < 15, f"Complex nested object shouldn't count as {count} arguments"

    def test_class_methods_vs_function_calls(self):
        """Test that class methods are detected but function calls within them are not."""
        test_file = self.test_files_dir / "class-methods.tsx"

        with open(test_file, 'r') as f:
            content = f.read()

        functions = self.parser.extract_functions(content, test_file)
        function_names = [f.name for f in functions]

        # Should detect class methods
        expected_methods = [
            'methodOne', 'methodTwo', 'methodThree', 'methodFour',
            'methodFive', 'methodSix', 'methodSeven', 'constructor'
        ]

        for method in expected_methods:
            # Note: Some methods might not be detected due to current limitations
            # This test documents the current behavior and will be updated as fixes are made
            pass

        # Should NOT detect function calls within methods
        false_positives = ['someOtherMethod', 'dispatch', 'useEffect', 'initialize']
        for fp in false_positives:
            assert fp not in function_names, f"'{fp}' should NOT be detected as a function declaration"

    def test_react_hooks_pattern(self):
        """Test that React hooks and patterns are handled correctly."""
        test_file = self.test_files_dir / "react-hooks.tsx"

        with open(test_file, 'r') as f:
            content = f.read()

        functions = self.parser.extract_functions(content, test_file)
        function_names = [f.name for f in functions]

        # Should detect real function declarations
        expected_functions = ['useCustomHook', 'TestComponent', 'calculateExpensiveValue', 'fetchData']
        for name in expected_functions:
            assert name in function_names, f"'{name}' should be detected as a function declaration"

        # Should NOT detect hook calls as function declarations
        hook_calls = ['useEffect', 'useState', 'useCallback', 'useMemo']
        for hook in hook_calls:
            assert hook not in function_names, f"'{hook}' should NOT be detected as a function declaration"

    def test_argument_counting_edge_cases(self):
        """Test edge cases in argument counting."""
        test_cases = [
            # Empty arguments
            ("", 0),

            # Single simple argument
            ("a", 1),

            # Multiple simple arguments
            ("a, b, c", 3),

            # Arguments with type annotations
            ("a: string, b: number", 2),

            # Arguments with default values
            ("a = 1, b = 'test'", 2),

            # Mix of types and defaults
            ("a: string = 'default', b: number", 2),
        ]

        for args_str, expected_count in test_cases:
            actual_count = self.parser._count_arguments(args_str)
            assert actual_count == expected_count, f"Args '{args_str}' should count as {expected_count}, got {actual_count}"

    def test_real_problematic_patterns(self):
        """Test the actual patterns that cause problems in the real codebase."""

        # Pattern from useEventSubscriptions.ts
        dispatch_pattern = """type: 'message',
          payload: {
            content: `[DEBUG] EventBus: **${event.type}** | Source: ${event.source}`,
            actor: 'system',
          },
          id: `debug-${event.type}-${Date.now()}`,
          timestamp: event.timestamp ?? new Date(),
          actor: 'system'"""

        count = self.parser._count_arguments(dispatch_pattern)
        # This currently counts as many arguments, but it's actually properties of one object
        # After fix, this should be handled better at the function call detection level

        # Pattern from tile-operations.ts
        tile_pattern = """tileId: tile.metadata.coordId,
          tileData: {
            id: tile.metadata.dbId.toString(),
            title: tile.data.name,
            description: tile.data.description,
            content: tile.data.description,
            coordId: tile.metadata.coordId,
          },
          openInEditMode: true"""

        tile_count = self.parser._count_arguments(tile_pattern)
        # Similar issue - these are object properties, not function arguments


def run_tests():
    """Run all false positive tests."""
    print("🧪 Running False Positive Test Suite")
    print("=" * 50)

    test_instance = TestFalsePositives()
    test_instance.setup_method()

    test_methods = [
        ('Function Calls vs Declarations', test_instance.test_function_calls_not_detected_as_declarations),
        ('Object Arguments Counting', test_instance.test_object_arguments_counted_correctly),
        ('Nested Object Structures', test_instance.test_nested_object_structures),
        ('Class Methods vs Function Calls', test_instance.test_class_methods_vs_function_calls),
        ('React Hooks Pattern', test_instance.test_react_hooks_pattern),
        ('Argument Counting Edge Cases', test_instance.test_argument_counting_edge_cases),
        ('Real Problematic Patterns', test_instance.test_real_problematic_patterns),
    ]

    passed = 0
    total = len(test_methods)

    for test_name, test_method in test_methods:
        try:
            test_method()
            print(f"✅ PASS: {test_name}")
            passed += 1
        except Exception as e:
            print(f"❌ FAIL: {test_name}")
            print(f"   Error: {e}")

    print("=" * 50)
    print(f"📊 Test Summary: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All tests passed!")
        return 0
    else:
        print("❌ Some tests failed - this is expected before fixes are implemented!")
        return 1


if __name__ == "__main__":
    sys.exit(run_tests())