# 🎨 Hexframe Color Quick Reference

## Semantic Colors (Use These!)

| Purpose | Class Prefix | Example | Replaces |
|---------|-------------|---------|----------|
| **Primary** | `primary` | `bg-primary`, `text-primary` | violet colors |
| **Secondary** | `secondary` | `bg-secondary`, `text-secondary` | amber colors |
| **Success** | `success` | `bg-success`, `text-success` | green colors |
| **Links** | `link` | `text-link`, `bg-link` | blue/cyan colors |
| **Destructive** | `destructive` | `bg-destructive`, `text-destructive` | red/rose colors |
| **Neutral** | `neutral` | `bg-neutral-100`, `text-neutral-600` | gray/slate/zinc colors |

## Common Patterns

### Buttons
```jsx
// Primary action
<button className="bg-primary hover:bg-primary-dark text-white">

// Secondary action  
<button className="bg-secondary hover:bg-secondary-dark text-white">

// Destructive action
<button className="bg-destructive hover:bg-destructive-dark text-white">

// Neutral/Cancel
<button className="bg-neutral-200 hover:bg-neutral-300 text-neutral-800">
```

### Text & Backgrounds
```jsx
// Headings
<h1 className="text-neutral-900 dark:text-neutral-100">

// Body text
<p className="text-neutral-600 dark:text-neutral-400">

// Muted text
<span className="text-neutral-500 dark:text-neutral-500">

// Backgrounds
<div className="bg-neutral-50 dark:bg-neutral-900">
```

### States & Feedback
```jsx
// Success message
<div className="bg-success/10 text-success border-success/20">

// Error message
<div className="bg-destructive/10 text-destructive border-destructive/20">

// Warning/Info
<div className="bg-secondary/10 text-secondary border-secondary/20">

// Links
<a className="text-link hover:text-link-dark">
```

## Opacity Modifiers

Add opacity with `/` syntax:
- `bg-primary/10` → 10% opacity
- `text-destructive/50` → 50% opacity
- `border-success/20` → 20% opacity

## Dark Mode

All semantic colors automatically adapt. Just use:
- `dark:` prefix when needed for overrides
- Most colors work in both modes without changes

## ❌ Don't Use These

- `bg-slate-*`, `text-gray-*`, `border-zinc-*` → Use `neutral-*`
- `bg-amber-*` → Use `secondary`
- `bg-green-*` → Use `success`
- `bg-blue-*`, `bg-cyan-*` → Use `link`
- `bg-red-*`, `bg-rose-*` → Use `destructive`
- `bg-violet-*`, `bg-purple-*` → Use `primary`

## Validation

```bash
# Check your code
pnpm lint:colors

# ESLint will warn in your editor
# Look for yellow squiggly lines
```

## Need Help?

1. Check `src/styles/globals.css` for all available colors
2. Run `pnpm lint:colors` to see suggestions
3. Ask the team if you need a new semantic color