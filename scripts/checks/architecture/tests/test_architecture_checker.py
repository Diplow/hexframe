"""
Tests for architecture boundary checking functionality.

Tests subsystem boundaries, domain rules, import patterns,
and complexity rules enforcement.
"""

import pytest
from pathlib import Path

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from utils.test_helpers import (
    create_test_project,
    run_checker,
    assert_no_false_positives,
    assert_checker_finds_issues
)
from architecture.checker import ArchitectureChecker
from architecture.models import ErrorType


class TestArchitectureChecker:
    """Test suite for architecture boundary checking."""

    def test_valid_project_structure(self):
        """Test that a well-structured project passes all checks."""
        files = {
            "src/app/page.tsx": """
import { Button } from '~/components/ui/button';
import { getUsers } from '~/lib/domains/auth/services';

export default function HomePage() {
  return <Button>Home</Button>;
}
            """.strip(),
            "src/components/ui/button.tsx": """
export function Button({ children }: { children: React.ReactNode }) {
  return <button>{children}</button>;
}
            """.strip(),
            "src/lib/domains/auth/services.ts": """
export function getUsers() {
  return [];
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('architecture', project_path / 'src')

            # Should not have any errors for a well-structured project
            assert len(results.errors) == 0, f"Found unexpected errors: {[e.message for e in results.errors]}"

    def test_subsystem_boundary_violations(self):
        """Test detection of subsystem boundary violations."""
        files = {
            "src/app/admin/page.tsx": """
// VIOLATION: app/admin importing from app/user directly
import { UserComponent } from '../../user/components/UserComponent';

export default function AdminPage() {
  return <UserComponent />;
}
            """.strip(),
            "src/app/user/components/UserComponent.tsx": """
export function UserComponent() {
  return <div>User</div>;
}
            """.strip(),
            "src/app/shared/components/Layout.tsx": """
export function Layout({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('architecture', project_path / 'src')

            # Should find boundary violation
            boundary_errors = [e for e in results.errors if e.error_type == ErrorType.SUBSYSTEM_BOUNDARY]
            assert len(boundary_errors) > 0, "Should detect subsystem boundary violation"

    def test_domain_isolation_rules(self):
        """Test that domain boundaries are enforced."""
        files = {
            "src/lib/domains/auth/services.ts": """
// VIOLATION: auth domain importing directly from mapping domain
import { getMapItem } from '../mapping/services/item-crud';

export function getUserWithMap() {
  return getMapItem();
}
            """.strip(),
            "src/lib/domains/mapping/services/item-crud.ts": """
export function getMapItem() {
  return { id: 1 };
}
            """.strip(),
            "src/lib/domains/shared/types.ts": """
export interface BaseEntity {
  id: number;
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('architecture', project_path / 'src')

            # Should find domain boundary violation
            domain_errors = [e for e in results.errors if e.error_type == ErrorType.DOMAIN_BOUNDARY]
            assert len(domain_errors) > 0, "Should detect domain boundary violation"

    def test_import_pattern_enforcement(self):
        """Test enforcement of absolute vs relative import rules."""
        files = {
            "src/app/components/Header.tsx": """
// VIOLATION: Should use absolute imports with ~/
import { Button } from '../../../components/ui/button';
import { utils } from '../../lib/utils';

export function Header() {
  return <Button>Header</Button>;
}
            """.strip(),
            "src/components/ui/button.tsx": """
export function Button({ children }: { children: React.ReactNode }) {
  return <button>{children}</button>;
}
            """.strip(),
            "src/lib/utils.ts": """
export const utils = {};
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('architecture', project_path / 'src')

            # Should find import pattern violations
            import_errors = [e for e in results.errors if e.error_type == ErrorType.IMPORT_PATTERN]
            assert len(import_errors) > 0, "Should detect relative import violations"

    def test_rule_of_6_violations(self):
        """Test detection of Rule of 6 complexity violations."""
        files = {
            "src/utils/complex.ts": """
// VIOLATION: Too many functions in one file
export function func1() {}
export function func2() {}
export function func3() {}
export function func4() {}
export function func5() {}
export function func6() {}
export function func7() {}  // 7th function violates Rule of 6
export function func8() {}
            """.strip(),
            "src/utils/large-function.ts": f"""
export function tooManyArgs(
  arg1: string,
  arg2: number,
  arg3: boolean,
  arg4: object,
  arg5: any,
  arg6: unknown,
  arg7: never  // 7th argument violates Rule of 6
) {{
  // Very long function body
  {chr(10).join(['  console.log("line");'] * 60)}  // 60+ lines violates Rule of 6
}}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('architecture', project_path / 'src')

            # Should find complexity violations
            complexity_errors = [e for e in results.errors if e.error_type == ErrorType.COMPLEXITY]
            assert len(complexity_errors) > 0, "Should detect Rule of 6 violations"

    def test_valid_shared_imports(self):
        """Test that imports from shared modules are allowed."""
        files = {
            "src/app/admin/page.tsx": """
import { Layout } from '~/app/shared/components/Layout';
import { formatDate } from '~/lib/shared/utils';

export default function AdminPage() {
  return <Layout>Admin {formatDate(new Date())}</Layout>;
}
            """.strip(),
            "src/app/user/page.tsx": """
import { Layout } from '~/app/shared/components/Layout';
import { formatDate } from '~/lib/shared/utils';

export default function UserPage() {
  return <Layout>User {formatDate(new Date())}</Layout>;
}
            """.strip(),
            "src/app/shared/components/Layout.tsx": """
export function Layout({ children }: { children: React.ReactNode }) {
  return <div className="layout">{children}</div>;
}
            """.strip(),
            "src/lib/shared/utils.ts": """
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('architecture', project_path / 'src')

            # Should allow shared imports
            assert len(results.errors) == 0, f"Shared imports should be allowed: {[e.message for e in results.errors]}"

    def test_external_library_imports_allowed(self):
        """Test that imports from external libraries are always allowed."""
        files = {
            "src/app/page.tsx": """
import React from 'react';
import { NextPage } from 'next';
import { Button } from '@radix-ui/react-button';
import { cn } from 'clsx';
import { format } from 'date-fns';

export const HomePage: NextPage = () => {
  return (
    <div>
      <Button className={cn('button')}>
        {format(new Date(), 'yyyy-MM-dd')}
      </Button>
    </div>
  );
};
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('architecture', project_path / 'src')

            # External imports should always be allowed
            assert len(results.errors) == 0, f"External imports should be allowed: {[e.message for e in results.errors]}"

    def test_nested_subsystem_structure(self):
        """Test handling of deeply nested subsystem structures."""
        files = {
            "src/app/admin/users/components/UserList.tsx": """
import { UserCard } from './UserCard';
import { useUsers } from '../hooks/useUsers';

export function UserList() {
  const users = useUsers();
  return (
    <div>
      {users.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  );
}
            """.strip(),
            "src/app/admin/users/components/UserCard.tsx": """
export function UserCard({ user }: { user: any }) {
  return <div>{user.name}</div>;
}
            """.strip(),
            "src/app/admin/users/hooks/useUsers.ts": """
export function useUsers() {
  return [];
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('architecture', project_path / 'src')

            # Nested subsystem imports should be allowed
            assert len(results.errors) == 0, f"Nested subsystem structure should be valid: {[e.message for e in results.errors]}"

    def test_barrel_file_patterns(self):
        """Test handling of barrel file export patterns."""
        files = {
            "src/components/ui/index.ts": """
export { Button } from './button';
export { Input } from './input';
export { Select } from './select';
export type { ButtonProps } from './button';
            """.strip(),
            "src/components/ui/button.tsx": """
export interface ButtonProps {
  children: React.ReactNode;
}

export function Button({ children }: ButtonProps) {
  return <button>{children}</button>;
}
            """.strip(),
            "src/app/page.tsx": """
import { Button, Input } from '~/components/ui';

export default function Page() {
  return (
    <div>
      <Button>Click me</Button>
      <Input />
    </div>
  );
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('architecture', project_path / 'src')

            # Barrel file patterns should be allowed
            assert len(results.errors) == 0, f"Barrel file patterns should be valid: {[e.message for e in results.errors]}"


class TestArchitectureIntegration:
    """Integration tests for architecture checker with real scenarios."""

    def test_hexframe_like_structure(self):
        """Test with a structure similar to the actual Hexframe codebase."""
        files = {
            "src/app/map/Chat/Timeline/Widgets/LoginWidget/login-widget.tsx": """
import { useState } from 'react';
import { User } from 'lucide-react';
import { FormFields } from '~/app/map/Chat/Timeline/Widgets/LoginWidget/FormFields';
import { BaseWidget, WidgetHeader } from '~/app/map/Chat/Timeline/Widgets/_shared';

export function LoginWidget() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  return (
    <BaseWidget>
      <WidgetHeader icon={<User />} title="Login" />
    </BaseWidget>
  );
}
            """.strip(),
            "src/app/map/Chat/Timeline/Widgets/_shared/BaseWidget.tsx": """
export function BaseWidget({ children }: { children: React.ReactNode }) {
  return <div className="widget">{children}</div>;
}
            """.strip(),
            "src/app/map/Chat/Timeline/Widgets/_shared/WidgetHeader.tsx": """
export function WidgetHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return <div className="header">{icon} {title}</div>;
}
            """.strip(),
            "src/app/map/Chat/Timeline/Widgets/_shared/index.ts": """
export { BaseWidget } from './BaseWidget';
export { WidgetHeader } from './WidgetHeader';
            """.strip(),
            "src/lib/domains/mapping/services/item-crud.ts": """
export function createMapItem() {
  return { id: 1 };
}
            """.strip()
        }

        with create_test_project(files) as project_path:
            results = run_checker('architecture', project_path / 'src')

            # Hexframe-like structure should be valid
            assert len(results.errors) == 0, f"Hexframe structure should be valid: {[e.message for e in results.errors]}"

    def test_mixed_violations_in_large_project(self):
        """Test detection of multiple violation types in a larger project."""
        files = {
            # Valid files
            "src/app/dashboard/page.tsx": """
import { Layout } from '~/app/shared/components/Layout';
export default function Dashboard() { return <Layout>Dashboard</Layout>; }
            """.strip(),

            # Subsystem boundary violation
            "src/app/admin/page.tsx": """
import { UserProfile } from '../../user/components/Profile';  // VIOLATION
export default function Admin() { return <UserProfile />; }
            """.strip(),

            # Domain boundary violation
            "src/lib/domains/auth/services.ts": """
import { getMapData } from '../mapping/internal-service';  // VIOLATION
export function authWithMap() { return getMapData(); }
            """.strip(),

            # Import pattern violation
            "src/components/Header.tsx": """
import { utils } from '../lib/utils';  // VIOLATION: should use ~/
export function Header() { return <div>{utils.format()}</div>; }
            """.strip(),

            # Rule of 6 violation
            "src/utils/helpers.ts": f"""
export function func1() {{}}
export function func2() {{}}
export function func3() {{}}
export function func4() {{}}
export function func5() {{}}
export function func6() {{}}
export function func7() {{}}  // VIOLATION: 7th function
            """.strip(),

            # Supporting files
            "src/app/shared/components/Layout.tsx": "export function Layout({ children }: any) { return <div>{children}</div>; }",
            "src/app/user/components/Profile.tsx": "export function UserProfile() { return <div>Profile</div>; }",
            "src/lib/domains/mapping/internal-service.ts": "export function getMapData() { return {}; }",
            "src/lib/utils.ts": "export const utils = { format: () => 'formatted' };"
        }

        with create_test_project(files) as project_path:
            results = run_checker('architecture', project_path / 'src')

            # Should find multiple types of violations
            error_types = {error.error_type for error in results.errors}

            expected_types = {
                ErrorType.SUBSYSTEM_BOUNDARY,
                ErrorType.DOMAIN_BOUNDARY,
                ErrorType.IMPORT_PATTERN,
                ErrorType.COMPLEXITY
            }

            found_types = expected_types & error_types
            assert len(found_types) >= 2, f"Should find multiple violation types, found: {error_types}"

    def test_performance_on_large_codebase(self):
        """Test architecture checker performance on a large codebase."""
        # Generate a large project structure
        files = {}

        # Create many subsystems
        for subsystem in ['admin', 'user', 'dashboard', 'reports', 'settings']:
            for i in range(10):  # 10 files per subsystem
                files[f"src/app/{subsystem}/components/Component{i}.tsx"] = f"""
import {{ utils }} from '~/lib/shared/utils';
export function Component{i}() {{ return <div>{{utils.format()}}</div>; }}
                """.strip()

        # Create domain files
        for domain in ['auth', 'mapping', 'analytics', 'notifications']:
            for i in range(5):  # 5 files per domain
                files[f"src/lib/domains/{domain}/services/service{i}.ts"] = f"""
export function service{i}Function() {{ return 'service{i}'; }}
                """.strip()

        # Add shared utilities
        files["src/lib/shared/utils.ts"] = "export const utils = { format: () => 'formatted' };"

        with create_test_project(files) as project_path:
            try:
                results = run_checker('architecture', project_path / 'src')

                # Should complete without timeout
                assert isinstance(results.errors, list)
                assert isinstance(results.warnings, list)

            except Exception as e:
                pytest.fail(f"Architecture checker failed on large codebase: {e}")