import React from 'react';
import { X } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import type { WidgetContainerProps } from './widget.types';

/**
 * WidgetContainer - Base container for all chat widgets
 * Provides common functionality like close button, loading/error states,
 * and visual indicators for canvas operations
 */
export function WidgetContainer({
  id: _id,
  children,
  onClose,
  isExpanded = false,
  isLoading = false,
  error,
  timestamp,
  priority = 'info',
  className = '',
  isCanvasOperation = false,
}: WidgetContainerProps) {
  const ariaLive = priority === 'critical' ? 'assertive' : 'polite';
  const ariaLabel = `${priority === 'critical' ? 'Critical ' : ''}${isCanvasOperation ? 'Map operation ' : ''}widget`;

  return (
    <article
      className={cn(
        'widget-container relative rounded-lg border bg-white p-4 shadow-sm',
        `widget--${priority}`,
        isExpanded && 'widget--expanded',
        isCanvasOperation && 'widget--canvas-operation',
        {
          'border-info bg-info/10': priority === 'info',
          'border-warning bg-warning/10': priority === 'action',
          'border-destructive bg-destructive/10': priority === 'critical',
          'min-h-[200px]': isExpanded,
          'border-primary': isCanvasOperation,
        },
        className
      )}
      aria-label={ariaLabel}
      aria-live={ariaLive}
    >
      {/* Close button */}
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute right-2 top-2 h-6 w-6 p-0"
          aria-label="Close widget"
        >
          <X className="h-4 w-4" />
        </Button>
      )}

      {/* Canvas operation indicator */}
      {isCanvasOperation && (
        <div 
          className="mb-2 flex items-center gap-2 text-xs text-primary"
          role="status"
          aria-live="polite"
        >
          <div 
            className="h-3 w-3 rounded-full bg-primary"
            role="img"
            aria-label="Map operation indicator"
          />
          <span>Modifies map</span>
        </div>
      )}

      {/* Timestamp */}
      {timestamp && (
        <div className="mb-2 text-xs text-muted-foreground">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div 
          role="alert" 
          className="mb-3 rounded border border-destructive bg-destructive/10 p-2 text-sm text-destructive-foreground"
        >
          {error.message}
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/80"
          role="status"
          aria-label="Loading"
        >
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        </div>
      )}

      {/* Widget content */}
      <div className={cn(isExpanded && 'expanded-content')} data-testid={isExpanded ? 'expanded-content' : undefined}>
        {children}
      </div>
    </article>
  );
}