import { cn } from '~/lib/utils';

export const themeToggleSizes = {
  sm: { container: 'h-10 w-10', icon: 'h-5 w-5' },
  md: { container: 'h-10 w-10', icon: 'h-5 w-5' },
  lg: { container: 'h-10 w-10', icon: 'h-5 w-5' }
} as const;

export function getIconClasses(isDark: boolean, variant: 'sun' | 'moon') {
  if (variant === 'sun') {
    return cn(
      'transition-all duration-200 relative z-10',
      isDark ? 'text-secondary dark:text-secondary' : 'text-secondary drop-shadow-[0_0_8px_rgba(251,191,36,1)]',
      isDark && 'dark:group-hover:text-secondary dark:group-hover:drop-shadow-[0_0_8px_rgba(251,191,36,1)]',
      isDark && 'dark:group-focus-visible:text-secondary dark:group-focus-visible:drop-shadow-[0_0_8px_rgba(251,191,36,1)]'
    );
  }
  
  return cn(
    'transition-all duration-200 relative z-10',
    !isDark ? 'text-primary' : 'text-primary drop-shadow-[0_0_8px_rgba(139,92,246,1)]',
    !isDark && 'group-hover:text-primary group-hover:drop-shadow-[0_0_8px_rgba(139,92,246,1)]',
    !isDark && 'group-focus-visible:text-primary group-focus-visible:drop-shadow-[0_0_8px_rgba(139,92,246,1)]'
  );
}

export function getPillClasses(isDark: boolean, isDragging: boolean) {
  return cn(
    'absolute top-0 rounded-3xl h-full',
    'w-[calc(50%+2.5rem)]',
    'shadow-sm pointer-events-auto',
    isDragging ? 'cursor-grabbing' : 'cursor-grab',
    'border border-[color:var(--stroke-color-950)]',
    !isDragging && 'transition-all duration-200 ease-out',
    isDragging && 'shadow-lg scale-105'
  );
}

export function getPillStyles(isDark: boolean) {
  return {
    backgroundColor: isDark ? 'rgba(71, 85, 105, 0.7)' : 'rgba(203, 213, 225, 0.7)', // slate-600/70 : slate-300/70
    width: 'calc(50% + 2.5rem)' // Force width inline since Tailwind class isn't working
  };
}