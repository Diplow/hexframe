'use client';

import { cn } from '~/lib/utils';
import { HeaderIcon } from '~/app/map/Chat/Timeline/Widgets/_shared/_components/HeaderIcon';
import { HeaderContent } from '~/app/map/Chat/Timeline/Widgets/_shared/_components/HeaderContent';
import { CloseButton } from '~/app/map/Chat/Timeline/Widgets/_shared/_components/CloseButton';

interface WidgetHeaderProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose?: () => void;
  actions?: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function WidgetHeader({
  icon,
  title,
  subtitle,
  onClose,
  actions,
  className,
  collapsible = false,
  isCollapsed = false,
  onToggleCollapse,
}: WidgetHeaderProps) {
  // Only show border-b when content is expanded or when not collapsible
  const borderClass = (!collapsible || !isCollapsed) ? 'border-b border-neutral-200 dark:border-neutral-800' : '';

  if (collapsible && onToggleCollapse) {
    return (
      <div className={cn('flex items-center gap-3 p-3 w-full', borderClass, className)}>
        <div
          onClick={onToggleCollapse}
          className={cn(
            'flex items-center gap-3 flex-1 cursor-pointer',
            'hover:bg-muted/50 active:bg-muted/70 transition-colors rounded-md p-1 -m-1',
            'focus:outline-none focus:bg-muted/50'
          )}
          title={isCollapsed ? 'Expand widget' : 'Collapse widget'}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onToggleCollapse();
            }
          }}
        >
          <HeaderIcon icon={icon} />
          <HeaderContent title={title} subtitle={subtitle} />
        </div>

        {actions && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {actions}
          </div>
        )}

        <CloseButton onClose={onClose} />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3 p-3', borderClass, className)}>
      <HeaderIcon icon={icon} />
      <HeaderContent title={title} subtitle={subtitle} />

      {actions && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {actions}
        </div>
      )}

      <CloseButton onClose={onClose} />
    </div>
  );
}
