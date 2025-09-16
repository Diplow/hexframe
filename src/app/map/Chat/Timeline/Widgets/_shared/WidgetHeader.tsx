'use client';

import { X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { TilePreview } from '~/app/map/Chat/Timeline/Widgets/_shared/TilePreview';

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
  const headerContent = (
    <>
      {icon ? (
        <div className="flex-shrink-0">
          {icon}
        </div>
      ) : (
        <div className="flex-shrink-0">
          <TilePreview size={8} className="opacity-60" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground truncate">
            {subtitle}
          </div>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-1 flex-shrink-0">
          {actions}
        </div>
      )}

      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 flex-shrink-0"
          onClick={onClose}
          aria-label="Close widget"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </>
  );

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
          {icon ? (
            <div className="flex-shrink-0">
              {icon}
            </div>
          ) : (
            <div className="flex-shrink-0">
              <TilePreview size={8} className="opacity-60" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm truncate">
              {title}
            </div>
            {subtitle && (
              <div className="text-xs text-muted-foreground truncate">
                {subtitle}
              </div>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {actions}
          </div>
        )}

        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0"
            onClick={onClose}
            aria-label="Close widget"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3 p-3', borderClass, className)}>
      {headerContent}
    </div>
  );
}