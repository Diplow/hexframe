# Design System Color Validation

This document explains how Hexframe enforces its design system colors to maintain consistency across the codebase.

## Overview

Hexframe uses a semantic color system where colors have meaning and purpose. Instead of using direct Tailwind color classes like `bg-slate-500` or `text-amber-600`, we use semantic names that:

1. **Adapt to themes**: Colors automatically adjust for light/dark mode
2. **Maintain consistency**: Changes to the color palette happen in one place
3. **Convey meaning**: Color names describe their purpose, not just their appearance

## Validation Tools

### 1. ESLint Integration (Real-time in IDE)

The `.eslintrc.cjs` file includes a rule that warns when direct colors are used:

```javascript
"no-restricted-syntax": [
  "warn",
  {
    selector: "Literal[value=/\\b(text|bg|border|ring|fill)-(slate|gray|zinc|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}\\b/]",
    message: "Use semantic colors from the design system..."
  }
]
```

This provides immediate feedback in your IDE as you code.

### 2. Color Validation Script

Run the validation script to check the entire codebase:

```bash
pnpm lint:colors
```

This script:
- Scans all TypeScript/JavaScript files
- Reports violations with line numbers
- Suggests semantic alternatives
- Can be integrated into CI/CD pipelines

### 3. PostCSS Plugin (Build-time warnings)

The PostCSS plugin warns during build when direct colors are used in CSS files.

## Allowed Colors

### Semantic Colors (Dual-purpose)
These colors serve both spatial and functional roles:

- `primary` → Violet (main brand color)
- `secondary` → Amber (Northwest position)
- `success` → Green (Northeast position)
- `link` → Cyan (East position)
- `destructive` → Rose (West position)
- `neutral` → Slate (grays)

### Spatial Colors
For tile positioning only:

- `nw`, `ne`, `e`, `se`, `sw`, `w`
- With variants: `-light`, `-dark`

### Depth Variants
For tile hierarchy:

- `fill-center-depth-0` through `fill-center-depth-8`
- `fill-{position}-depth-1` through `fill-{position}-depth-8`

### UI Colors
Standard interface colors:

- `background`, `foreground`
- `card`, `popover`, `muted`, `accent`, `input`
- `border`, `ring`

### Special Cases
- `transparent`, `current`, `inherit`
- `white`, `black` (with opacity like `/50`)

## Common Violations and Fixes

### Direct Color → Semantic Color

❌ **Wrong:**
```jsx
<button className="bg-amber-600 hover:bg-amber-700">
```

✅ **Right:**
```jsx
<button className="bg-secondary hover:bg-secondary-dark">
```

### Gray Colors → Neutral

❌ **Wrong:**
```jsx
<div className="text-slate-600 bg-gray-100">
```

✅ **Right:**
```jsx
<div className="text-neutral-600 bg-neutral-100">
```

### Functional Colors

❌ **Wrong:**
```jsx
<span className="text-rose-500">Error message</span>
<a className="text-blue-600">Link</a>
```

✅ **Right:**
```jsx
<span className="text-destructive">Error message</span>
<a className="text-link">Link</a>
```

## Exceptions

Some components have special exceptions for maintaining visual consistency:

1. **Toolbox**: Uses specific color shades for tool states
2. **Theme Toggle**: Uses violet-500 for branding
3. **Canvas**: Uses specific opacity values for depth

These exceptions are documented in the validation rules.

## Adding New Colors

If you need a color that doesn't exist:

1. **First check**: Can you use an existing semantic color?
2. **If not**: Discuss with the team whether to:
   - Add a new semantic color to the system
   - Use an existing color differently
   - Grant an exception for a specific use case

## Disabling Validation

For migration or special cases:

```bash
# Disable for a single run
SKIP_COLOR_VALIDATION=true pnpm lint:colors

# Disable ESLint rule for a line
// eslint-disable-next-line no-restricted-syntax
className="bg-blue-500" // Special exception documented here
```

## Benefits

1. **Consistency**: All blues are "link" colors, all reds are "destructive"
2. **Maintainability**: Change colors globally by updating CSS variables
3. **Accessibility**: Semantic colors ensure proper contrast ratios
4. **Developer Experience**: Clear warnings and helpful suggestions

## Visual Feedback

When violations occur:

- **IDE**: Yellow squiggly lines with hover messages
- **Terminal**: Detailed report with line numbers and suggestions
- **Build**: Console warnings during development

This multi-layered approach ensures colors stay within the design system while providing helpful guidance rather than blocking development.