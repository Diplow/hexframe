"""
Pytest configuration and shared fixtures for TypeScript checker tests.

This file provides common test fixtures and configuration
that can be used across all test modules.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from typing import Dict

from .utils.test_helpers import create_test_project, create_fixture_project


@pytest.fixture
def temp_project():
    """
    Fixture that provides a temporary directory for test projects.
    Automatically cleaned up after test completion.
    """
    temp_dir = tempfile.mkdtemp(prefix="test_project_")
    project_path = Path(temp_dir)

    yield project_path

    # Cleanup
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture
def simple_ts_project(temp_project):
    """
    Fixture that creates a simple TypeScript project for testing.
    """
    files = create_fixture_project("simple_project")

    for file_path, content in files.items():
        full_path = temp_project / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding='utf-8')

    return temp_project


@pytest.fixture
def complex_imports_project(temp_project):
    """
    Fixture that creates a project with complex import patterns.
    """
    files = create_fixture_project("complex_imports")

    for file_path, content in files.items():
        full_path = temp_project / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content, encoding='utf-8')

    return temp_project


@pytest.fixture
def sample_typescript_content():
    """
    Fixture providing sample TypeScript content for parser testing.
    """
    return """
import React, { useState, useEffect } from 'react';
import type { User } from './types';
import * as utils from './utils';

export interface ComponentProps {
    title: string;
    onSubmit: (data: FormData) => void;
}

export const DEFAULT_CONFIG = {
    timeout: 5000,
    retries: 3
};

export function MyComponent({ title, onSubmit }: ComponentProps) {
    const [data, setData] = useState<User[]>([]);

    useEffect(() => {
        // Fetch data
    }, []);

    const handleSubmit = (formData: FormData) => {
        onSubmit(formData);
    };

    return <div>{title}</div>;
}

export default MyComponent;
    """.strip()


@pytest.fixture
def edge_case_typescript():
    """
    Fixture providing TypeScript with edge cases for parser testing.
    """
    return """
// Template literal with embedded expressions
const dynamicImport = \`import("./${moduleName}")\`;

// Generic function with constraints
export function process<T extends Record<string, any>>(
    items: T[],
    processor: (item: T) => boolean = defaultProcessor
): T[] {
    return items.filter(processor);
}

// Conditional exports based on environment
export const config = process.env.NODE_ENV === 'production'
    ? productionConfig
    : developmentConfig;

// Re-export with renaming
export {
    originalName as renamedExport,
    AnotherClass
} from './other-module';

// Decorator usage
@Component({
    selector: 'app-test'
})
export class TestComponent {
    @Input() value: string = '';

    @Output()
    changed = new EventEmitter<string>();
}

// Arrow function with complex generics
export const complexFunction = <
    T extends { id: string },
    K extends keyof T
>(
    items: T[],
    key: K
): T[K][] => items.map(item => item[key]);
    """.strip()