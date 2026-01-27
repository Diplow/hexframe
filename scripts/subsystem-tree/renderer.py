"""ASCII tree and JSON rendering for subsystem trees."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from discovery import SubsystemNode


def render_ascii(root: SubsystemNode) -> str:
    """Render the full subsystem tree as an ASCII string."""
    lines = [_format_label(root)]
    for i, child in enumerate(root.children):
        lines.extend(_render_subtree(child, "", i == len(root.children) - 1))

    total_subsystems = 1 + root.descendant_count
    total_lines = root.lines_of_code + root.descendant_lines
    lines.append("")
    lines.append(
        f"{total_subsystems} subsystems | {total_lines} total LoC | max depth {root.max_depth}"
    )
    return "\n".join(lines)


def _format_label(node: SubsystemNode) -> str:
    """Format the bracket label for a tree node."""
    bracket_parts: list[str] = []
    if node.subsystem_type:
        bracket_parts.append(node.subsystem_type)
    if node.descendant_count > 0:
        bracket_parts.append(f"{node.descendant_count} subsystems")
    total_loc = node.lines_of_code + node.descendant_lines
    bracket_parts.append(f"{total_loc} LoC")
    return f"{node.name}/ [{', '.join(bracket_parts)}]"


def _render_subtree(
    node: SubsystemNode, prefix: str, is_last: bool
) -> list[str]:
    """Recursively render a subtree as ASCII lines."""
    connector = "\u2514\u2500\u2500 " if is_last else "\u251c\u2500\u2500 "
    lines = [prefix + connector + _format_label(node)]
    extension = "    " if is_last else "\u2502   "
    child_prefix = prefix + extension
    for i, child in enumerate(node.children):
        lines.extend(
            _render_subtree(child, child_prefix, i == len(node.children) - 1)
        )
    return lines


def render_json(root: SubsystemNode) -> str:
    """Render the subsystem tree as a JSON string."""
    total_subsystems = 1 + root.descendant_count
    total_lines = root.lines_of_code + root.descendant_lines
    output = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "total_subsystems": total_subsystems,
        "total_lines": total_lines,
        "max_depth": root.max_depth,
        "tree": _node_to_dict(root),
    }
    return json.dumps(output, indent=2)


def _node_to_dict(node: SubsystemNode) -> dict:
    """Convert a SubsystemNode to a JSON-serializable dictionary."""
    return {
        "path": str(node.path),
        "name": node.name,
        "type": node.subsystem_type,
        "lines_of_code": node.lines_of_code,
        "has_readme": node.has_readme,
        "has_index": node.has_index,
        "descendant_count": node.descendant_count,
        "descendant_lines": node.descendant_lines,
        "allowed_dependencies": node.allowed_dependencies,
        "children": [_node_to_dict(child) for child in node.children],
    }
