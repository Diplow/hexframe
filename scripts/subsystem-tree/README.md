# Subsystem Tree

Dumps the full subsystem hierarchy as an ASCII tree or JSON. Subsystems are directories containing a `dependencies.json` file.

## Usage

```bash
pnpm subsystem-tree                          # ASCII tree (default)
pnpm subsystem-tree -- --format json         # JSON output
pnpm subsystem-tree -- src/app/map           # Subtree only
pnpm subsystem-tree -- --format json src/lib # Combined
```

## ASCII Output

```
src/ [80 subsystems, 45123 LoC]
├── app/ [app, 42 subsystems, 28456 LoC]
│   ├── auth/ [page, 312 LoC]
│   └── map/ [page, 37 subsystems, 25234 LoC]
├── lib/ [router, 24 subsystems, 12345 LoC]
│   └── domains/ [router, 22 subsystems, 11234 LoC]
└── server/ [router, 6 subsystems, 4322 LoC]

80 subsystems | 45123 total LoC | max depth 6
```

Per node: `name/ [type, N subsystems, M LoC]` — fields omitted when empty.

## JSON Output

Nested tree structure with metadata:

```json
{
  "generated_at": "2026-01-27T12:00:00+00:00",
  "total_subsystems": 80,
  "total_lines": 45123,
  "max_depth": 6,
  "tree": {
    "path": "src",
    "name": "src",
    "type": null,
    "lines_of_code": 234,
    "has_readme": true,
    "has_index": true,
    "descendant_count": 79,
    "descendant_lines": 44889,
    "allowed_dependencies": [],
    "children": []
  }
}
```

## How It Works

- Discovers subsystems by globbing for `dependencies.json` files (excluding `node_modules`)
- Counts TypeScript lines (`.ts`, `.tsx`) per subsystem, excluding test files
- Respects subsystem boundaries: subdirectories with their own `dependencies.json` are counted separately
- Auto-detects `domain` type for direct children of `src/lib/domains/` when no explicit type is set
