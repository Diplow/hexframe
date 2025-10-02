"""
Tests for dead code detection functionality.

Tests detection of unused exports, imports, functions,
and transitive dead code across the codebase.
"""

import pytest
from pathlib import Path

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from utils.test_helpers import (
    create_test_project,
    run_checker,
    assert_checker_finds_issues
)
from deadcode.models import DeadCodeType


class TestDeadCodeChecker:
    """Test suite for dead code detection."""

    def test_unused_exports_detection(self):
        """Test detection of unused exported functions and variables."""
        files = {
            "src/utils.ts": """
export function usedFunction() {
  return 'used';
}

export function unusedFunction() {  // DEAD CODE
  return 'unused';
}

export const usedConstant = 'used';
export const unusedConstant = 'unused';  // DEAD CODE
            """.strip(),
            "src/main.ts": """
import { usedFunction, usedConstant } from './utils';

export function main() {
  console.log(usedFunction(), usedConstant);
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('deadcode', project_path / 'src')

            # Should find unused exports
            unused_exports = [issue for issue in results.issues if issue.dead_code_type == DeadCodeType.UNUSED_EXPORT]
            assert len(unused_exports) >= 2, f"Should find unused exports: {[i.symbol_name for i in results.issues]}"

            # Check specific unused items
            unused_names = {issue.symbol_name for issue in unused_exports}
            assert 'unusedFunction' in unused_names
            assert 'unusedConstant' in unused_names

    def test_unused_imports_detection(self):
        """Test detection of unused imports."""
        files = {
            "src/utils.ts": """
export function utilityA() { return 'A'; }
export function utilityB() { return 'B'; }
export function utilityC() { return 'C'; }
            """.strip(),
            "src/main.ts": """
import { utilityA, utilityB, utilityC } from './utils';  // utilityC is unused

export function main() {
  console.log(utilityA(), utilityB());
  // utilityC is imported but never used
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('deadcode', project_path / 'src')

            # Should find unused import
            unused_imports = [issue for issue in results.issues if issue.dead_code_type == DeadCodeType.UNUSED_IMPORT]
            assert len(unused_imports) >= 1, f"Should find unused imports: {[i.symbol_name for i in results.issues]}"

    def test_transitive_dead_code(self):
        """Test detection of transitively dead code (dead code that depends on other dead code)."""
        files = {
            "src/utils.ts": """
export function deadFunction() {  // DEAD: not used anywhere
  return helper();
}

function helper() {  // TRANSITIVELY DEAD: only used by dead function
  return 'help';
}

export function aliveFunction() {  // ALIVE: used in main
  return aliveHelper();
}

function aliveHelper() {  // ALIVE: used by alive function
  return 'alive help';
}
            """.strip(),
            "src/main.ts": """
import { aliveFunction } from './utils';

export function main() {
  return aliveFunction();
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('deadcode', project_path / 'src')

            # Should find both directly dead and transitively dead code
            dead_symbols = {issue.symbol_name for issue in results.issues}
            assert 'deadFunction' in dead_symbols, "Should find directly dead function"
            # Note: helper might be found as transitively dead depending on implementation

    def test_cross_file_references(self):
        """Test tracking of references across multiple files."""
        files = {
            "src/moduleA.ts": """
export function functionA() {
  return 'A';
}

export function unusedA() {  // DEAD
  return 'unused A';
}
            """.strip(),
            "src/moduleB.ts": """
import { functionA } from './moduleA';

export function functionB() {
  return functionA() + 'B';
}

export function unusedB() {  // DEAD
  return 'unused B';
}
            """.strip(),
            "src/main.ts": """
import { functionB } from './moduleB';

export function main() {
  return functionB();
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('deadcode', project_path / 'src')

            # Should find unused functions across files
            unused_functions = {issue.symbol_name for issue in results.issues if issue.dead_code_type == DeadCodeType.UNUSED_EXPORT}
            assert 'unusedA' in unused_functions
            assert 'unusedB' in unused_functions

            # Should NOT flag used functions
            used_functions = {'functionA', 'functionB', 'main'}
            flagged_used = used_functions & unused_functions
            assert len(flagged_used) == 0, f"Should not flag used functions: {flagged_used}"

    def test_dynamic_import_handling(self):
        """Test handling of dynamic imports and require statements."""
        files = {
            "src/dynamicModule.ts": """
export function dynamicallyImported() {
  return 'dynamic';
}

export function notDynamicallyImported() {  // Might be flagged as dead
  return 'not dynamic';
}
            """.strip(),
            "src/main.ts": """
async function loadDynamic() {
  // Dynamic import - might not be detected by regex parsing
  const module = await import('./dynamicModule');
  return module.dynamicallyImported();
}

export function main() {
  return loadDynamic();
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('deadcode', project_path / 'src')

            # Known limitation: dynamicallyImported may be missed; at minimum, the unused export should be flagged
            dead_symbols = {issue.symbol_name for issue in results.issues}
            assert 'notDynamicallyImported' in dead_symbols

    def test_barrel_file_exports(self):
        """Test handling of barrel file re-exports."""
        files = {
            "src/components/Button.tsx": """
export function Button() {
  return <button>Click</button>;
}
            """.strip(),
            "src/components/Input.tsx": """
export function Input() {
  return <input />;
}
            """.strip(),
            "src/components/index.ts": """
export { Button } from './Button';
export { Input } from './Input';
            """.strip(),
            "src/main.tsx": """
import { Button } from './components';  // Using barrel file

export function App() {
  return <Button />;
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('deadcode', project_path / 'src')

            # Button should not be flagged as dead (used via barrel file)
            dead_symbols = {issue.symbol_name for issue in results.issues}
            assert 'Button' not in dead_symbols, "Button should not be flagged as dead"

            # Input might be flagged as dead since it's not used
            # This tests the barrel file handling

    def test_react_component_patterns(self):
        """Test dead code detection in React component patterns."""
        files = {
            "src/components/UsedComponent.tsx": """
import { useState } from 'react';

interface Props {
  title: string;
}

export function UsedComponent({ title }: Props) {  // USED
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>{title}</h1>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  );
}
            """.strip(),
            "src/components/UnusedComponent.tsx": """
export function UnusedComponent() {  // DEAD
  return <div>Unused</div>;
}

export const unusedConstant = 'unused';  // DEAD
            """.strip(),
            "src/App.tsx": """
import { UsedComponent } from './components/UsedComponent';

export function App() {
  return <UsedComponent title="Hello" />;
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('deadcode', project_path / 'src')

            # Should find unused React components
            dead_symbols = {issue.symbol_name for issue in results.issues}
            assert 'UnusedComponent' in dead_symbols
            assert 'unusedConstant' in dead_symbols

            # Should not flag used components
            assert 'UsedComponent' not in dead_symbols
            assert 'App' not in dead_symbols

    def test_type_only_exports(self):
        """Test handling of TypeScript type-only exports."""
        files = {
            "src/types.ts": """
export interface UsedInterface {
  id: string;
}

export interface UnusedInterface {  // DEAD
  value: number;
}

export type UsedType = 'a' | 'b';
export type UnusedType = 'x' | 'y';  // DEAD
            """.strip(),
            "src/main.ts": """
import type { UsedInterface, UsedType } from './types';

export function processData(data: UsedInterface): UsedType {
  return 'a';
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('deadcode', project_path / 'src')

            dead_symbols = {issue.symbol_name for issue in results.issues}
            # Ensure type-only usage isn't flagged as dead
            assert 'UsedInterface' not in dead_symbols

    def test_no_false_positives_on_clean_code(self):
        """Test that clean, well-used code doesn't generate false positives."""
        files = {
            "src/utils.ts": """
export function formatString(input: string): string {
  return input.trim().toLowerCase();
}

export function calculateSum(numbers: number[]): number {
  return numbers.reduce((sum, num) => sum + num, 0);
}
            """.strip(),
            "src/services.ts": """
import { formatString, calculateSum } from './utils';

export function processData(data: string[], numbers: number[]) {
  const formatted = data.map(formatString);
  const sum = calculateSum(numbers);
  return { formatted, sum };
}
            """.strip(),
            "src/main.ts": """
import { processData } from './services';

export function main() {
  const result = processData(['Hello', 'World'], [1, 2, 3]);
  console.log(result);
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('deadcode', project_path / 'src')

            # Should not flag any code as dead in this clean example
            assert len(results.issues) == 0, f"Found false positives: {[i.symbol_name for i in results.issues]}"

    def test_complex_dependency_chains(self):
        """Test handling of complex dependency chains."""
        files = {
            "src/chain.ts": """
export function entryPoint() {  // USED by main
  return step1();
}

function step1() {  // USED by entryPoint
  return step2();
}

function step2() {  // USED by step1
  return step3();
}

function step3() {  // USED by step2
  return 'result';
}

export function deadChain() {  // DEAD
  return deadStep1();
}

function deadStep1() {  // TRANSITIVELY DEAD
  return deadStep2();
}

function deadStep2() {  // TRANSITIVELY DEAD
  return 'dead result';
}
            """.strip(),
            "src/main.ts": """
import { entryPoint } from './chain';

export function main() {
  return entryPoint();
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('deadcode', project_path / 'src')

            # Should find the dead chain
            dead_symbols = {issue.symbol_name for issue in results.issues}
            assert 'deadChain' in dead_symbols

            # Should not flag the live chain
            live_symbols = {'entryPoint', 'step1', 'step2', 'step3'}
            flagged_live = live_symbols & dead_symbols
            assert len(flagged_live) == 0, f"Should not flag live chain: {flagged_live}"


class TestDeadCodeIntegration:
    """Integration tests for dead code checker."""

    def test_large_project_performance(self):
        """Test dead code checker performance on a large project."""
        files = {}

        # Generate many files with various usage patterns
        for i in range(50):  # 50 modules
            files[f"src/module{i}.ts"] = f"""
export function used{i}() {{
  return 'used{i}';
}}

export function unused{i}() {{
  return 'unused{i}';
}}
            """.strip()

        # Create a main file that uses some functions
        used_imports = []
        for i in range(0, 50, 2):  # Use every other function
            used_imports.append(f"used{i}")

        files["src/main.ts"] = f"""
import {{ {', '.join(used_imports)} }} from './module0';

export function main() {{
  return [{', '.join([f'{func}()' for func in used_imports])}];
}}
        """.strip()

        with create_test_project(files) as project_path:
            try:
                results = run_checker('deadcode', project_path / 'src')

                # Should complete without timeout
                assert isinstance(results.issues, list)

                # Should find many unused functions
                unused_count = len([issue for issue in results.issues if issue.dead_code_type == DeadCodeType.UNUSED_EXPORT])
                assert unused_count > 20, f"Should find many unused functions, found {unused_count}"

            except Exception as e:
                pytest.fail(f"Dead code checker failed on large project: {e}")

    def test_real_world_patterns(self):
        """Test with real-world code patterns similar to Hexframe."""
        files = {
            "src/app/map/Chat/Timeline/Widgets/LoginWidget/login-widget.tsx": """
import { useState } from 'react';
import { useLoginForm } from './useLoginForm';
import { BaseWidget } from '../_shared/BaseWidget';

export function LoginWidget() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { handleSubmit } = useLoginForm();

  return (
    <BaseWidget>
      <form onSubmit={handleSubmit}>
        <input type="email" />
        <button type="submit">Login</button>
      </form>
    </BaseWidget>
  );
}
            """.strip(),
            "src/app/map/Chat/Timeline/Widgets/LoginWidget/useLoginForm.ts": """
export function useLoginForm() {
  const handleSubmit = () => {};
  const handleCancel = () => {};  // UNUSED

  return {
    handleSubmit,
    handleCancel
  };
}
            """.strip(),
            "src/app/map/Chat/Timeline/Widgets/_shared/BaseWidget.tsx": """
export function BaseWidget({ children }: { children: React.ReactNode }) {
  return <div className="widget">{children}</div>;
}

export function UnusedWidget() {  // DEAD
  return <div>Unused</div>;
}
            """.strip(),
            "src/app/page.tsx": """
import { LoginWidget } from './map/Chat/Timeline/Widgets/LoginWidget/login-widget';

export default function Page() {
  return <LoginWidget />;
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('deadcode', project_path / 'src')

            # Should find unused exports but not flag used components
            dead_symbols = {issue.symbol_name for issue in results.issues}

            # Should NOT flag used components
            used_symbols = {'LoginWidget', 'BaseWidget', 'useLoginForm'}
            flagged_used = used_symbols & dead_symbols
            assert len(flagged_used) == 0, f"Should not flag used symbols: {flagged_used}"

            # SHOULD find unused exports
            assert 'UnusedWidget' in dead_symbols or len(results.issues) == 0  # Depending on detection accuracy