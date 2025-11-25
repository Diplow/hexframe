import { cn } from '~/lib/utils';

interface InfoBannerProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * InfoBanner - A reusable component for displaying informative content with a subtle background
 * Use this for notices, hints, or secondary actions that need visual distinction
 */
export function InfoBanner({ children, className }: InfoBannerProps) {
  return (
    <div
      className={cn(
        'px-3 py-2 rounded-md bg-neutral-200 dark:bg-neutral-900',
        className
      )}
    >
      {children}
    </div>
  );
}
