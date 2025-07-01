# Design System Color Validation

This document explains the color validation system that enforces the use of semantic colors from our design system instead of direct Tailwind color classes.

## Overview

The validation system consists of three components:

1. **ESLint Rule** (`eslint-rules/no-direct-colors.js`) - Warns during development
2. **Tailwind Plugin** (`config/tailwind-plugin-validate-colors.js`) - Validates during build
3. **Validation Script** (`scripts/validate-colors.js`) - Can be run manually or in CI

## Allowed Color Classes

### Semantic Colors

Instead of using direct colors like `text-violet-600`, use semantic equivalents:

- **Primary**: `text-primary`, `bg-primary`, `border-primary`, `ring-primary`
  - Variants: `primary-light`, `primary-dark`
  - Opacity: `bg-primary/10`, `bg-primary/20`, etc.

- **Secondary**: `text-secondary`, `bg-secondary`, etc.
  - Maps to amber colors (warning/attention)

- **Success**: `text-success`, `bg-success`, etc.
  - Maps to green colors

- **Link**: `text-link`, `bg-link`, etc.
  - Maps to cyan colors (navigation)

- **Destructive**: `text-destructive`, `bg-destructive`, etc.
  - Maps to rose colors (danger/delete)

- **Neutral**: `text-neutral-50` through `text-neutral-950`
  - Maps to slate colors

### Spatial Colors

For hexagonal positioning:

- `text-nw`, `bg-nw` (Northwest - Amber)
- `text-ne`, `bg-ne` (Northeast - Green)
- `text-e`, `bg-e` (East - Cyan)
- `text-se`, `bg-se` (Southeast - Indigo)
- `text-sw`, `bg-sw` (Southwest - Purple)
- `text-w`, `bg-w` (West - Rose)

Each spatial color also has `-light` and `-dark` variants.

### Depth Variants

For tile depth visualization:

- Center: `fill-center-depth-0` through `fill-center-depth-8`
- Spatial: `fill-nw-depth-1` through `fill-nw-depth-8` (and similar for other positions)

### UI Colors

Standard interface colors:

- `text-background`, `bg-background`
- `text-foreground`, `bg-foreground`
- `text-card`, `bg-card`, `text-card-foreground`
- `text-popover`, `bg-popover`, `text-popover-foreground`
- `text-muted`, `bg-muted`, `text-muted-foreground`
- `text-accent`, `bg-accent`, `text-accent-foreground`
- `border-input`
- `ring-offset-background`

### Chart Colors

For data visualization:

- `text-chart-1` through `text-chart-5`
- `bg-chart-1` through `bg-chart-5`
- `fill-chart-1` through `fill-chart-5`

### Special Cases

These are always allowed:

- `text-transparent`, `bg-transparent`
- `text-current`, `bg-current`, `border-current`
- `text-inherit`, `bg-inherit`, `border-inherit`
- `text-white`, `bg-white`
- `text-black`, `bg-black`
- Opacity variants: `bg-black/20`, `bg-white/50`, etc.

## Color Mappings

Direct colors map to semantic colors as follows:

| Direct Color | Semantic Color |
|-------------|----------------|
| violet-* | primary |
| amber-* | secondary |
| green-* | success |
| cyan-* | link |
| rose-* | destructive |
| slate-*, gray-*, zinc-* | neutral-* |

## Running Validation

### During Development

The ESLint rule will automatically warn you about direct color usage:

```bash
pnpm lint
```

To temporarily disable validation:

```bash
SKIP_COLOR_VALIDATION=true pnpm lint
```

### Manual Validation

Run the validation script:

```bash
node scripts/validate-colors.js
```

### In CI/CD

Add to your CI pipeline:

```yaml
- name: Validate Design System Colors
  run: node scripts/validate-colors.js
```

## Fixing Violations

When you see a violation like:

```
❌ text-amber-600
  → Suggestion: text-secondary
```

Simply replace the direct color with the suggested semantic color.

## Adding New Colors

If you need to add a new color to the design system:

1. Add the CSS variable to `src/styles/globals.css`
2. Update the Tailwind config in `config/tailwind.config.ts`
3. Add the pattern to `ALLOWED_COLOR_PATTERNS` in the ESLint rule
4. Update `config/design-system-colors.json`

## Exceptions

Some legacy code uses direct colors that are temporarily allowed. These are listed in:

- The `safelist` in `config/tailwind.config.ts`
- The `EXCEPTIONS` array in the ESLint rule

These should be migrated to semantic colors over time.

## Benefits

1. **Consistency**: All colors follow the design system
2. **Maintainability**: Easy to update colors globally
3. **Dark Mode**: Semantic colors automatically adapt
4. **Accessibility**: Ensures proper color contrast
5. **Theming**: Makes it easy to create custom themes