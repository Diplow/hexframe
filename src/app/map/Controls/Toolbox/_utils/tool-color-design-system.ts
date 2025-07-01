/**
 * Tool color mapping using our design system CSS variables
 */

export const TOOL_COLOR_DESIGN_SYSTEM = {
  // Navigate (cyan) -> East (exploration) -> Link color
  'cyan': {
    bg: 'bg-cyan-100 dark:bg-cyan-900/20',
    hoverBg: 'hover:bg-cyan-100 dark:hover:bg-cyan-900/20',
    ring: 'ring-cyan-500',
    text: 'text-cyan-700 dark:text-cyan-400',
    hoverText: 'hover:text-cyan-700 dark:hover:text-cyan-400',
    icon: 'text-cyan-700 dark:text-cyan-400',
    focus: 'focus-visible:ring-cyan-500'
  },
  // Select/Expand (indigo) -> Primary actions
  'indigo': {
    bg: 'bg-indigo-100 dark:bg-indigo-900/20',
    hoverBg: 'hover:bg-indigo-100 dark:hover:bg-indigo-900/20',
    ring: 'ring-indigo-500',
    text: 'text-indigo-700 dark:text-indigo-300',
    hoverText: 'hover:text-indigo-700 dark:hover:text-indigo-300',
    icon: 'text-indigo-700 dark:text-indigo-300',
    focus: 'focus-visible:ring-indigo-500'
  },
  // Drag (purple) -> Primary variant
  'purple': {
    bg: 'bg-purple-100 dark:bg-purple-900/20',
    hoverBg: 'hover:bg-purple-100 dark:hover:bg-purple-900/20',
    ring: 'ring-purple-500',
    text: 'text-purple-700 dark:text-purple-400',
    hoverText: 'hover:text-purple-700 dark:hover:text-purple-400',
    icon: 'text-purple-700 dark:text-purple-400',
    focus: 'focus-visible:ring-purple-500'
  },
  // Create (green) -> Success
  'green': {
    bg: 'bg-green-100 dark:bg-green-900/20',
    hoverBg: 'hover:bg-green-100 dark:hover:bg-green-900/20',
    ring: 'ring-green-500',
    text: 'text-green-700 dark:text-green-400',
    hoverText: 'hover:text-green-700 dark:hover:text-green-400',
    icon: 'text-green-700 dark:text-green-400',
    focus: 'focus-visible:ring-green-500'
  },
  // Edit (amber) -> Secondary/Warning
  'amber': {
    bg: 'bg-amber-100 dark:bg-amber-900/20',
    hoverBg: 'hover:bg-amber-100 dark:hover:bg-amber-900/20',
    ring: 'ring-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
    hoverText: 'hover:text-amber-700 dark:hover:text-amber-400',
    icon: 'text-amber-700 dark:text-amber-400',
    focus: 'focus-visible:ring-amber-500'
  },
  // Delete (rose) -> Destructive
  'rose': {
    bg: 'bg-rose-100 dark:bg-rose-900/20',
    hoverBg: 'hover:bg-rose-100 dark:hover:bg-rose-900/20',
    ring: 'ring-rose-500',
    text: 'text-rose-700 dark:text-rose-400',
    hoverText: 'hover:text-rose-700 dark:hover:text-rose-400',
    icon: 'text-rose-700 dark:text-rose-400',
    focus: 'focus-visible:ring-rose-500'
  }
} as const;