/**
 * Tool color mapping using our design system CSS variables
 */

export const TOOL_COLOR_DESIGN_SYSTEM = {
  // Navigate (cyan) -> East (exploration) -> Link color
  'cyan': {
    bg: 'bg-link/10 dark:bg-link/20',
    ring: 'ring-link',
    text: 'text-link',
    icon: 'text-link',
    focus: 'focus-visible:ring-link'
  },
  // Select/Expand (indigo) -> Primary actions
  'indigo': {
    bg: 'bg-primary/10 dark:bg-primary/20',
    ring: 'ring-primary',
    text: 'text-primary',
    icon: 'text-primary',
    focus: 'focus-visible:ring-primary'
  },
  // Drag (purple) -> Primary variant
  'purple': {
    bg: 'bg-primary/10 dark:bg-primary/20',
    ring: 'ring-primary',
    text: 'text-primary',
    icon: 'text-primary',
    focus: 'focus-visible:ring-primary'
  },
  // Create (green) -> Success
  'green': {
    bg: 'bg-success/10 dark:bg-success/20',
    ring: 'ring-success',
    text: 'text-success',
    icon: 'text-success',
    focus: 'focus-visible:ring-success'
  },
  // Edit (amber) -> Secondary/Warning
  'amber': {
    bg: 'bg-secondary/10 dark:bg-secondary/20',
    ring: 'ring-secondary',
    text: 'text-secondary',
    icon: 'text-secondary',
    focus: 'focus-visible:ring-secondary'
  },
  // Delete (rose) -> Destructive
  'rose': {
    bg: 'bg-destructive/10 dark:bg-destructive/20',
    ring: 'ring-destructive',
    text: 'text-destructive',
    icon: 'text-destructive',
    focus: 'focus-visible:ring-destructive'
  }
} as const;