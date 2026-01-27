"""Subsystem discovery and tree building."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class SubsystemNode:
    """A node in the subsystem hierarchy."""

    path: Path
    name: str
    subsystem_type: str | None = None
    lines_of_code: int = 0
    has_readme: bool = False
    has_index: bool = False
    allowed_dependencies: list[str] = field(default_factory=list)
    children: list[SubsystemNode] = field(default_factory=list)
    descendant_count: int = 0
    descendant_lines: int = 0
    max_depth: int = 0


def find_dependencies_files(target_path: Path) -> list[Path]:
    """Find all dependencies.json files under target path, excluding node_modules."""
    return sorted(
        deps_file
        for deps_file in target_path.rglob("dependencies.json")
        if "node_modules" not in str(deps_file)
    )


def build_tree(target_path: Path) -> SubsystemNode | None:
    """Discover subsystems and build the complete tree hierarchy."""
    deps_files = find_dependencies_files(target_path)
    if not deps_files:
        return None

    nodes: dict[Path, SubsystemNode] = {}
    for deps_file in deps_files:
        node = _create_node(deps_file)
        nodes[node.path] = node

    sorted_paths = sorted(nodes.keys(), key=lambda p: len(p.parts))
    for node_path in sorted_paths:
        parent = node_path.parent
        while parent != parent.parent:
            if parent in nodes:
                nodes[parent].children.append(nodes[node_path])
                break
            parent = parent.parent

    for node in nodes.values():
        node.children.sort(key=lambda n: n.name)

    root = nodes[sorted_paths[0]]
    _compute_descendants(root)
    return root


def _create_node(deps_file: Path) -> SubsystemNode:
    """Create a SubsystemNode from a dependencies.json file."""
    subsystem_dir = deps_file.parent
    try:
        with open(deps_file) as f:
            deps_data = json.load(f)
    except (json.JSONDecodeError, OSError):
        deps_data = {}

    subsystem_type = deps_data.get("type")
    if not subsystem_type:
        parts = subsystem_dir.parts
        if "domains" in parts:
            domains_idx = parts.index("domains")
            if len(parts) == domains_idx + 2:
                subsystem_type = "domain"

    return SubsystemNode(
        path=subsystem_dir,
        name=subsystem_dir.name,
        subsystem_type=subsystem_type,
        lines_of_code=_count_typescript_lines(subsystem_dir),
        has_readme=(subsystem_dir / "README.md").exists(),
        has_index=any(
            (subsystem_dir / f"index.{ext}").exists() for ext in ("ts", "tsx")
        ),
        allowed_dependencies=deps_data.get("allowed", []),
    )


def _count_typescript_lines(directory: Path) -> int:
    """Count TypeScript LoC, recursing into non-subsystem subdirectories."""
    if not directory.exists():
        return 0
    total = 0
    for pattern in ("*.ts", "*.tsx"):
        for file_path in directory.glob(pattern):
            name = file_path.name
            if ".test." in name or ".spec." in name:
                continue
            if "/__tests__/" in str(file_path):
                continue
            try:
                with open(file_path, "rb") as f:
                    total += sum(1 for _ in f)
            except OSError:
                pass
    for subdir in directory.iterdir():
        if subdir.is_dir() and not (subdir / "dependencies.json").exists():
            total += _count_typescript_lines(subdir)
    return total


def _compute_descendants(node: SubsystemNode) -> None:
    """Compute descendant_count, descendant_lines, and max_depth bottom-up."""
    for child in node.children:
        _compute_descendants(child)
    node.descendant_count = sum(1 + c.descendant_count for c in node.children)
    node.descendant_lines = sum(
        c.lines_of_code + c.descendant_lines for c in node.children
    )
    node.max_depth = max((1 + c.max_depth for c in node.children), default=0)
